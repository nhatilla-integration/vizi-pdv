export interface DiffCampo {
  campo: string
  antes: unknown
  depois: unknown
}

export function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

export function diffCampos(
  antes: Record<string, unknown> | null,
  depois: Record<string, unknown> | null
): DiffCampo[] {
  const chaves = new Set([...(antes ? Object.keys(antes) : []), ...(depois ? Object.keys(depois) : [])])
  const linhas: DiffCampo[] = []
  for (const chave of chaves) {
    const valorAntes = antes ? antes[chave] : undefined
    const valorDepois = depois ? depois[chave] : undefined
    if (JSON.stringify(valorAntes) !== JSON.stringify(valorDepois)) {
      linhas.push({ campo: chave, antes: valorAntes, depois: valorDepois })
    }
  }
  return linhas
}
