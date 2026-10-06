import { useState } from 'react'
import Layout from '../components/Layout'
import { useProdutos, useEstoque } from '../lib/hooks'
import Produtos from './gestor/Produtos'
import Estoque from './gestor/Estoque'
import Historico from './gestor/Historico'
import Cancelamentos from './gestor/Cancelamentos'

type Aba = 'produtos' | 'estoque' | 'historico' | 'cancelamentos'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'historico', label: 'Histórico' },
  { id: 'cancelamentos', label: 'Cancelamentos' },
]

export default function GestorHome() {
  const [aba, setAba] = useState<Aba>('produtos')
  const { produtos } = useProdutos()
  const { estoque } = useEstoque()

  const estoqueBaixo = produtos.filter((p) => (estoque[p.id] ?? 0) <= p.estoque_minimo)

  return (
    <Layout>
      {estoqueBaixo.length > 0 && (
        <button
          onClick={() => setAba('produtos')}
          className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-4 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <span className="font-semibold">
            {estoqueBaixo.length} produto{estoqueBaixo.length === 1 ? '' : 's'} com estoque baixo:
          </span>{' '}
          {estoqueBaixo.map((p) => p.nome + (p.tamanho ? ` (${p.tamanho})` : '')).join(', ')}
        </button>
      )}

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {ABAS.map((item) => (
          <button
            key={item.id}
            onClick={() => setAba(item.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              aba === item.id
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {aba === 'produtos' && <Produtos />}
      {aba === 'estoque' && <Estoque />}
      {aba === 'historico' && <Historico />}
      {aba === 'cancelamentos' && <Cancelamentos />}
    </Layout>
  )
}
