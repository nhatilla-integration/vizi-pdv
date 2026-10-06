import type { ReactNode } from 'react'
import { useAuth } from '../lib/AuthContext'

const NOME_PAPEL: Record<string, string> = {
  gestor: 'Gestor(a)',
  funcionario: 'Funcionário(a)',
  dono: 'Dono(a)',
}

function formatarDataMaputo(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Africa/Maputo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default function Layout({ children }: { children: ReactNode }) {
  const { profile, configuracao, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {configuracao?.modo_demo && (
        <div className="bg-amber-400 text-amber-950 text-center text-xs font-semibold py-1.5 px-4">
          DEMONSTRAÇÃO — válido até {formatarDataMaputo(configuracao.expira_em)} (hora de Maputo)
        </div>
      )}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center shrink-0">
              <svg viewBox="0 0 32 32" className="w-[60%] h-[60%]" fill="none">
                <path
                  d="M9 11h14l-1.3 10.5a2 2 0 0 1-2 1.5H12.3a2 2 0 0 1-2-1.5L9 11z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M12.5 11v-1a3.5 3.5 0 0 1 7 0v1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-bold text-brand-blue-dark tracking-tight">Vizi Vendas</span>
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
