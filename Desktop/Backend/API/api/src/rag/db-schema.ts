export const DB_SCHEMA = `
==============================
TABLE: PurchaseOrders
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
supplier_id (INT, FK -> Supplier.supplier_id)
installmentsData (JSON)
created_by (INT)
text (VARCHAR)
excelUrl (TEXT)

Relations:
- HasMany PurchaseOrderItems (po_id)

==============================
TABLE: PurchaseOrderItems
------------------------------
po_item_id (INT, PK, auto_increment)
po_id (INT, FK -> PurchaseOrders.po_id)
item_name (VARCHAR)
quantity (DOUBLE)
unit (VARCHAR, nullable)
createdAt (DATETIME)
updatedAt (DATETIME)
unit_price (DOUBLE)
barcode (VARCHAR)

Relations:
- BelongsTo PurchaseOrders (po_id)

==============================
TABLE: supplier_invoices
------------------------------

  invoice_id INT PRIMARY KEY AUTO_INCREMENT,
  supplier_id INT,
  invoice_number VARCHAR(255) UNIQUE,
  invoice_date DATE,
  received_date DATE,
  subtotal DECIMAL(10,0),
  vat DECIMAL(10,0),
  discount DECIMAL(10,0),
  total_amount DECIMAL(10,0),
  status ENUM(
    'Pending','Verified','Approved','Rejected','Paid','Cancelled',
    'Pending Verification','On Hold','Received','Incident',
    'Partial_paid','ReadyForPaid'
  ),
  payment_method ENUM('Cash','Bank Transfer','Stripe','Credit'),
  notes TEXT,
  created_by INT,
  createdAt DATETIME,
  updatedAt DATETIME,
  verification_notes TEXT,
  verified_at DATETIME,
  verified_by INT,
  is_verified TINYINT(1),
  po_number VARCHAR(255),
  supplier_name VARCHAR(255),
  supplier_email VARCHAR(255),
  supplier_phone VARCHAR(255),
  supplier_address VARCHAR(255),
  currency ENUM('USD','ILS','JOD'),
  installmentsData JSON,
  bank_account VARCHAR(255),
  bank_name VARCHAR(255),
  to_name VARCHAR(255),
  to_email VARCHAR(255),
  to_phone VARCHAR(255),
  to_address VARCHAR(255),
  invoice_image VARCHAR(255)


==============================
TABLE: supplier_invoice_items
------------------------------

  id INT PRIMARY KEY AUTO_INCREMENT,
  invoice_id INT,
  item_name VARCHAR(255),
  barcode VARCHAR(255),
  quantity DECIMAL(10,0),
  unit_price DECIMAL(10,0),
  unit VARCHAR(255),
  total_price DECIMAL(10,0),
  remarks VARCHAR(255),
  is_matched TINYINT(1),
  match_notes VARCHAR(255)

  ==============================
TABLE: delivery_notes
------------------------------
dn_id (INT, PK, auto_increment)
supplier_id (INT, FK -> suppliers.supplier_id)
po_number (VARCHAR)
dn_number (VARCHAR, UNIQUE)
dn_date (DATE)
status (ENUM: 'Pending','Verified','Approved','Rejected','Received','Incident')
notes (TEXT)
supplier_name (VARCHAR)
supplier_email (VARCHAR)
supplier_phone (VARCHAR)
supplier_address (VARCHAR)
created_by (INT)
verified_by (INT)
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
- BelongsTo PurchaseOrders (po_number)


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
- item_name relates to PurchaseOrderItems.item_name
- barcode relates to PurchaseOrderItems.barcode (when available)

==============================
TABLE: goods_receipts
------------------------------
gr_id (INT, PK, auto_increment)
gr_number (VARCHAR, UNIQUE)
gr_date (DATE)
received_by (INT)
notes (TEXT)
status ENUM('Pending','Received','Verified','Incident')
po_number (VARCHAR)
createdAt (DATETIME)
updatedAt (DATETIME)
dn_id (INT)
is_verified (TINYINT)

Relations:
- BelongsTo PurchaseOrders via po_number
- HasMany goods_receipt_items via gr_id

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
- item_name matches purchaseorderitems.item_name
- barcode matches purchaseorderitems.barcode

==============================
TABLE: user
------------------------------
user_id (INT, PK, auto_increment)
email (VARCHAR, UNIQUE)
password_hash (VARCHAR)
role_id (INT)
status ENUM('Active','Inactive')
createdAt (DATETIME)
updatedAt (DATETIME)
deletedAt (DATETIME, nullable)
first_name (VARCHAR)
last_name (VARCHAR, nullable)
phone_number (VARCHAR, nullable)
location (VARCHAR, nullable)
profile_image (VARCHAR, nullable)
gender ENUM('Male','Female', nullable)
birth_date (DATE, nullable)
ID_image (VARCHAR, nullable)

==============================

/* Relations:
   - PurchaseOrderItems.po_id -> PurchaseOrders.po_id
   - supplier_invoices.po_number -> PurchaseOrders.po_number
   - supplier_invoice_items.invoice_id -> supplier_invoices.invoice_id
+  - supplier_invoice_items.item_name relates to PurchaseOrderItems.item_name
+  - supplier_invoice_items.barcode relates to PurchaseOrderItems.barcode (when available)
+  - To compare quantities or prices between PO and Supplier Invoice:
+       JOIN PurchaseOrderItems ON PurchaseOrderItems.item_name = supplier_invoice_items.item_name
+       AND supplier_invoices.po_number = PurchaseOrders.po_number
*/


`;
