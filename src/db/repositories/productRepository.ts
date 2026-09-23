/**
 * Product Repository (Faz 3D.1)
 */
export class ProductRepository {
  constructor(private pool: any) {}

  async findAll() {
    const res = await this.pool.query('SELECT * FROM products ORDER BY name ASC');
    return res.rows;
  }

  async findById(id: string) {
    const res = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  async create(product: any) {
    const res = await this.pool.query(
      `INSERT INTO products (id, sku, barcode, name, category, sub_category, description, price, wholesale_price, stock, unit, min_order_quantity, image_url, warehouse_location, min_stock_alert)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *;`,
      [product.id, product.sku, product.barcode || null, product.name, product.category, product.subCategory || null, product.description || '', product.price, product.wholesalePrice || null, product.stock || 0, product.unit || 'ADET', product.minOrderQuantity || 1, product.imageUrl || '', product.warehouseLocation || 'Raf A-01', product.minStockAlert || 5]
    );
    return res.rows[0];
  }

  async update(id: string, updates: any) {
    const res = await this.pool.query(
      `UPDATE products SET price = COALESCE($2, price), stock = COALESCE($3, stock), updated_at = NOW() WHERE id = $1 RETURNING *;`,
      [id, updates.price, updates.stock]
    );
    return res.rows[0] || null;
  }
}
