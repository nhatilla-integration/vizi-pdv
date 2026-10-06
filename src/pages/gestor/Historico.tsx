import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { TipoMovimento } from '../../lib/types'

interface MovimentoComDetalhes {
  id: string
  tipo: TipoMovimento
  quantidade: number
  motivo: string | null
  nf: string | null
  criado_em: string
  produtos: { nome: string; tamanho: string | null } | null
  profiles: { nome: string } | null
}

const TIPO_LABEL: Record<string, string> = {
  entrada: 'Entrada',
  ajuste: 'Ajuste',
  cancelamento: 'Devolução (cancelamento)',
}

export default function Historico() {
  const [movimentos, setMovimentos] = useState<MovimentoComDetalhes[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase
        .from('movimentos_estoque')
        .select('id, tipo, quantidade, motivo, nf, criado_em, produtos(nome, tamanho), profiles(nome)')
        .in('tipo', ['entrada', 'ajuste', 'cancelamento'])
        .order('criado_em', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Erro ao buscar histórico:', error.message)
      } else {
        setMovimentos((data ?? []) as unknown as MovimentoComDetalhes[])
      }
      setLoading(false)
    }
    carregar()
  }, [])

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Histórico de estoque</h1>
      <p className="text-sm text-slate-500 mb-4">Entradas, ajustes e devoluções por cancelamento, mais recentes primeiro.</p>

      {loading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : movimentos.length === 0 ? (
        <p className="text-slate-400 text-sm italic">Nenhuma movimentação registrada ainda.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Data/hora</th>
                <th className="text-left px-4 py-3">Produto</th>
                <th className="text-left px-4 py-3">Tipo</th>
                <th className="text-right px-4 py-3">Qtd.</th>
                <th className="text-left px-4 py-3">Motivo</th>
                <th className="text-left px-4 py-3">NF</th>
                <th className="text-left px-4 py-3">Quem</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.map((mov) => (
                <tr key={mov.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(mov.criado_em).toLocaleString('pt-PT', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {mov.produtos?.nome ?? '—'}
                    {mov.produtos?.tamanho && (
                      <span className="ml-1 text-xs font-normal text-slate-400">({mov.produtos.tamanho})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        mov.tipo === 'entrada'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : mov.tipo === 'cancelamento'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {TIPO_LABEL[mov.tipo]}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      mov.quantidade < 0 ? 'text-red-600' : 'text-slate-700'
                    }`}
                  >
                    {mov.quantidade > 0 ? '+' : ''}
                    {mov.quantidade}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{mov.motivo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{mov.nf ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{mov.profiles?.nome ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
