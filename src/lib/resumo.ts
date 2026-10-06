import type { FormaPagamento } from './types'

export interface VendaResumo {
  total: number
  forma_pagamento: FormaPagamento
  status: 'concluida' | 'cancelada'
  funcionario_id: string
  nomeFuncionario: string
}

export interface ItemResumo {
  produto_id: string
  quantidade: number
  preco_unitario: number
  nomeProduto: string
}

export function intervaloDoDia(dataISO: string): { inicio: Date; fim: Date } {
  const inicio = new Date(`${dataISO}T00:00:00`)
  const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)
  return { inicio, fim }
}

export function hojeISO(agora = new Date()): string {
  const offset = agora.getTimezoneOffset()
  return new Date(agora.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export function totalVendido(vendas: VendaResumo[]): number {
  return vendas.filter((v) => v.status === 'concluida').reduce((soma, v) => soma + v.total, 0)
}

export function agregarPorForma(vendas: VendaResumo[]): Record<FormaPagamento, number> {
  const porForma: Record<FormaPagamento, number> = { numerario: 0, carteira_movel: 0, cartao: 0 }
  for (const v of vendas) {
    if (v.status === 'concluida') porForma[v.forma_pagamento] += v.total
  }
  return porForma
}

export function agregarPorFuncionario(
  vendas: VendaResumo[]
): { funcionario_id: string; nome: string; total: number; qtd: number }[] {
  const mapa = new Map<string, { nome: string; total: number; qtd: number }>()
  for (const v of vendas) {
    if (v.status !== 'concluida') continue
    const atual = mapa.get(v.funcionario_id) ?? { nome: v.nomeFuncionario, total: 0, qtd: 0 }
    atual.total += v.total
    atual.qtd += 1
    mapa.set(v.funcionario_id, atual)
  }
  return Array.from(mapa.entries())
    .map(([funcionario_id, dados]) => ({ funcionario_id, ...dados }))
    .sort((a, b) => b.total - a.total)
}

export function agregarPorProduto(
  itens: ItemResumo[],
  limite = 5
): { produto_id: string; nome: string; quantidade: number; valor: number }[] {
  const mapa = new Map<string, { nome: string; quantidade: number; valor: number }>()
  for (const item of itens) {
    const atual = mapa.get(item.produto_id) ?? { nome: item.nomeProduto, quantidade: 0, valor: 0 }
    atual.quantidade += item.quantidade
    atual.valor += item.quantidade * item.preco_unitario
    mapa.set(item.produto_id, atual)
  }
  return Array.from(mapa.entries())
    .map(([produto_id, dados]) => ({ produto_id, ...dados }))
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, limite)
}
