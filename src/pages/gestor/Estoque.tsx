import { useState, type FormEvent } from 'react'
import { useProdutos, useEstoque } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'

type Operacao = 'entrada' | 'ajuste'

export default function Estoque() {
  const { produtos } = useProdutos(true)
  const { estoque, refetch } = useEstoque()

  const [operacao, setOperacao] = useState<Operacao>('entrada')
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [nf, setNf] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!produtoId) {
      setErro('Escolha um produto.')
      return
    }

    const qtd = Number(quantidade)
    if (!qtd) {
      setErro('Informe uma quantidade diferente de zero.')
      return
    }

    if (!motivo.trim()) {
      setErro('O motivo é obrigatório.')
      return
    }

    setEnviando(true)

    const { error } =
      operacao === 'entrada'
        ? await supabase.rpc('registrar_entrada_estoque', {
            p_produto_id: produtoId,
            p_quantidade: Math.abs(qtd),
            p_motivo: motivo.trim(),
            p_nf: nf.trim() || null,
          })
        : await supabase.rpc('ajustar_estoque', {
            p_produto_id: produtoId,
            p_quantidade: qtd,
            p_motivo: motivo.trim(),
          })

    setEnviando(false)

    if (error) {
      setErro(error.message)
      return
    }

    setSucesso('Movimento registrado com sucesso.')
    setQuantidade('')
    setMotivo('')
    setNf('')
    refetch()
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-slate-900 mb-4">Estoque</h1>

      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => setOperacao('entrada')}
            className={`text-sm font-semibold rounded-lg py-2.5 border ${
              operacao === 'entrada'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            Entrada
          </button>
          <button
            onClick={() => setOperacao('ajuste')}
            className={`text-sm font-semibold rounded-lg py-2.5 border ${
              operacao === 'ajuste'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            Ajuste
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Produto</label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
            >
              <option value="">Selecione...</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.tamanho ? ` (${p.tamanho})` : ''} — {estoque[p.id] ?? 0} em estoque
                  {!p.ativo ? ' (inativo)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">
              Quantidade {operacao === 'ajuste' && '(negativo para reduzir)'}
            </label>
            <input
              type="number"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={operacao === 'entrada' ? 'Ex: Reposição do fornecedor' : 'Ex: Perda, quebra, contagem'}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>

          {operacao === 'entrada' && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">
                NF de origem (opcional)
              </label>
              <input
                type="text"
                value={nf}
                onChange={(e) => setNf(e.target.value)}
                placeholder="Ex: NF 1234 - Fornecedor ABC"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
              />
            </div>
          )}

          {erro && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}
          {sucesso && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {sucesso}
            </p>
          )}

          <button
            type="submit"
            disabled={enviando}
            className="mt-2 bg-brand-orange hover:bg-brand-orange-dark transition-colors text-white text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60"
          >
            {enviando ? 'Registrando...' : operacao === 'entrada' ? 'Registrar entrada' : 'Registrar ajuste'}
          </button>
        </form>
      </div>
    </div>
  )
}
