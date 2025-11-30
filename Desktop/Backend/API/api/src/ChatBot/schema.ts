export const DB_SCHEMA = `
==============================
TABLE: PurchaseOrders
------------------------------
po_id (INT, PK)
po_number (STRING, unique)
supplier_id (INT, FK -> Supplier.supplier_id)
order_date (DATE)
subtotal (DOUBLE)
vat (DOUBLE)
total_amount (DOUBLE)
text (STRING)
note (TEXT)
currency (ENUM: 'USD','ILS','JOD')
status (ENUM: 'Open','Closed','Cancelled','Draft','Approved','Sent','Incident','ReadyForPaid')
payment_method (ENUM: 'Cash','Bank Transfer','PayPal','Credit')
company_name (STRING)
company_email (STRING)
company_phone (STRING)
company_address (STRING)
supplier_email (STRING)
supplier_phone (STRING)
supplier_address (STRING)
created_by (INT, FK -> users.user_id)
installmentsData (JSON)
Relations:
- HasMany PurchaseOrderItem (po_id)
- BelongsTo Supplier (supplier_id)

==============================
TABLE: PurchaseOrderItems
------------------------------
po_item_id (INT, PK)
po_id (INT, FK -> PurchaseOrders.po_id)
item_name (STRING)
barcode (STRING)
quantity (INT)
unit_price (DOUBLE)
unit (STRING)

==============================
TABLE: delivery_notes
------------------------------
dn_id (INT, PK)
dn_number (STRING)
dn_date (DATEONLY)
supplier_name (STRING)
supplier_email (STRING)
supplier_phone (STRING)
supplier_address (STRING)
status (ENUM: 'Pending','Verified','Approved','Rejected','Received','Incident')
po_number (STRING)
supplier_id (INT, FK -> Supplier.supplier_id)
created_by (INT, FK -> users.user_id)
verified_by (INT, FK -> users.user_id)
verification_notes (TEXT)
verified_at (DATE)
is_verified (BOOLEAN)
notes (TEXT)
document_images (TEXT)
to_name (STRING)
to_email (STRING)
to_phone (STRING)
to_address (STRING)
Relations:
- HasMany DeliveryNoteItem (dn_id)

==============================
TABLE: DeliveryNoteItem
------------------------------
dni_id (INT, PK)
dn_id (INT, FK -> delivery_notes.dn_id)
product_name (STRING)
barcode (STRING)
quantity (INT)
unit (STRING)
unit_price (DOUBLE)

==============================
TABLE: stock
------------------------------
stock_id (INT, PK)
product_name (STRING)
barcode (STRING)
dn_id (INT, FK -> delivery_notes.dn_id)
quantity (INT)
unit (STRING)
expiration_date (DATE)
status (ENUM: 'Available','Expired','Reserved','OutOfStock')
Relations:
- BelongsTo delivery_notes (dn_id)

==============================
TABLE: supplier_invoices
------------------------------
invoice_id (INT, PK)
supplier_id (INT, FK -> Supplier.supplier_id)
po_number (STRING, FK -> PurchaseOrders.po_number)
invoice_number (STRING)
supplier_name (STRING)
supplier_email (STRING)
supplier_phone (STRING)
supplier_address (STRING)
invoice_date (DATE)
received_date (DATE)
subtotal (DECIMAL)
vat (DECIMAL)
discount (DECIMAL)
total_amount (DECIMAL)
bank_account (STRING)
bank_name (STRING)
status (ENUM: 'Pending','Pending Verification','Verified','Approved','Rejected','Paid','Cancelled','On Hold','Received','Incident','Partial_paid','ReadyForPaid')
is_verified (BOOLEAN)
verified_by (INT, FK -> users.user_id)
verified_at (DATE)
verification_notes (TEXT)
currency (ENUM)
payment_method (ENUM)
notes (TEXT)
created_by (INT, FK -> users.user_id)
to_name (STRING)
to_email (STRING)
to_phone (STRING)
to_address (STRING)
invoice_image (STRING)
installmentsData (JSON)
Relations:
- HasMany SupplierInvoiceItem (invoice_id)
- HasMany Payment (invoice_id)

==============================
TABLE: SupplierInvoiceItem
------------------------------
invoice_item_id (INT, PK)
invoice_id (INT, FK -> supplier_invoices.invoice_id)
item_name (STRING)
barcode (STRING)
quantity (INT)
unit_price (DOUBLE)
unit (STRING)

==============================
TABLE: payments
------------------------------
payment_id (INT, PK)
invoice_id (INT, FK -> supplier_invoices.invoice_id)
payment_date (DATE)
amount_paid (DECIMAL)
remaining_amount (DECIMAL)
payment_method (ENUM)
currency (ENUM)
notes (TEXT)
status (ENUM: 'Pending','Completed','Failed')
payment_details (TEXT)
currency_difference (DECIMAL)
installment_amount (DECIMAL)
currency_paid (ENUM)

==============================
TABLE: goods_receipts
------------------------------
gr_id (INT, PK)
gr_number (STRING)
gr_date (DATEONLY)
dn_id (INT, FK -> delivery_notes.dn_id)
received_by (INT, FK -> users.user_id)
notes (TEXT)
status (ENUM: 'Pending','Received','Verified','Incident')
po_number (STRING)
is_verified (BOOLEAN)
Relations:
- HasMany GoodsReceiptItem (gr_id)

==============================
TABLE: GoodsReceiptItem
------------------------------
gri_id (INT, PK)
gr_id (INT, FK -> goods_receipts.gr_id)
item_name (STRING)
barcode (STRING)
quantity (INT)
unit_price (DOUBLE)

==============================
TABLE: users
------------------------------
user_id (INT, PK)
name (STRING)
email (STRING)
role_id (INT)

==============================
NLP SEMANTICS (Arabic → SQL Mapping)
------------------------------
"فواتير الموردين" = supplier_invoices
"فاتورة مورد" = supplier_invoices
"طلبات الشراء" = PurchaseOrders
"PO" = PurchaseOrders
"GR" = goods_receipts
"DN" = delivery_notes
"دفعات" = payments
"الفواتير الجاهزة للدفع" = supplier_invoices.status = 'ReadyForPaid'
"الفواتير المدفوعة جزئياً" = supplier_invoices.status = 'Partial_paid'
"الفواتير المعتمدة" = supplier_invoices.status = 'Approved'
"آخر فاتورة" = supplier_invoices ORDER BY invoice_date DESC LIMIT 1
"أحدث فاتورة" = supplier_invoices ORDER BY invoice_date DESC LIMIT 1
"آخر فاتورة تم رفعها" = supplier_invoices ORDER BY createdAt DESC LIMIT 1

`;
