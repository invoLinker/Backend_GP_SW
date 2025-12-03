import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Supplier } from './supplier.model';
import { CreatSupplierDTO } from './CreatSupplierDTO';
import { User } from 'src/users/users.model';

@Injectable()
export class SupplierService {

  async updateBankInfo(id: number, dto: CreatSupplierDTO) {

    const supplierUser = await User.findByPk(id, {
      include: ['role'],
    });

    if (!supplierUser) {
      throw new NotFoundException(`Supplier not found`);
    }

    if (supplierUser.role?.role_name !== 'Supplier') {
      throw new BadRequestException('Not a supplier');
    }

    const supplier = await Supplier.findOne({
      where: { user_id: supplierUser.user_id },
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier profile not found`);
    }

    supplier.bank_name = dto.bank_name ?? supplier.bank_name;
    supplier.account_holder = dto.account_holder ?? supplier.account_holder;
    supplier.account_number = dto.account_number ?? supplier.account_number;
    supplier.iban = dto.iban ?? supplier.iban;
    supplier.swift = dto.swift ?? supplier.swift;

    await supplier.save();

    return { message: 'Bank details updated successfully', supplier };
  }


  async getBankInfo(id: number) {

    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      throw new NotFoundException(`Supplier profile not found`);
    }

    return {
        bank_name : supplier.bank_name,
        account_holder : supplier.account_holder ,
        account_number : supplier.account_number,
        iban : supplier.iban ,
        swift : supplier.swift,
  };
}
}

