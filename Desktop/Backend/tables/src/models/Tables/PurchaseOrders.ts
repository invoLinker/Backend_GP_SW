import {
  DataTypes,
  Model,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import { sequelize } from '../../db';
import { Supplier } from './Suppliers';
import { PurchaseOrderItem } from './PurchaseOrderItems';

export class PurchaseOrder extends Model<InferAttributes<PurchaseOrder>, InferCreationAttributes<PurchaseOrder>> {
  declare po_id: number;
  declare po_number: string;
  declare supplier_id: number;
  declare order_date: Date;
  declare subtotal: number;
  declare vat: number;
  declare total_amount: number;
  declare status: 'Pending'| 'Closed' | 'Rejected' | 'Draft' |'Approved'| 'Sent' |'Incident'| 'ReadyForPaid';
  declare pdfUrl: string | null;
  declare excelUrl: string | null;
  declare note: Text | null;
  declare is_verified: boolean;
  declare currency: 'USD'|'ILS'|'JOD';
  declare payment_method: 'Cash' | 'Bank Transfer' | 'Stripe' | 'Credit';
  declare company_name:string;
  declare company_email:string;
  declare company_phone:string;
  declare company_address:string;
  declare supplier_email:string;
  declare supplier_phone:string;
  declare supplier_address:string;
  declare installmentsData: JSON | null;
  declare created_by: number | null;
  declare text: string ;

}

PurchaseOrder.init(
  {
    po_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    po_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    order_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    subtotal: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    vat: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    total_amount: {
      type: DataTypes.DOUBLE,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Closed', 'Rejected', 'Draft', 'Approved', 'Sent', 'Incident', 'ReadyForPaid'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    pdfUrl: { type: DataTypes.TEXT, allowNull: true },
    excelUrl:{ type: DataTypes.TEXT, allowNull: true },
    note:{type:DataTypes.TEXT, allowNull:true},
    is_verified:{ type: DataTypes.BOOLEAN, defaultValue: false },
    currency:{type:DataTypes.ENUM( 'USD','ILS','JOD'), defaultValue:'ILS', allowNull:false},
    payment_method: { type: DataTypes.ENUM('Cash','Bank Transfer','Stripe','Credit'), allowNull: true, defaultValue:'Cash' },
    company_name:{type: DataTypes.STRING, allowNull: false},
    company_email:{type: DataTypes.STRING, allowNull: false},
    company_phone:{type: DataTypes.STRING, allowNull: false},
    company_address:{type: DataTypes.STRING, allowNull: false},
    supplier_email:{type: DataTypes.STRING, allowNull: false},
    supplier_phone:{type: DataTypes.STRING, allowNull: false},
    supplier_address:{type: DataTypes.STRING, allowNull: false},
    installmentsData:{type: DataTypes.JSON, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
    text:{type: DataTypes.STRING, allowNull:false}
  },
  {
    sequelize,
    tableName: 'PurchaseOrders',
    timestamps: true,
  }
);


Supplier.hasMany(PurchaseOrder, {foreignKey: 'supplier_id', as: 'purchaseOrders',});
PurchaseOrder.belongsTo(Supplier, {foreignKey: 'supplier_id', as: 'supplier',});


