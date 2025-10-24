
import { DataTypes, Model, InferAttributes, InferCreationAttributes, ForeignKey } from 'sequelize';
import { sequelize } from '../../db';
import { InvoiceIncident } from './InvoiceIncident';

export class InvoiceIncidentItem extends Model<InferAttributes<InvoiceIncidentItem>, InferCreationAttributes<InvoiceIncident>> {
  declare item_id: number;
  declare incident_id: number;
  declare item_name: string;
  declare barcode: string;
  declare quantity: number;
  declare unit_price: number;
  declare unit: string;
  declare total_price: number;
  declare remarks: string;
  declare is_resolved: boolean;
  declare resolution_notes: string;
  
}

// تعريف الجدول
InvoiceIncidentItem.init(
  {
    item_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    incident_id: { type: DataTypes.INTEGER, allowNull: false },
    item_name: { type: DataTypes.STRING, allowNull: false },
    barcode: { type: DataTypes.STRING, allowNull: true },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    unit: { type: DataTypes.STRING, allowNull: true },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    remarks: { type: DataTypes.STRING, allowNull: true },
    is_resolved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    resolution_notes: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: 'invoice_incident_items',
    timestamps: false
  }
);
  InvoiceIncident.hasMany(InvoiceIncidentItem, { foreignKey: 'incident_id', onDelete: 'CASCADE' });
InvoiceIncidentItem.belongsTo(InvoiceIncident, { foreignKey: 'incident_id', onDelete: 'CASCADE' });