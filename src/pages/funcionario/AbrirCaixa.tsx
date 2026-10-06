import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

export default function AbrirCaixa({ onAberto }: { onAberto: () => void }) {
  const [valorInicial, setValorInicial] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    const { error } = await supabase.rpc('abrir_turno', {
      p_valor_inicial: Math.max(0, Number(valorInicial) || 0),
    })

    setEnviando(false)

    if (error) {
      setErro(error.message)
    } else {
      onAberto()
    }
  }

  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-1">Abrir caixa</h1>
        <p className="text-sm text-slate-500 mb-6">Informe o valor em numerário que está começando no caixa.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Valor inicial (MT)</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-lg text-slate-900 focus:outline-none focus:border-brand-blue"
              autoFocus
            />
          </div>

          {erro && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-2 bg-brand-orange hover:bg-brand-orange-dark transition-colors text-white text-base font-semibold rounded-lg py-3.5 disabled:opacity-60"
          >
            {enviando ? 'Abrindo...' : 'Abrir caixa'}
          </button>
        </form>
      </div>
    </div>
  )
}
