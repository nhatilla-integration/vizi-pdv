export type Papel = 'gestor' | 'funcionario' | 'dono'

export const CATEGORIAS = ['Vestuário', 'Souvenir', 'Doces', 'Bebidas'] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const TAMANHOS = ['PP', 'P', 'M', 'G', 'XG', 'XXG', 'XXXG'] as const
export type Tamanho = (typeof TAMANHOS)[number]

export interface Profile {
  id: string
  nome: string
  papel: Papel
}

export interface Produto {
  id: string
  nome: string
  categoria: Categoria
  tamanho: Tamanho | null
  preco: number
  estoque_minimo: number
  ativo: boolean
  nf: string | null
  criado_em: string
}

export type TipoMovimento = 'entrada' | 'venda' | 'ajuste' | 'cancelamento'

export interface MovimentoEstoque {
  id: string
  produto_id: string
  tipo: TipoMovimento
  quantidade: number
  usuario_id: string
  motivo: string | null
  nf: string | null
  criado_em: string
}

export type StatusTurno = 'aberto' | 'fechado'

export interface Turno {
  id: string
  funcionario_id: string
  aberto_em: string
  fechado_em: string | null
  valor_inicial: number
  valor_contado: number | null
  status: StatusTurno
}

export type FormaPagamento = 'numerario' | 'carteira_movel' | 'cartao'
export type StatusVenda = 'concluida' | 'cancelada'

export interface Venda {
  id: string
  turno_id: string
  funcionario_id: string
  total: number
  forma_pagamento: FormaPagamento
  status: StatusVenda
  cancelada_por: string | null
  motivo_cancelamento: string | null
  criado_em: string
}

export interface ItemVenda {
  id: string
  venda_id: string
  produto_id: string
  quantidade: number
  preco_unitario: number
}

export interface RegistroAuditoria {
  id: string
  usuario_id: string | null
  acao: string
  tabela: string
  registro_id: string | null
  dados_antes: Record<string, unknown> | null
  dados_depois: Record<string, unknown> | null
  motivo: string | null
  criado_em: string
}

export interface Configuracao {
  id: number
  modo_demo: boolean
  expira_em: string
}

export interface EstoqueProduto {
  produto_id: string
  quantidade: number
}

export interface FechamentoTurno {
  valor_inicial: number
  esperado_numerario: number
  esperado_cartao: number
  esperado_carteira_movel: number
  valor_contado: number
  diferenca: number
}

export interface ItemCarrinho {
  produto_id: string
  quantidade: number
}
