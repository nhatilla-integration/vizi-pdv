import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await signIn(email, senha)
    setEnviando(false)
    if (error) setErro(error)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-[55%] h-[55%]" fill="none">
              <circle cx="10" cy="10" r="6.2" stroke="white" strokeWidth="2.4" />
              <line x1="14.6" y1="14.6" x2="20.5" y2="20.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-lg font-bold text-brand-blue-dark tracking-tight">Vizi Vendas</span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1">Entrar</h1>
        <p className="text-sm text-slate-500 mb-6">Acesse o ponto de venda do quiosque.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-blue"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-blue"
              autoComplete="current-password"
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
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
