import type { ReactNode } from 'react'
import { useAuth } from '../lib/AuthContext'

const NOME_PAPEL: Record<string, string> = {
  gestor: 'Gestor',
  funcionario: 'Funcionário',
  dono: 'Dono',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-[55%] h-[55%]" fill="none">
                <circle cx="10" cy="10" r="6.2" stroke="white" strokeWidth="2.4" />
                <line x1="14.6" y1="14.6" x2="20.5" y2="20.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-brand-blue-dark tracking-tight">Vizi PDV</span>
          </div>

          <div className="flex items-center gap-4">
            {profile && (
              <span className="text-sm text-slate-500">
                {profile.nome} · <span className="font-medium text-slate-700">{NOME_PAPEL[profile.papel]}</span>
              </span>
            )}
            <button onClick={() => signOut()} className="text-sm font-medium text-slate-500 hover:text-brand-blue-dark">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  )
}
