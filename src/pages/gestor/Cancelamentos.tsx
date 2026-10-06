import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatMT } from '../../lib/format'
import type { FormaPagamento, Profile } from '../../lib/types'

interface VendaComFuncionario {
  id: string
  total: number
  forma_pagamento: FormaPagamento
  criado_em: string
  funcionario_id: string
  status: 'concluida' | 'cancelada'
  motivo_cancelamento: string | null
  profiles: Pick<Profile, 'nome'> | null
  cancelador: Pick<Profile, 'nome'> | null
}

interface ItemVenda {
  venda_id: string
  quantidade: number
  preco_unitario: number
  produtos: { nome: string; tamanho: string | null } | null
}

const FORMAS: Record<FormaPagamento, string> = {
  numerario: 'Numerário',
  carteira_movel: 'Carteira móvel',
  cartao: 'Cartão',
}

export default function Cancelamentos() {
  const [vendas, setVendas] = useState<VendaComFuncionario[]>([])
  const [itensPorVenda, setItensPorVenda] = useState<Record<string, ItemVenda[]>>({})
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')
  const [cancelandoId, setCancelandoId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const fetchVendas = useCallback(async () => {
    const { data, error } = await supabase
      .from('vendas')
      .select(
        'id, total, forma_pagamento, criado_em, funcionario_id, status, motivo_cancelamento, profiles!funcionario_id(nome), cancelador:profiles!cancelada_por(nome)'
      )
      .order('criado_em', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar vendas:', error.message)
      setErroCarregamento(error.message)
      setLoading(false)
      return
    }

    setErroCarregamento('')
    const vendasCarregadas = (data ?? []) as unknown as VendaComFuncionario[]
    setVendas(vendasCarregadas)

    const vendaIds = vendasCarregadas.map((v) => v.id)
    if (vendaIds.length > 0) {
      const { data: itens, error: erroItens } = await supabase
        .from('itens_venda')
        .select('venda_id, quantidade, preco_unitario, produtos(nome, tamanho)')
        .in('venda_id', vendaIds)

      if (erroItens) {
        console.error('Erro ao buscar itens das vendas:', erroItens.message)
      } else {
        const agrupado: Record<string, ItemVenda[]> = {}
        for (const item of (itens ?? []) as unknown as ItemVenda[]) {
          if (!agrupado[item.venda_id]) agrupado[item.venda_id] = []
          agrupado[item.venda_id].push(item)
        }
        setItensPorVenda(agrupado)
      }
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVendas()
  }, [fetchVendas])

  function iniciarCancelamento(vendaId: string) {
    setCancelandoId(vendaId)
    setMotivo('')
    setErro('')
  }

  async function confirmarCancelamento(vendaId: string) {
    if (!motivo.trim()) {
      setErro('O motivo é obrigatório.')
      return
    }

    setEnviando(true)
    const { error } = await supabase.rpc('cancelar_venda', {
      p_venda_id: vendaId,
      p_motivo: motivo.trim(),
    })
    setEnviando(false)

    if (error) {
      setErro(error.message)
      return
    }

    setCancelandoId(null)
    fetchVendas()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-4">Cancelamentos</h1>
      <p className="text-sm text-slate-500 mb-4">Vendas recentes. Cancelar devolve os itens ao estoque.</p>

      {erroCarregamento && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
          Erro ao carregar vendas: {erroCarregamento}
        </p>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : vendas.length === 0 ? (
        <p className="text-slate-400 text-sm italic">Nenhuma venda registrada ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {vendas.map((venda) => {
            const cancelada = venda.status === 'cancelada'
            return (
            <div
              key={venda.id}
              className={`bg-white border rounded-xl p-4 ${cancelada ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <span className={cancelada ? 'line-through text-slate-500' : ''}>
                      {formatMT(venda.total)} · {FORMAS[venda.forma_pagamento]}
                    </span>
                    {cancelada && (
                      <span className="text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">
                        Cancelada
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(venda.criado_em).toLocaleString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {venda.profiles?.nome ?? 'Funcionário'}
                  </p>
                  {cancelada && (
                    <p className="text-xs text-red-600 mt-1">
                      Motivo: {venda.motivo_cancelamento ?? '—'}
                      {venda.cancelador?.nome && ` · por ${venda.cancelador.nome}`}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setAbertoId(abertoId === venda.id ? null : venda.id)}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    {abertoId === venda.id ? 'Ocultar itens' : 'Ver itens'}
                  </button>
                  {!cancelada && cancelandoId !== venda.id && (
                    <button
                      onClick={() => iniciarCancelamento(venda.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>

              {abertoId === venda.id && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {(itensPorVenda[venda.id] ?? []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum item encontrado.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {(itensPorVenda[venda.id] ?? []).map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between text-xs text-slate-600">
                          <span>
                            {item.quantidade}x {item.produtos?.nome ?? 'Produto removido'}
                            {item.produtos?.tamanho && ` (${item.produtos.tamanho})`}
                          </span>
                          <span className="text-slate-400">{formatMT(item.preco_unitario * item.quantidade)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {!cancelada && cancelandoId === venda.id && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Motivo do cancelamento"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-brand-blue"
                    autoFocus
                  />
                  {erro && <p className="text-xs text-red-700">{erro}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCancelandoId(null)}
                      className="flex-1 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg py-2"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => confirmarCancelamento(venda.id)}
                      disabled={enviando}
                      className="flex-1 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg py-2 disabled:opacity-60"
                    >
                      {enviando ? 'Cancelando...' : 'Confirmar cancelamento'}
                    </button>
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
