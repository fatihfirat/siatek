/**
 * Notification Repository (Faz 3D.1)
 */
export class NotificationRepository {
  constructor(private pool: any) {}

  async findByUserId(userId: string, isAdmin = false) {
    if (isAdmin) {
      const res = await this.pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
      return res.rows;
    }
    const res = await this.pool.query(
      'SELECT * FROM notifications WHERE recipient_user_id = $1 OR target_role = \'all\' ORDER BY created_at DESC',
      [userId]
    );
    return res.rows;
  }

  async markAsRead(id: string, userId: string) {
    await this.pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND (recipient_user_id = $2 OR target_role = \'all\')',
      [id, userId]
    );
  }
}
