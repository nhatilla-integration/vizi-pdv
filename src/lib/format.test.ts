import { describe, expect, it } from 'vitest'
import { formatMT } from './format'

describe('formatMT', () => {
  it('formata um valor inteiro com duas casas decimais e o sufixo MT', () => {
    expect(formatMT(450)).toBe('450,00 MT')
  })

  it('formata um valor com casas decimais arredondando pra duas', () => {
    expect(formatMT(70.5)).toBe('70,50 MT')
  })

  it('formata zero corretamente', () => {
    expect(formatMT(0)).toBe('0,00 MT')
  })

  it('formata valores negativos (usado na diferença do fechamento de caixa)', () => {
    expect(formatMT(-25)).toBe('-25,00 MT')
  })
})
