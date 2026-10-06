import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatMT } from '../../lib/format'
import type { FechamentoTurno, Turno } from '../../lib/types'

export default function FecharCaixa({
  turno,
  onFechado,
  onCancelar,
}: {
  turno: Turno
  onFechado: () => void
  onCancelar: () => void
}) {
  const [esperadoNumerario, setEsperadoNumerario] = useState(0)
  const [esperadoCartao, setEsperadoCartao] = useState(0)
  const [esperadoCarteira, setEsperadoCarteira] = useState(0)
  const [carregandoResumo, setCarregandoResumo] = useState(true)

  const [valorContado, setValorContado] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<FechamentoTurno | null>(null)

  useEffect(() => {
    async function carregarResumo() {
      const { data, error } = await supabase
        .from('vendas')
        .select('total, forma_pagamento')
        .eq('turno_id', turno.id)
        .eq('status', 'concluida')

      if (!error && data) {
        setEsperadoNumerario(
          data.filter((v) => v.forma_pagamento === 'numerario').reduce((s, v) => s + Number(v.total), 0)
        )
        setEsperadoCartao(
          data.filter((v) => v.forma_pagamento === 'cartao').reduce((s, v) => s + Number(v.total), 0)
        )
        setEsperadoCarteira(
          data.filter((v) => v.forma_pagamento === 'carteira_movel').reduce((s, v) => s + Number(v.total), 0)
        )
      }
      setCarregandoResumo(false)
    }
    carregarResumo()
  }, [turno.id])

  async function handleFechar() {
    setErro('')
    setEnviando(true)

    const { data, error } = await supabase.rpc('fechar_turno', {
      p_turno_id: turno.id,
      p_valor_contado: Math.max(0, Number(valorContado) || 0),
    })

    setEnviando(false)

    if (error) {
      setErro(error.message)
      return
    }

    setResultado(data as FechamentoTurno)
  }

  if (resultado) {
    const diferencaZero = Math.abs(resultado.diferenca) < 0.01
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900 mb-4">Caixa fechado</h1>

          <div className="flex flex-col gap-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Esperado em numerário</span>
              <span className="font-medium text-slate-800">{formatMT(resultado.esperado_numerario)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contado</span>
              <span className="font-medium text-slate-800">{formatMT(resultado.valor_contado)}</span>
            </div>
          </div>

          <div
            className={`rounded-lg px-4 py-3 mb-6 ${
              diferencaZero ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Diferença</p>
            <p className={`text-lg font-bold ${diferencaZero ? 'text-green-700' : 'text-amber-700'}`}>
              {resultado.diferenca > 0 ? '+' : ''}
              {formatMT(resultado.diferenca)}
            </p>
          </div>

          <button
            onClick={onFechado}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark transition-colors text-white font-semibold rounded-lg py-3"
          >
            Entendi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Fechar caixa</h1>
        <p className="text-sm text-slate-500 mb-6">Confira o esperado e informe o valor contado em numerário.</p>

        {carregandoResumo ? (
          <p className="text-sm text-slate-400 mb-4">Calculando...</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm mb-5 bg-slate-50 rounded-lg p-4">
            <div className="flex justify-between">
              <span className="text-slate-500">Valor inicial</span>
              <span className="font-medium text-slate-800">{formatMT(turno.valor_inicial)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vendas em numerário</span>
              <span className="font-medium text-slate-800">{formatMT(esperadoNumerario)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vendas em cartão</span>
              <span className="font-medium text-slate-800">{formatMT(esperadoCartao)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vendas em carteira móvel</span>
              <span className="font-medium text-slate-800">{formatMT(esperadoCarteira)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
              <span className="text-slate-700 font-medium">Esperado em numerário no caixa</span>
              <span className="font-bold text-slate-900">{formatMT(turno.valor_inicial + esperadoNumerario)}</span>
            </div>
          </div>
        )}

        <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Valor contado (MT)</label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={valorContado}
          onChange={(e) => setValorContado(e.target.value)}
          placeholder="0.00"
          className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-lg text-slate-900 focus:outline-none focus:border-brand-blue mb-4"
          autoFocus
        />

        {erro && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{erro}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onCancelar}
            className="flex-1 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg py-3"
          >
            Cancelar
          </button>
          <button
            onClick={handleFechar}
            disabled={enviando}
            className="flex-1 bg-brand-orange hover:bg-brand-orange-dark transition-colors text-white text-sm font-semibold rounded-lg py-3 disabled:opacity-60"
          >
            {enviando ? 'Fechando...' : 'Confirmar fechamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
