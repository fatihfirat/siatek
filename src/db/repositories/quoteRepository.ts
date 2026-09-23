/**
 * Quote Repository & Conversion (Faz 3D.1)
 * Atomic quote-to-order conversion.
 */
export class QuoteRepository {
  constructor(private pool: any) {}

  async findAll(userId?: string, isAdmin = false) {
    if (isAdmin) {
      const res = await this.pool.query('SELECT * FROM quotes ORDER BY created_at DESC');
      return res.rows;
    }
    const res = await this.pool.query('SELECT * FROM quotes WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows;
  }

  async convertQuoteToOrder(quoteId: string, userId: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Lock quote
      const quoteRes = await client.query('SELECT * FROM quotes WHERE id = $1 FOR UPDATE', [quoteId]);
      if (quoteRes.rows.length === 0) {
        throw new Error('Teklif bulunamadı.');
      }
      const quote = quoteRes.rows[0];

      if (quote.status === 'accepted') {
        throw new Error('Bu teklif daha önce zaten onaylanıp siparişe dönüştürülmüştür.');
      }

      // Fetch quote items
      const itemsRes = await client.query('SELECT * FROM quote_items WHERE quote_id = $1', [quoteId]);
      const quoteItems = itemsRes.rows;

      if (quoteItems.length === 0) {
        throw new Error('Teklif kalemleri boş.');
      }

      // Update quote status to accepted
      await client.query("UPDATE quotes SET status = 'accepted', updated_at = NOW() WHERE id = $1", [quoteId]);

      // Create Order
      const orderId = `ord-qte-${Date.now()}`;
      const orderNumber = `SIP-TKL-${Math.floor(1000 + Math.random() * 9000)}`;
      const idempotencyKey = `idemp-quote-${quoteId}`;

      await client.query(
        `INSERT INTO orders (id, order_number, user_id, customer_name, customer_email, customer_phone, customer_address, subtotal, discount, tax, total, status, payment_method, notes, idempotency_key, source_quote_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, $10, 'approved', 'Cari Hesap', $11, $12, $13)`,
        [orderId, orderNumber, quote.user_id, quote.customer_name, quote.customer_email, quote.customer_phone, `${quote.delivery_city} (Teklif Onayı)`, quote.grand_total || 0, (quote.grand_total || 0) * 0.1666, quote.grand_total || 0, `Teklif ${quote.quote_number} numarasından dönüştürüldü.`, idempotencyKey, quoteId]
      );

      for (const qi of quoteItems) {
        const qty = qi.offered_quantity || qi.requested_quantity;
        const price = qi.offered_unit_price || qi.list_price || 0;

        await client.query(
          `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit, unit_price, total_price, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [`oi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, orderId, qi.product_id || 'prod-custom', qi.product_name, qty, qi.unit, price, qty * price, 'Teklif kalemi']
        );
      }

      await client.query('COMMIT');
      return { success: true, orderId, orderNumber };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
