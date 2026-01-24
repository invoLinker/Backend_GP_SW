import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Supplier } from './supplier.model';
import { CreatSupplierDTO } from './CreatSupplierDTO';
import { User } from 'src/users/users.model';
import { SupplierInvoice } from 'src/supplier-invoices/supplier-invoice.model';
import { Payment } from 'src/Payment/Payment.model';
import { Op } from 'sequelize';

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

    return { message: 'Bank details saved successfully', supplier };
  }


  async getBankInfo(id: number) {
    const supplierUser = await Supplier.findByPk(id, {
    });

    if (!supplierUser) {
      throw new NotFoundException(`Supplier not found`);
    }

    

    const supplier = await Supplier.findOne({
      where: { user_id: supplierUser.user_id },
    });

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


async supplierPaymentSummary(supplierId: number) {
   const user = await User.findByPk(supplierId);
    if(!user){ throw new NotFoundException('Supplier not found')};
      
    const supplier = await Supplier.findOne({where:{user_id: user.user_id}});
  
    if(!supplier){ throw new NotFoundException('Supplier not found')};

  const invoices = await SupplierInvoice.findAll({
    where: { supplier_id: supplier.supplier_id },
    attributes: ['invoice_id'],
  });

  if (!invoices.length) {
    throw new NotFoundException('This supplier has no invoices');
  }

  const invoiceIds = invoices.map(inv => inv.invoice_id);

  const supplierInvoicesCount = invoiceIds.length;

  const pendingPaymentsCount = await Payment.count({
    where: {
      invoice_id: {
        [Op.in]: invoiceIds,
      },
      status: 'Pending',
    },
  });

  const totalPaidAmount = await Payment.sum('amount_paid', {
    where: {
      invoice_id: {
        [Op.in]: invoiceIds,
      },
      status: 'Completed',
    },
  });

  return {
    supplierInvoicesCount,
    pendingPaymentsCount,
    totalPaidAmount: totalPaidAmount || 0,
  };
}

}

