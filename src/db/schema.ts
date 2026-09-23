import { pgTable, text, timestamp, numeric, integer, boolean, uuid, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username'),
  name: text('name').notNull(),
  companyName: text('company_name'),
  phone: text('phone').notNull(),
  address: text('address'),
  city: text('city').default('Şanlıurfa'),
  taxNumber: text('tax_number'),
  taxOffice: text('tax_office'),
  role: text('role', { enum: ['customer', 'admin'] }).notNull().default('customer'),
  isDealer: boolean('is_dealer').default(false),
  discountTier: text('discount_tier').default('STANDARD'),
  passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
  roleIdx: index('users_role_idx').on(table.role),
}));

// Products Table
export const products = pgTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').notNull().unique(),
  barcode: text('barcode'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  subCategory: text('sub_category'),
  description: text('description'),
  price: numeric('price', { precision: 14, scale: 2 }).notNull(),
  wholesalePrice: numeric('wholesale_price', { precision: 14, scale: 2 }),
  stock: integer('stock').notNull().default(0),
  unit: text('unit').notNull().default('ADET'),
  minOrderQuantity: integer('min_order_quantity').notNull().default(1),
  imageUrl: text('image_url'),
  warehouseLocation: text('warehouse_location'),
  minStockAlert: integer('min_stock_alert').default(5),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  skuIdx: uniqueIndex('products_sku_idx').on(table.sku),
  barcodeIdx: index('products_barcode_idx').on(table.barcode),
  categoryIdx: index('products_category_idx').on(table.category),
  stockCheck: check('products_stock_non_negative', sql`stock >= 0`),
}));

// Orders Table
export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerAddress: text('customer_address').notNull(),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 14, scale: 2 }).notNull().default('0'),
  tax: numeric('tax', { precision: 14, scale: 2 }).notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
  status: text('status', {
    enum: ['pending', 'approved', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled']
  }).notNull().default('pending'),
  paymentMethod: text('payment_method'),
  notes: text('notes'),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  trackingNumber: text('tracking_number'),
  sourceQuoteId: text('source_quote_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index('orders_user_created_idx').on(table.userId, table.createdAt),
  statusIdx: index('orders_status_idx').on(table.status),
  idempotencyIdx: uniqueIndex('orders_idempotency_idx').on(table.idempotencyKey),
}));

// Order Items Table (with Snapshot Data)
export const orderItems = pgTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'restrict' }).notNull(),
  productName: text('product_name').notNull(), // Snapshot
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(), // Snapshot
  totalPrice: numeric('total_price', { precision: 14, scale: 2 }).notNull(), // Snapshot
  note: text('note'),
}, (table) => ({
  orderIdIdx: index('order_items_order_id_idx').on(table.orderId),
}));

// Order Status History Table
export const orderStatusHistory = pgTable('order_status_history', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').notNull(),
  note: text('note'),
  updatedBy: text('updated_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('order_status_history_order_id_idx').on(table.orderId),
}));

// Quotes Table
export const quotes = pgTable('quotes', {
  id: text('id').primaryKey(),
  quoteNumber: text('quote_number').notNull().unique(),
  userId: text('user_id').references(() => users.id, { onDelete: 'restrict' }).notNull(),
  customerName: text('customer_name').notNull(),
  customerCompany: text('customer_company'),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  deliveryCity: text('delivery_city').notNull(),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }),
  discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }),
  shippingFee: numeric('shipping_fee', { precision: 14, scale: 2 }),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('20.00'),
  taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }),
  grandTotal: numeric('grand_total', { precision: 14, scale: 2 }),
  status: text('status', { enum: ['pending_review', 'offer_sent', 'accepted', 'rejected', 'expired'] }).notNull().default('pending_review'),
  customerNote: text('customer_note'),
  adminResponseNote: text('admin_response_note'),
  paymentTerms: text('payment_terms'),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index('quotes_user_created_idx').on(table.userId, table.createdAt),
  statusIdx: index('quotes_status_idx').on(table.status),
}));

