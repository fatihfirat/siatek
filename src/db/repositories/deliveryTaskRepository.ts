/**
 * Delivery Task Repository with State Transition Rules (Faz 3D.1)
 */
export const ALLOWED_DELIVERY_TRANSITIONS: Record<string, string[]> = {
  unassigned: ['scheduled', 'out_for_delivery', 'cancelled'],
  scheduled: ['out_for_delivery', 'rescheduled', 'cancelled'],
  out_for_delivery: ['delivered', 'failed', 'rescheduled'],
  delivered: [], // Terminal
  failed: ['rescheduled', 'scheduled'],
  rescheduled: ['scheduled', 'out_for_delivery', 'cancelled'],
  cancelled: [] // Terminal
};

export class DeliveryTaskRepository {
  constructor(private pool: any) {}

  async updateStatus(taskId: string, newStatus: string, personnel?: string, reason?: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const taskRes = await client.query('SELECT * FROM delivery_tasks WHERE id = $1 FOR UPDATE', [taskId]);
      if (taskRes.rows.length === 0) {
        throw new Error('Teslimat görevi bulunamadı.');
      }
      const task = taskRes.rows[0];
      const currentStatus = task.delivery_status;

      const allowed = ALLOWED_DELIVERY_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(newStatus) && currentStatus !== newStatus) {
        throw new Error(`Geçersiz teslimat durum geçişi: "${currentStatus}" → "${newStatus}"`);
      }

      await client.query(
        `UPDATE delivery_tasks
         SET delivery_status = $1,
             delivery_personnel = COALESCE($2, delivery_personnel),
             failed_reason = COALESCE($3, failed_reason),
             delivered_at = CASE WHEN $1 = 'delivered' THEN NOW() ELSE delivered_at END,
             updated_at = NOW()
         WHERE id = $4`,
        [newStatus, personnel || null, reason || null, taskId]
      );

      await client.query('COMMIT');
      return { success: true, taskId, newStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
