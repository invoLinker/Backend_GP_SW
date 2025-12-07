export const DB_SCHEMA = `
==============================
TABLE: purchaseorders
------------------------------
po_id (INT, PK, auto_increment)
order_date (DATETIME)
total_amount (DOUBLE)
status (ENUM: 'Pending','Closed','Rejected','Draft','Approved','Sent','Incident','ReadyForPaid')
subtotal (DOUBLE)
vat (DOUBLE)
po_number (VARCHAR, UNIQUE)
createdAt (DATETIME)
updatedAt (DATETIME)
pdfUrl (TEXT, nullable)
note (TEXT, nullable)
is_verified (BOOLEAN)
currency (ENUM: 'USD','ILS','JOD')
payment_method (ENUM: 'Cash','Bank Transfer','Stripe','Credit')
company_name (VARCHAR)
company_email (VARCHAR)
company_phone (VARCHAR)
company_address (VARCHAR)
supplier_email (VARCHAR)
supplier_phone (VARCHAR)
supplier_address (VARCHAR)
supplier_id (INT, FK -> suppliers.supplier_id)
installmentsData (JSON)
created_by (INT, FK -> user.user_id)
text (VARCHAR)
excelUrl (TEXT)

Relations:
- HasMany purchaseorderitems (po_id)
- BelongsTo suppliers (supplier_id)
- BelongsTo user (created_by)

==============================
TABLE: purchaseorderitems
------------------------------
po_item_id (INT, PK, auto_increment)
po_id (INT, FK -> purchaseorders.po_id)
item_name (VARCHAR)
quantity (DOUBLE)
unit (VARCHAR, nullable)
createdAt (DATETIME)
updatedAt (DATETIME)
unit_price (DOUBLE)
barcode (VARCHAR)

Relations:
- BelongsTo purchaseorders (po_id)

==============================
TABLE: suppliers
------------------------------
supplier_id (INT, PK, auto_increment)
supplier_name (VARCHAR)
email (VARCHAR)
phone (VARCHAR)
address (VARCHAR)
createdAt (DATETIME)
updatedAt (DATETIME)

Relations:
- HasMany purchaseorders (supplier_id)
- HasMany supplier_invoices (supplier_id)

==============================
TABLE: supplier_invoices
------------------------------
invoice_id (INT, PK, auto_increment)
supplier_id (INT, FK -> suppliers.supplier_id)
invoice_number (VARCHAR, UNIQUE)
invoice_date (DATE)
received_date (DATE)
subtotal (DECIMAL)
vat (DECIMAL)
discount (DECIMAL)
total_amount (DECIMAL)
status (ENUM: 'Pending','Verified','Approved','Rejected','Paid','Cancelled','Pending Verification','On Hold','Received','Incident','Partial_paid','ReadyForPaid')
payment_method (ENUM: 'Cash','Bank Transfer','Stripe','Credit')
notes (TEXT)
created_by (INT, FK -> user.user_id)
createdAt (DATETIME)
updatedAt (DATETIME)
verification_notes (TEXT)
verified_at (DATETIME)
verified_by (INT, FK -> user.user_id)
is_verified (TINYINT)
po_number (VARCHAR, FK -> purchaseorders.po_number)
supplier_name (VARCHAR)
supplier_email (VARCHAR)
supplier_phone (VARCHAR)
supplier_address (VARCHAR)
currency (ENUM: 'USD','ILS','JOD')
installmentsData (JSON)
bank_account (VARCHAR)
bank_name (VARCHAR)
to_name (VARCHAR)
to_email (VARCHAR)
to_phone (VARCHAR)
to_address (VARCHAR)
invoice_image (VARCHAR)

Relations:
- HasMany supplier_invoice_items (invoice_id)
- HasMany payments (invoice_id)
- BelongsTo suppliers (supplier_id)
- BelongsTo purchaseorders (po_number)
- BelongsTo user (created_by, verified_by)

==============================
TABLE: supplier_invoice_items
------------------------------
id (INT, PK, auto_increment)
invoice_id (INT, FK -> supplier_invoices.invoice_id)
item_name (VARCHAR)
barcode (VARCHAR)
quantity (DECIMAL)
unit_price (DECIMAL)
unit (VARCHAR)
total_price (DECIMAL)
remarks (VARCHAR)
is_matched (TINYINT)
match_notes (VARCHAR)

Relations:
- BelongsTo supplier_invoices (invoice_id)

==============================
TABLE: delivery_notes
------------------------------
dn_id (INT, PK, auto_increment)
supplier_id (INT, FK -> suppliers.supplier_id)
po_number (VARCHAR, FK -> purchaseorders.po_number)
dn_number (VARCHAR, UNIQUE)
dn_date (DATE)
status (ENUM: 'Pending','Verified','Approved','Rejected','Received','Incident')
notes (TEXT)
supplier_name (VARCHAR)
supplier_email (VARCHAR)
supplier_phone (VARCHAR)
supplier_address (VARCHAR)
created_by (INT, FK -> user.user_id)
verified_by (INT, FK -> user.user_id)
verification_notes (TEXT)
verified_at (DATETIME)
is_verified (TINYINT)
document_images (TEXT)
createdAt (DATETIME)
updatedAt (DATETIME)
to_name (VARCHAR)
to_email (VARCHAR)
to_phone (VARCHAR)
to_address (VARCHAR)

Relations:
- HasMany delivery_note_items (dn_id)
- BelongsTo purchaseorders (po_number)
- BelongsTo suppliers (supplier_id)
- BelongsTo user (created_by, verified_by)

==============================
TABLE: delivery_note_items
------------------------------
item_id (INT, PK, auto_increment)
dn_id (INT, FK -> delivery_notes.dn_id)
item_name (VARCHAR)
quantity (DECIMAL)
unit (VARCHAR, nullable)
barcode (VARCHAR, nullable)
remarks (TEXT, nullable)

Relations:
- BelongsTo delivery_notes (dn_id)

==============================
TABLE: goods_receipts
------------------------------
gr_id (INT, PK, auto_increment)
gr_number (VARCHAR, UNIQUE)
gr_date (DATE)
received_by (INT, FK -> user.user_id)
notes (TEXT)
status (ENUM: 'Pending','Received','Verified','Incident')
po_number (VARCHAR, FK -> purchaseorders.po_number)
createdAt (DATETIME)
updatedAt (DATETIME)
dn_id (INT, FK -> delivery_notes.dn_id)
is_verified (TINYINT)

Relations:
- BelongsTo purchaseorders (po_number)
- BelongsTo delivery_notes (dn_id)
- BelongsTo user (received_by)
- HasMany goods_receipt_items (gr_id)

==============================
TABLE: goods_receipt_items
------------------------------
gri_id (INT, PK, auto_increment)
gr_id (INT, FK -> goods_receipts.gr_id)
item_name (VARCHAR)
quantity (INT)
unit (VARCHAR)
barcode (VARCHAR)
notes (TEXT)
expiration_date (DATETIME)

Relations:
- BelongsTo goods_receipts (gr_id)

==============================
TABLE: payments
------------------------------
payment_id (INT, PK, auto_increment)
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

Relations:
- BelongsTo supplier_invoices (invoice_id)

==============================
TABLE: stock
------------------------------
stock_id (INT, PK, auto_increment)
item_name (VARCHAR)
barcode (VARCHAR)
dn_id (INT, FK -> delivery_notes.dn_id)
quantity (INT)
unit (VARCHAR)
expiration_date (DATE)
status (ENUM: 'Available','Expired','Reserved','OutOfStock')

Relations:
- BelongsTo delivery_notes (dn_id)

==============================
TABLE: user
------------------------------
user_id (INT, PK, auto_increment)
email (VARCHAR, UNIQUE)
password_hash (VARCHAR)
role_id (INT, FK -> roles.role_id)
status (ENUM: 'Active','Inactive')
createdAt (DATETIME)
updatedAt (DATETIME)
deletedAt (DATETIME, nullable)
first_name (VARCHAR)
last_name (VARCHAR, nullable)
phone_number (VARCHAR, nullable)
location (VARCHAR, nullable)
profile_image (VARCHAR, nullable)
gender (ENUM: 'Male','Female', nullable)
birth_date (DATE, nullable)
ID_image (VARCHAR, nullable)

Relations:
- BelongsTo roles (role_id)

==============================
TABLE: roles
------------------------------
role_id (INT, PK, auto_increment)
role_name (VARCHAR)
description (TEXT)
createdAt (DATETIME)
updatedAt (DATETIME)

Relations:
- HasMany user (role_id)
- HasMany role_permissions (role_id)

==============================
TABLE: tasks
------------------------------
task_id (INT, PK, auto_increment)
title (VARCHAR)
description (TEXT)
status (ENUM)
priority (ENUM)
due_date (DATE)
created_by (INT, FK -> user.user_id)
createdAt (DATETIME)
updatedAt (DATETIME)

Relations:
- BelongsTo user (created_by)

==============================
TABLE: history_log
------------------------------
log_id (INT, PK, auto_increment)
action (VARCHAR)
description (TEXT)
user (VARCHAR)
userRole (VARCHAR)
category (VARCHAR)
severity (VARCHAR)
details (JSON)
createdAt (DATETIME)

==============================
TABLE: invoice_incidents
------------------------------
incident_id (INT, PK, auto_increment)
invoice_id (INT, FK -> supplier_invoices.invoice_id)
incident_type (VARCHAR)
description (TEXT)
status (VARCHAR)
created_by (INT, FK -> user.user_id)
createdAt (DATETIME)
updatedAt (DATETIME)

Relations:
- BelongsTo supplier_invoices (invoice_id)
- BelongsTo user (created_by)
- HasMany invoice_incident_items (incident_id)

==============================
TABLE: invoice_incident_items
------------------------------
item_id (INT, PK, auto_increment)
incident_id (INT, FK -> invoice_incidents.incident_id)
item_name (VARCHAR)
barcode (VARCHAR)
quantity (DECIMAL)
unit_price (DECIMAL)
notes (TEXT)

Relations:
- BelongsTo invoice_incidents (incident_id)

==============================
TABLE: edit_requests
------------------------------
request_id (INT, PK, auto_increment)
entity_type (VARCHAR)
entity_id (INT)
requested_changes (JSON)
status (ENUM: 'Pending','Approved','Rejected')
requested_by (INT, FK -> user.user_id)
approved_by (INT, FK -> user.user_id)
createdAt (DATETIME)
updatedAt (DATETIME)

Relations:
- BelongsTo user (requested_by, approved_by)

==============================

IMPORTANT NOTES:
- All table names are lowercase in MySQL
- Use EXACT table names as shown above
- Always use subqueries for aggregations to avoid fan-out issues
- Item matching uses BOTH item_name AND barcode
- User full name: CONCAT(first_name, ' ', last_name)
- Always aggregate per item using SUM() and GROUP BY item_name + barcode

`;
