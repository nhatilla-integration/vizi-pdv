import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatMT } from '../../lib/format'
import {
  agregarPorForma,
  agregarPorFuncionario,
  agregarPorProduto,
  hojeISO,
  intervaloDoDia,
  totalVendido,
  type ItemResumo,
  type VendaResumo,
} from '../../lib/resumo'
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

export default function Resumo() {
  const [data, setData] = useState(hojeISO())
  const [vendas, setVendas] = useState<VendaDoDia[]>([])
  const [itens, setItens] = useState<ItemDoDia[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async (dataSelecionada: string) => {
    setLoading(true)
    setErro('')

    const { inicio, fim } = intervaloDoDia(dataSelecionada)

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

  const vendasResumo: VendaResumo[] = vendas.map((v) => ({
    total: v.total,
    forma_pagamento: v.forma_pagamento,
    status: v.status,
    funcionario_id: v.funcionario_id,
    nomeFuncionario: v.profiles?.nome ?? 'Funcionário',
  }))

  const itensResumo: ItemResumo[] = itens.map((i) => ({
    produto_id: i.produto_id,
    quantidade: i.quantidade,
    preco_unitario: i.preco_unitario,
    nomeProduto: i.produtos?.nome ?? 'Produto removido',
  }))

  const concluidas = vendasResumo.filter((v) => v.status === 'concluida')
  const canceladas = vendasResumo.filter((v) => v.status === 'cancelada')
  const totalGeral = totalVendido(vendasResumo)
  const porForma = agregarPorForma(vendasResumo)
  const porFuncionario = agregarPorFuncionario(vendasResumo)
  const maisVendidos = agregarPorProduto(itensResumo, 5)

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
            {porFuncionario.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sem vendas concluídas nesse dia.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {porFuncionario.map((f) => (
                  <div key={f.funcionario_id} className="flex items-center justify-between text-sm">
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
                  <div key={p.produto_id} className="flex items-center justify-between text-sm">
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
