import { useState } from 'react'
import { useProdutos, useEstoque } from '../../lib/hooks'
import { supabase } from '../../lib/supabase'
import { formatMT } from '../../lib/format'
import type { Produto } from '../../lib/types'
import ProdutoFormModal from './ProdutoFormModal'

export default function Produtos() {
  const { produtos, loading, refetch } = useProdutos(true)
  const { estoque } = useEstoque()
  const [formState, setFormState] = useState<{ open: boolean; produto: Produto | null }>({
    open: false,
    produto: null,
  })

  async function alternarAtivo(produto: Produto) {
    const { error } = await supabase.from('produtos').update({ ativo: !produto.ativo }).eq('id', produto.id)
    if (error) {
      alert(error.message)
    } else {
      refetch()
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Produtos</h1>
        <button
          onClick={() => setFormState({ open: true, produto: null })}
          className="bg-brand-orange hover:bg-brand-orange-dark transition-colors text-white text-sm font-semibold rounded-lg px-4 py-2"
        >
          + Novo produto
        </button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Produto</th>
                <th className="text-left px-4 py-3">Categoria</th>
                <th className="text-right px-4 py-3">Preço</th>
                <th className="text-right px-4 py-3">Estoque</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => {
                const saldo = estoque[produto.id] ?? 0
                const abaixoMinimo = saldo <= produto.estoque_minimo
                return (
                  <tr key={produto.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {produto.nome}
                      {produto.tamanho && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">({produto.tamanho})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{produto.categoria}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatMT(produto.preco)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${abaixoMinimo ? 'text-red-600' : 'text-slate-700'}`}>
                      {saldo}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          produto.ativo
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {produto.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setFormState({ open: true, produto })}
                          className="text-xs font-medium text-brand-blue hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => alternarAtivo(produto)}
                          className="text-xs font-medium text-slate-500 hover:underline"
                        >
                          {produto.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {formState.open && (
        <ProdutoFormModal
          produto={formState.produto}
          onClose={() => setFormState({ open: false, produto: null })}
          onSalvo={refetch}
        />
      )}
    </div>
  )
}
