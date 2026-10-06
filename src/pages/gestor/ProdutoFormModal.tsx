import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { CATEGORIAS, TAMANHOS, type Categoria, type Produto, type Tamanho } from '../../lib/types'

export default function ProdutoFormModal({
  produto,
  onClose,
  onSalvo,
}: {
  produto: Produto | null
  onClose: () => void
  onSalvo: () => void
}) {
  const isEditing = Boolean(produto)
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [categoria, setCategoria] = useState<Categoria | ''>(produto?.categoria ?? '')
  const [tamanho, setTamanho] = useState<Tamanho | ''>(produto?.tamanho ?? '')
  const [preco, setPreco] = useState(produto?.preco?.toString() ?? '')
  const [estoqueMinimo, setEstoqueMinimo] = useState(produto?.estoque_minimo?.toString() ?? '0')
  const [nf, setNf] = useState(produto?.nf ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const ehVestuario = categoria === 'Vestuário'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')

    if (!nome.trim() || !categoria) {
      setErro('Nome e categoria são obrigatórios.')
      return
    }

    setSalvando(true)

    const dados = {
      nome: nome.trim(),
      categoria,
      tamanho: ehVestuario && tamanho ? tamanho : null,
      preco: Number(preco) || 0,
      estoque_minimo: Number(estoqueMinimo) || 0,
      nf: nf.trim() || null,
    }

    const { error } = isEditing
      ? await supabase.from('produtos').update(dados).eq('id', produto!.id)
      : await supabase.from('produtos').insert([dados])

    setSalvando(false)

    if (error) {
      setErro(error.message)
      return
    }

    onSalvo()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Editar produto' : 'Novo produto'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => {
                  const novaCategoria = e.target.value as Categoria
                  setCategoria(novaCategoria)
                  if (novaCategoria !== 'Vestuário') setTamanho('')
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
              >
                <option value="">Selecione...</option>
                {CATEGORIAS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {ehVestuario && (
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Tamanho</label>
                <select
                  value={tamanho}
                  onChange={(e) => setTamanho(e.target.value as Tamanho)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
                >
                  <option value="">Selecione...</option>
                  {TAMANHOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Preço (MT)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Estoque mínimo</label>
              <input
                type="number"
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">NF de origem (opcional)</label>
            <input
              type="text"
              value={nf}
              onChange={(e) => setNf(e.target.value)}
              placeholder="Ex: NF 1234 - Fornecedor ABC"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>

          {erro && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="mt-2 bg-brand-orange hover:bg-brand-orange-dark transition-colors text-white text-sm font-semibold rounded-lg py-2.5 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Adicionar produto'}
          </button>
        </form>
      </div>
    </div>
  )
}
