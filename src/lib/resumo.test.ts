import { describe, expect, it } from 'vitest'
import {
  agregarPorForma,
  agregarPorFuncionario,
  agregarPorProduto,
  intervaloDoDia,
  totalVendido,
  type ItemResumo,
  type VendaResumo,
} from './resumo'

const vendas: VendaResumo[] = [
  { total: 765, forma_pagamento: 'numerario', status: 'concluida', funcionario_id: 'f1', nomeFuncionario: 'Ana' },
  { total: 245, forma_pagamento: 'cartao', status: 'concluida', funcionario_id: 'f1', nomeFuncionario: 'Ana' },
  { total: 210, forma_pagamento: 'cartao', status: 'cancelada', funcionario_id: 'f2', nomeFuncionario: 'Bruno' },
  { total: 100, forma_pagamento: 'carteira_movel', status: 'concluida', funcionario_id: 'f2', nomeFuncionario: 'Bruno' },
]

describe('totalVendido', () => {
  it('soma só as vendas concluídas, ignorando canceladas', () => {
    expect(totalVendido(vendas)).toBe(765 + 245 + 100)
  })

  it('retorna zero para lista vazia', () => {
    expect(totalVendido([])).toBe(0)
  })
})

describe('agregarPorForma', () => {
  it('agrupa o total por forma de pagamento, ignorando vendas canceladas', () => {
    expect(agregarPorForma(vendas)).toEqual({
      numerario: 765,
      cartao: 245,
      carteira_movel: 100,
    })
  })
})

describe('agregarPorFuncionario', () => {
  it('agrupa total e quantidade de vendas por funcionário, ordenado do maior pro menor', () => {
    const resultado = agregarPorFuncionario(vendas)
    expect(resultado).toEqual([
      { funcionario_id: 'f1', nome: 'Ana', total: 1010, qtd: 2 },
      { funcionario_id: 'f2', nome: 'Bruno', total: 100, qtd: 1 },
    ])
  })

  it('não conta a venda cancelada do Bruno na quantidade nem no total', () => {
    const resultado = agregarPorFuncionario(vendas)
    const bruno = resultado.find((f) => f.funcionario_id === 'f2')
    expect(bruno?.qtd).toBe(1)
    expect(bruno?.total).toBe(100)
  })
})

describe('agregarPorProduto', () => {
  const itens: ItemResumo[] = [
    { produto_id: 'p1', quantidade: 14, preco_unitario: 35, nomeProduto: 'Água 500ml' },
    { produto_id: 'p2', quantidade: 4, preco_unitario: 70, nomeProduto: 'Refresco de ananás 300ml' },
    { produto_id: 'p1', quantidade: 2, preco_unitario: 35, nomeProduto: 'Água 500ml' },
  ]

  it('soma quantidade e valor por produto através de vendas separadas', () => {
    const resultado = agregarPorProduto(itens)
    const agua = resultado.find((p) => p.produto_id === 'p1')
    expect(agua).toEqual({ produto_id: 'p1', nome: 'Água 500ml', quantidade: 16, valor: 16 * 35 })
  })

  it('ordena do mais vendido pro menos vendido', () => {
    const resultado = agregarPorProduto(itens)
    expect(resultado[0].produto_id).toBe('p1')
  })

  it('respeita o limite de itens retornados', () => {
    const muitosItens: ItemResumo[] = Array.from({ length: 10 }, (_, i) => ({
      produto_id: `p${i}`,
      quantidade: 10 - i,
      preco_unitario: 10,
      nomeProduto: `Produto ${i}`,
    }))
    expect(agregarPorProduto(muitosItens, 3)).toHaveLength(3)
  })
})

describe('intervaloDoDia', () => {
  it('retorna um intervalo de exatamente 24 horas', () => {
    const { inicio, fim } = intervaloDoDia('2026-10-05')
    expect(fim.getTime() - inicio.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('começa à meia-noite local do dia informado', () => {
    const { inicio } = intervaloDoDia('2026-10-05')
    expect(inicio.getHours()).toBe(0)
    expect(inicio.getMinutes()).toBe(0)
  })
})
