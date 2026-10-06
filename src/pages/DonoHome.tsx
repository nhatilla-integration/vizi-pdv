import { useState } from 'react'
import Layout from '../components/Layout'
import Resumo from './dono/Resumo'
import Auditoria from './dono/Auditoria'

type Aba = 'resumo' | 'auditoria'

const ABAS: { id: Aba; label: string }[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'auditoria', label: 'Auditoria' },
]

export default function DonoHome() {
  const [aba, setAba] = useState<Aba>('resumo')

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

      {aba === 'resumo' && <Resumo />}
      {aba === 'auditoria' && <Auditoria />}
    </Layout>
  )
}
