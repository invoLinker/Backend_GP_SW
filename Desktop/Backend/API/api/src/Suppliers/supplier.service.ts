import { Injectable, NotFoundException, InternalServerErrorException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Supplier } from './supplier.model';
import { CreateSupplierDto } from './CreateSupplierDto';
import { UpdateSupplierDto } from './UpdateSupplierDto';
import { Op } from 'sequelize';
import { PurchaseOrder } from 'src/PO/po.model';

@Injectable()
export class SupplierService {
  constructor(@InjectModel(Supplier) private supplierModel: typeof Supplier,
    @InjectModel(PurchaseOrder)
        private poModel: typeof PurchaseOrder, // <-- هون عرفنا poModel
    ) {}

 async findAll(): Promise<Supplier[]> {
const supplier = await this.supplierModel.findAll();
    if (supplier.length === 0) {
      throw new NotFoundException('There are no permissions');
    }
    return supplier; 
 }

  async searchByName(name: string): Promise<Supplier[]> {
    try {
      const suppliers = await this.supplierModel.findAll({
        where: { supplier_name: { [Op.like]: `%${name}%` } },
      });
      if (suppliers.length === 0) {
        throw new NotFoundException(`No suppliers found with name: ${name}`);
      }
      return suppliers;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error while searching by name');
    }
  }

  async searchByEmail(email: string): Promise<Supplier[]> {
    try {
      const suppliers = await this.supplierModel.findAll({
        where: { contact_email: { [Op.like]: `%${email}%` } },
      });
      if (suppliers.length === 0) {
        throw new NotFoundException(`No suppliers found with email: ${email}`);
      }
      return suppliers;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Database error while searching by email');
    }
  }



  async create(dto: CreateSupplierDto): Promise<Supplier> {
    try {
      // تحقق من البريد الالكتروني
      const emailExists = await this.supplierModel.findOne({
        where: { contact_email: dto.contact_email },
      });
      if (emailExists) {
        throw new ConflictException(`Email ${dto.contact_email} already exists`);
      }

      // تحقق من رقم الهاتف
      const phoneExists = await this.supplierModel.findOne({
        where: { contact_phone: dto.contact_phone },
      });
      if (phoneExists) {
        throw new ConflictException(`Phone ${dto.contact_phone} already exists`);
      }

      const supplier = new Supplier();
      supplier.supplier_name = dto.supplier_name;
      supplier.contact_email = dto.contact_email;
      supplier.contact_phone = dto.contact_phone;
      supplier.contact_address = dto.contact_address;

      return await supplier.save();
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new InternalServerErrorException('Error creating supplier');
    }
  }


  async update(id: number, dto: UpdateSupplierDto): Promise<Supplier> {
  try {
    const supplier = await this.supplierModel.findByPk(id);
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${id} not found`);
    }

    // تحقق من البريد الالكتروني لو تم تغييره
    if (dto.contact_email && dto.contact_email !== supplier.contact_email) {
      const emailExists = await this.supplierModel.findOne({
        where: { contact_email: dto.contact_email },
      });
      if (emailExists) {
        throw new ConflictException(`Email ${dto.contact_email} already exists`);
      }
    }

    // تحقق من رقم الهاتف لو تم تغييره
    if (dto.contact_phone && dto.contact_phone !== supplier.contact_phone) {
      const phoneExists = await this.supplierModel.findOne({
        where: { contact_phone: dto.contact_phone },
      });
      if (phoneExists) {
        throw new ConflictException(`Phone ${dto.contact_phone} already exists`);
      }
    }

    // تحديث الحقول الموجودة فقط
    Object.assign(supplier, dto);

    return await supplier.save();
  } catch (error) {
    if (
      error instanceof NotFoundException ||
      error instanceof ConflictException
    )
      throw error;

    throw new InternalServerErrorException('Database error while updating supplier');
  }
}

  
// async deleteById(id: number): Promise<{ message: string }> {
//   const supplier = await this.supplierModel.findByPk(id);
//   if (!supplier) throw new NotFoundException(`Supplier with ID ${id} not found`);

//   await supplier.destroy();
//   return { message: `Supplier with ID ${id} deleted successfully` };
// }

// async deleteByName(name: string): Promise<{ message: string }> {
//   const deleted = await this.supplierModel.destroy({ where: { supplier_name: name } });
//   if (deleted === 0) throw new NotFoundException(`No supplier found with name ${name}`);
  
//   return { message: `Supplier(s) with name "${name}" deleted successfully` };
// }

// async deleteAll(): Promise<{ message: string }> {
//   await this.supplierModel.destroy({ where: {} });
//   return { message: 'All suppliers deleted successfully' };
// }

async deleteById(id: number): Promise<{ message: string }> {
  const supplier = await this.supplierModel.findByPk(id);
  if (!supplier) throw new NotFoundException(`Supplier with ID ${id} not found`);

  // التأكد من عدم وجود فواتير مرتبطة
  const relatedPOs = await this.poModel.count({ where: { supplier_id: id } });
  if (relatedPOs > 0) {
    throw new BadRequestException(`Cannot delete supplier. There are ${relatedPOs} purchase orders linked.`);
  }

  await supplier.destroy();
  return { message: `Supplier with ID ${id} deleted successfully` };
}


async deleteByName(name: string): Promise<{ message: string }> {
    const suppliers = await this.supplierModel.findAll({ where: { supplier_name: name } });
    if (suppliers.length === 0) throw new NotFoundException(`No supplier found with name "${name}"`);

    let deletedCount = 0;
    for (const supplier of suppliers) {
      const linkedOrders = await this.poModel.count({ where: { supplier_id: supplier.supplier_id } });
      if (linkedOrders === 0) {
        await supplier.destroy();
        deletedCount++;
      }
    }

    if (deletedCount === 0) {
      throw new BadRequestException('No suppliers could be deleted because they have linked Purchase Orders');
    }

    return { message: `Deleted ${deletedCount} supplier(s) with name "${name}" successfully` };
  }

async deleteAll(): Promise<{ message: string }> {
    const suppliers = await this.supplierModel.findAll();

    let deletedCount = 0;
    for (const supplier of suppliers) {
      const linkedOrders = await this.poModel.count({ where: { supplier_id: supplier.supplier_id } });
      if (linkedOrders === 0) {
        await supplier.destroy();
        deletedCount++;
      }
    }

    return { message: `Deleted ${deletedCount} supplier(s) successfully. Suppliers with linked Purchase Orders were skipped.` };
  }


}
