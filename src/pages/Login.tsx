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
