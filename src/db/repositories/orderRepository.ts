/**
 * PostgreSQL Order & POS Transaction Repository (Faz 3D)
 * Strict ACID transactions, SELECT ... FOR UPDATE stock locking, and Idempotency.
 */

export interface CreateOrderDTO {
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    note?: string;
  }>;
  discount?: number;
  paymentMethod?: string;
  notes?: string;
  idempotencyKey: string;
  sourceQuoteId?: string;
}

export class OrderRepository {
  constructor(private pool: any) {}

  async createOrderWithTransaction(dto: CreateOrderDTO) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Check Idempotency key to prevent duplicate orders/sales
      const existingCheck = await client.query(
        'SELECT id, order_number FROM orders WHERE idempotency_key = $1',
        [dto.idempotencyKey]
      );
      if (existingCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: true, order: existingCheck.rows[0], idempotentDuplicate: true };
      }

      let subtotal = 0;
      const processedItems = [];

      // 2. Lock products row-level and deduct stock atomically
      for (const item of dto.items) {
        const prodResult = await client.query(
          'SELECT id, name, price, stock, unit FROM products WHERE id = $1 FOR UPDATE',
          [item.productId]
        );

        if (prodResult.rows.length === 0) {
          throw new Error(`Ürün bulunamadı: ${item.productId}`);
        }

        const product = prodResult.rows[0];
        const qty = item.quantity;

        if (product.stock < qty) {
          throw new Error(`Yetersiz stok! Ürün: "${product.name}", Mevcut Stok: ${product.stock}, Talep: ${qty}`);
        }

        const unitPrice = item.unitPrice || Number(product.price);
        const totalPrice = qty * unitPrice;
        subtotal += totalPrice;

        const newStock = product.stock - qty;

        // Update stock
        await client.query(
          'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
          [newStock, product.id]
        );

        // Record stock movement (audit trail)
        await client.query(
          `INSERT INTO stock_movements (id, product_id, quantity_change, previous_stock, new_stock, movement_type, reference_type, user_id)
           VALUES ($1, $2, $3, $4, $5, 'sale', 'order', $6)`,
          [`mov-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, product.id, -qty, product.stock, newStock, dto.userId]
        );

        processedItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unit: item.unit || product.unit,
          unitPrice,
          totalPrice,
          note: item.note || '',
        });
      }

      const discount = dto.discount || 0;
      const tax = Math.round((subtotal - discount) * 0.2 * 100) / 100;
      const total = (subtotal - discount) + tax;

      const orderId = `ord-${Date.now()}`;
      const orderNumber = `SIP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 3. Insert Order Header
      await client.query(
        `INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, customer_address, subtotal, discount, tax, total, status, payment_method, notes, idempotency_key, source_quote_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13, $14, $15)`,
        [orderId, orderNumber, dto.userId, dto.customerName, dto.customerEmail, dto.customerPhone, dto.customerAddress, subtotal, discount, tax, total, dto.paymentMethod || 'bank_transfer', dto.notes || '', dto.idempotencyKey, dto.sourceQuoteId || null]
      );

      // 4. Insert Order Items (Snapshots)
      for (const it of processedItems) {
        await client.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit, unit_price, total_price, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [it.id, orderId, it.productId, it.productName, it.quantity, it.unit, it.unitPrice, it.totalPrice, it.note]
        );
      }

      // 5. Insert Initial Status History
      await client.query(
        `INSERT INTO order_status_history (id, order_id, status, note, updated_by)
         VALUES ($1, $2, 'pending', 'Sipariş başarıyla oluşturuldu ve onaya alındı.', $3)`,
        [`hist-${Date.now()}-1`, orderId, dto.customerName]
      );

      // 6. Create Delivery Task (Faz 3C)
      await client.query(
        `INSERT INTO delivery_tasks (id, order_id, delivery_status)
         VALUES ($1, $2, 'unassigned')`,
        [`del-${Date.now()}`, orderId]
      );

      // 7. Create Notification for Admin (Outbox pattern)
      await client.query(
        `INSERT INTO notifications (id, recipient_user_id, title, message, type, target_role, reference_id, reference_type)
         SELECT id, id, 'Yeni Sipariş Alındı 🛒', $1, 'order_created', 'admin', $2, 'order'
         FROM users WHERE role = 'admin'`,
        [`notif-${Date.now()}`, `${dto.customerName} tarafından ${orderNumber} nolu sipariş verildi. Toplam: ${total} ₺`, orderId]
      );

      await client.query('COMMIT');
      return { success: true, orderId, orderNumber, total };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
