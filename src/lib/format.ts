export function formatMT(value: number): string {
  return `${value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT`
}
