// Uygulama durumunu (users/products/orders/quotes/...) tek bir jsonb satırında kalıcı tutar.
// Render'ın geçici dosya sistemi yeniden başlatmada silindiği için DATABASE_URL varsa
// dosya yerine Postgres esas alınır.
type PgPool = { query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }> };

const STATE_KEY = 'app_state_v1';

export async function ensureStateTable(pool: PgPool): Promise<void> {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS app_state (
       key text PRIMARY KEY,
       value jsonb NOT NULL,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`
  );
}

export async function readPgState<T>(pool: PgPool): Promise<T | null> {
  const { rows } = await pool.query('SELECT value FROM app_state WHERE key = $1', [STATE_KEY]);
  return rows.length ? (rows[0].value as T) : null;
}

export async function writePgState(pool: PgPool, state: unknown): Promise<void> {
  await pool.query(
    `INSERT INTO app_state (key, value, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [STATE_KEY, JSON.stringify(state)]
  );
}

// Yazımları sıraya alır: aynı anda yalnızca biri çalışır, bekleyenler tek son görüntüye birleşir.
export function createSerializedWriter(write: () => Promise<void>, onError: (e: unknown) => void) {
  let running = false;
  let dirty = false;
  const run = async () => {
    if (running) { dirty = true; return; }
    running = true;
    try {
      do {
        dirty = false;
        await write();
      } while (dirty);
    } catch (e) {
      onError(e);
    } finally {
      running = false;
    }
  };
  return run;
}
