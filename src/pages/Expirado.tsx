import { useAuth } from '../lib/AuthContext'

export default function Expirado() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Período de demonstração encerrado</h1>
        <p className="text-sm text-slate-500 mb-6">Entre em contato para continuar usando o Vizi Vendas.</p>
        <button
          onClick={() => signOut()}
          className="text-sm font-medium text-slate-500 hover:text-brand-blue-dark"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
