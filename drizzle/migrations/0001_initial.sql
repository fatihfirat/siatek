-- Faz 3D Initial PostgreSQL Migration Schema
-- Alpha Teknik B2B & Teslimat Platformu

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT,
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT DEFAULT 'Şanlıurfa',
  tax_number TEXT,
  tax_office TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  is_dealer BOOLEAN DEFAULT FALSE,
  discount_tier TEXT DEFAULT 'STANDARD',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  description TEXT,
  price NUMERIC(14,2) NOT NULL,
  wholesale_price NUMERIC(14,2),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit TEXT NOT NULL DEFAULT 'ADET',
  min_order_quantity INTEGER NOT NULL DEFAULT 1,
  image_url TEXT,
  warehouse_location TEXT,
  min_stock_alert INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_idx ON products(sku);
CREATE INDEX IF NOT EXISTS products_barcode_idx ON products(barcode);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method TEXT,
  notes TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  tracking_number TEXT,
  source_quote_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_user_created_idx ON orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_idx ON orders(idempotency_key);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL,
  total_price NUMERIC(14,2) NOT NULL,
  note TEXT
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_id_idx ON order_status_history(order_id);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_company TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  subtotal NUMERIC(14,2),
  discount_amount NUMERIC(14,2),
  shipping_fee NUMERIC(14,2),
  tax_rate NUMERIC(5,2) DEFAULT 20.00,
  tax_amount NUMERIC(14,2),
  grand_total NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'offer_sent', 'accepted', 'rejected', 'expired')),
  customer_note TEXT,
  admin_response_note TEXT,
  payment_terms TEXT,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS quotes_user_created_idx ON quotes(user_id, created_at);
CREATE INDEX IF NOT EXISTS quotes_status_idx ON quotes(status);

CREATE TABLE IF NOT EXISTS quote_items (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  requested_quantity INTEGER NOT NULL,
  offered_quantity INTEGER,
  unit TEXT NOT NULL,
  list_price NUMERIC(14,2),
  offered_unit_price NUMERIC(14,2),
  discount_rate NUMERIC(5,2),
  total_price NUMERIC(14,2),
  admin_note TEXT
);

CREATE INDEX IF NOT EXISTS quote_items_quote_id_idx ON quote_items(quote_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'order_cancel', 'return', 'manual_adjust', 'count_audit', 'purchase_receive')),
  reference_type TEXT,
  reference_id TEXT,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_created_idx ON stock_movements(product_id, created_at);

CREATE TABLE IF NOT EXISTS delivery_tasks (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  delivery_status TEXT NOT NULL DEFAULT 'unassigned' CHECK (delivery_status IN ('unassigned', 'scheduled', 'out_for_delivery', 'delivered', 'failed', 'rescheduled', 'cancelled')),
  delivery_personnel TEXT,
  delivery_date TIMESTAMPTZ,
  delivery_time_slot TEXT,
  delivery_vehicle TEXT,
  delivery_note TEXT,
  collection_amount NUMERIC(14,2),
  collection_method TEXT DEFAULT 'none' CHECK (collection_method IN ('cash', 'transfer', 'none')),
  collection_status TEXT DEFAULT 'none' CHECK (collection_status IN ('pending', 'collected', 'partially_collected', 'none')),
  failed_reason TEXT,
  recipient_name TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delivery_tasks_status_planned_idx ON delivery_tasks(delivery_status, delivery_date);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  target_role TEXT NOT NULL DEFAULT 'customer' CHECK (target_role IN ('all', 'customer', 'admin')),
  reference_id TEXT,
  reference_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_recipient_read_created_idx ON notifications(recipient_user_id, is_read, created_at);

CREATE TABLE IF NOT EXISTS system_sync_logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  event TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok' CHECK (status IN ('ok', 'warning', 'error')),
  latency_ms NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_sync_logs_created_idx ON system_sync_logs(created_at);
