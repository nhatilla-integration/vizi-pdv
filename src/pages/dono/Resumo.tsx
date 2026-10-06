import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatMT } from '../../lib/format'
import type { FormaPagamento, Profile } from '../../lib/types'

interface VendaDoDia {
  id: string
  total: number
  forma_pagamento: FormaPagamento
  status: 'concluida' | 'cancelada'
  funcionario_id: string
  profiles: Pick<Profile, 'nome'> | null
}

interface ItemDoDia {
  quantidade: number
  preco_unitario: number
  produto_id: string
  produtos: { nome: string } | null
}

const FORMAS: { id: FormaPagamento; label: string }[] = [
  { id: 'numerario', label: 'Numerário' },
  { id: 'carteira_movel', label: 'Carteira móvel' },
  { id: 'cartao', label: 'Cartão' },
]

function hojeISO(): string {
  const agora = new Date()
  const offset = agora.getTimezoneOffset()
  return new Date(agora.getTime() - offset * 60000).toISOString().slice(0, 10)
}

export default function Resumo() {
  const [data, setData] = useState(hojeISO())
  const [vendas, setVendas] = useState<VendaDoDia[]>([])
  const [itens, setItens] = useState<ItemDoDia[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (dataSelecionada: string) => {
    setLoading(true)
    setErro('')

    const inicio = new Date(`${dataSelecionada}T00:00:00`)
    const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)

    const [resVendas, resItens] = await Promise.all([
      supabase
        .from('vendas')
        .select('id, total, forma_pagamento, status, funcionario_id, profiles!funcionario_id(nome)')
        .gte('criado_em', inicio.toISOString())
        .lt('criado_em', fim.toISOString())
        .order('criado_em', { ascending: false }),
      supabase
        .from('itens_venda')
        .select('quantidade, preco_unitario, produto_id, produtos(nome), vendas!inner(criado_em, status)')
        .gte('vendas.criado_em', inicio.toISOString())
        .lt('vendas.criado_em', fim.toISOString())
        .eq('vendas.status', 'concluida'),
    ])

    if (resVendas.error) {
      setErro(resVendas.error.message)
      setLoading(false)
      return
    }
    if (resItens.error) {
      setErro(resItens.error.message)
      setLoading(false)
      return
    }

    setVendas((resVendas.data ?? []) as unknown as VendaDoDia[])
    setItens((resItens.data ?? []) as unknown as ItemDoDia[])
    setLoading(false)
  }, [])

  useEffect(() => {
    carregar(data)
  }, [data, carregar])

  const concluidas = vendas.filter((v) => v.status === 'concluida')
  const canceladas = vendas.filter((v) => v.status === 'cancelada')
  const totalGeral = concluidas.reduce((soma, v) => soma + v.total, 0)

  const porForma: Record<FormaPagamento, number> = { numerario: 0, carteira_movel: 0, cartao: 0 }
  for (const v of concluidas) porForma[v.forma_pagamento] += v.total

  const porFuncionario = new Map<string, { nome: string; total: number; qtd: number }>()
  for (const v of concluidas) {
    const atual = porFuncionario.get(v.funcionario_id) ?? { nome: v.profiles?.nome ?? 'Funcionário', total: 0, qtd: 0 }
    atual.total += v.total
    atual.qtd += 1
    porFuncionario.set(v.funcionario_id, atual)
  }

  const porProduto = new Map<string, { nome: string; quantidade: number; valor: number }>()
  for (const item of itens) {
    const atual = porProduto.get(item.produto_id) ?? {
      nome: item.produtos?.nome ?? 'Produto removido',
      quantidade: 0,
      valor: 0,
    }
    atual.quantidade += item.quantidade
    atual.valor += item.quantidade * item.preco_unitario
    porProduto.set(item.produto_id, atual)
  }
  const maisVendidos = Array.from(porProduto.values())
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5)

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-900">Resumo do dia</h1>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-blue"
        />
      </div>

      {erro && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{erro}</p>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Total vendido</p>
              <p className="text-2xl font-bold text-slate-900">{formatMT(totalGeral)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Vendas concluídas</p>
              <p className="text-2xl font-bold text-slate-900">{concluidas.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Vendas canceladas</p>
              <p className="text-2xl font-bold text-slate-900">{canceladas.length}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Por forma de pagamento</h2>
            {totalGeral === 0 ? (
              <p className="text-xs text-slate-400 italic">Sem vendas concluídas nesse dia.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {FORMAS.map((forma) => (
                  <div key={forma.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{forma.label}</span>
                    <span className="font-medium text-slate-800">{formatMT(porForma[forma.id])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Por funcionário</h2>
            {porFuncionario.size === 0 ? (
              <p className="text-xs text-slate-400 italic">Sem vendas concluídas nesse dia.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Array.from(porFuncionario.values())
                  .sort((a, b) => b.total - a.total)
                  .map((f) => (
                    <div key={f.nome} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {f.nome} <span className="text-slate-400">({f.qtd} venda{f.qtd === 1 ? '' : 's'})</span>
                      </span>
                      <span className="font-medium text-slate-800">{formatMT(f.total)}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Mais vendidos</h2>
            {maisVendidos.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sem vendas concluídas nesse dia.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {maisVendidos.map((p) => (
                  <div key={p.nome} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{p.quantidade}x {p.nome}</span>
                    <span className="font-medium text-slate-800">{formatMT(p.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
