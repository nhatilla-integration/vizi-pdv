import { describe, expect, it } from 'vitest'
import { diffCampos, formatarValor } from './auditoria'

describe('formatarValor', () => {
  it('mostra um travessão pra null, undefined e string vazia', () => {
    expect(formatarValor(null)).toBe('—')
    expect(formatarValor(undefined)).toBe('—')
    expect(formatarValor('')).toBe('—')
  })

  it('converte objetos em JSON', () => {
    expect(formatarValor({ a: 1 })).toBe('{"a":1}')
  })

  it('converte primitivos em string', () => {
    expect(formatarValor('concluida')).toBe('concluida')
    expect(formatarValor(42)).toBe('42')
  })
})

describe('diffCampos', () => {
  it('detecta um campo que mudou de valor (ex: cancelamento de venda)', () => {
    const antes = { status: 'concluida', total: 765 }
    const depois = { status: 'cancelada', total: 765 }
    expect(diffCampos(antes, depois)).toEqual([{ campo: 'status', antes: 'concluida', depois: 'cancelada' }])
  })

  it('não reporta campos que não mudaram', () => {
    const antes = { status: 'concluida', total: 765 }
    const depois = { status: 'concluida', total: 765 }
    expect(diffCampos(antes, depois)).toEqual([])
  })

  it('trata inserção (antes nulo) listando todos os campos como novos', () => {
    const depois = { nome: 'Água 500ml', preco: 35 }
    const resultado = diffCampos(null, depois)
    expect(resultado).toHaveLength(2)
    expect(resultado).toContainEqual({ campo: 'nome', antes: undefined, depois: 'Água 500ml' })
  })

  it('detecta campos que aparecem só em um dos lados', () => {
    const antes = { a: 1 }
    const depois = { a: 1, b: 2 }
    expect(diffCampos(antes, depois)).toEqual([{ campo: 'b', antes: undefined, depois: 2 }])
  })
})