// Quote Items Table
export const quoteItems = pgTable('quote_items', {
  id: text('id').primaryKey(),
  quoteId: text('quote_id').references(() => quotes.id, { onDelete: 'cascade' }).notNull(),
  productId: text('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  requestedQuantity: integer('requested_quantity').notNull(),
  offeredQuantity: integer('offered_quantity'),
  unit: text('unit').notNull(),
  listPrice: numeric('list_price', { precision: 14, scale: 2 }),
  offeredUnitPrice: numeric('offered_unit_price', { precision: 14, scale: 2 }),
  discountRate: numeric('discount_rate', { precision: 5, scale: 2 }),
  totalPrice: numeric('total_price', { precision: 14, scale: 2 }),
  adminNote: text('admin_note'),
}, (table) => ({
  quoteIdIdx: index('quote_items_quote_id_idx').on(table.quoteId),
}));

// Stock Movements Table (Audit Trail)
export const stockMovements = pgTable('stock_movements', {
  id: text('id').primaryKey(),
  productId: text('product_id').references(() => products.id, { onDelete: 'restrict' }).notNull(),
  quantityChange: integer('quantity_change').notNull(), // e.g. -5 or +50
  previousStock: integer('previous_stock').notNull(),
  newStock: integer('new_stock').notNull(),
  movementType: text('movement_type', { enum: ['sale', 'order_cancel', 'return', 'manual_adjust', 'count_audit', 'purchase_receive'] }).notNull(),
  referenceType: text('reference_type'), // 'order', 'adjustment', 'count'
  referenceId: text('reference_id'),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  productCreatedIdx: index('stock_movements_product_created_idx').on(table.productId, table.createdAt),
}));

// Delivery Tasks Table (Faz 3C)
export const deliveryTasks = pgTable('delivery_tasks', {
  id: text('id').primaryKey(),
  orderId: text('order_id').references(() => orders.id, { onDelete: 'cascade' }).notNull().unique(),
  deliveryStatus: text('delivery_status', {
    enum: ['unassigned', 'scheduled', 'out_for_delivery', 'delivered', 'failed', 'rescheduled', 'cancelled']
  }).notNull().default('unassigned'),
  deliveryPersonnel: text('delivery_personnel'),
  deliveryDate: timestamp('delivery_date', { withTimezone: true }),
  deliveryTimeSlot: text('delivery_time_slot'),
  deliveryVehicle: text('delivery_vehicle'),
  deliveryNote: text('delivery_note'),
  collectionAmount: numeric('collection_amount', { precision: 14, scale: 2 }),
  collectionMethod: text('collection_method', { enum: ['cash', 'transfer', 'none'] }).default('none'),
  collectionStatus: text('collection_status', { enum: ['pending', 'collected', 'partially_collected', 'none'] }).default('none'),
  failedReason: text('failed_reason'),
  recipientName: text('recipient_name'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusPlannedIdx: index('delivery_tasks_status_planned_idx').on(table.deliveryStatus, table.deliveryDate),
}));

// Notifications Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  recipientUserId: text('recipient_user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  targetRole: text('target_role', { enum: ['all', 'customer', 'admin'] }).notNull().default('customer'),
  referenceId: text('reference_id'),
  referenceType: text('reference_type'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  recipientReadCreatedIdx: index('notifications_recipient_read_created_idx').on(table.recipientUserId, table.isRead, table.createdAt),
}));

// System Sync Logs Table
export const systemSyncLogs = pgTable('system_sync_logs', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  event: text('event').notNull(),
  details: text('details').notNull(),
  status: text('status', { enum: ['ok', 'warning', 'error'] }).notNull().default('ok'),
  latencyMs: numeric('latency_ms', { precision: 8, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  createdIdx: index('system_sync_logs_created_idx').on(table.createdAt),
}));
