export function formatCurrency(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' }) : '0,00 ₺';
}
