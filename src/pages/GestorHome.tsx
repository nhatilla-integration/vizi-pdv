import { useState } from 'react'
import Layout from '../components/Layout'
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

  return (
    <Layout>
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
