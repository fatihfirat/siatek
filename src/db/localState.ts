import fs from 'node:fs';
import path from 'node:path';

export function localStatePath(): string | null {
  if (process.env.NODE_ENV === 'test' && !process.env.LOCAL_STATE_FILE) return null;
  if (process.env.LOCAL_STATE_FILE) return path.resolve(process.env.LOCAL_STATE_FILE);
  return process.env.USE_IN_MEMORY_FALLBACK === 'true'
    ? path.resolve('.local-data/state.json')
    : null;
}

export function readLocalState<T>(file: string | null): T | null {
  if (!file || !fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { version?: number };
  if (parsed.version !== 1) throw new Error('Yerel durum dosyası sürümü geçersiz.');
  return parsed as T;
}

export function writeLocalState(file: string | null, state: unknown): void {
  if (!file) return;
  const directory = path.dirname(file);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temporary, file);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
