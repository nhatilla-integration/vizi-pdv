import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Login from './pages/Login'
import Expirado from './pages/Expirado'
import GestorHome from './pages/GestorHome'
import FuncionarioHome from './pages/FuncionarioHome'
import DonoHome from './pages/DonoHome'

function Carregando() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
      <p className="text-slate-400 text-sm">Carregando...</p>
    </div>
  )
}

function Conteudo() {
  const { loading, session, profile, sistemaAtivo } = useAuth()

  if (loading) return <Carregando />
  if (!session) return <Login />
  if (!sistemaAtivo) return <Expirado />

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] px-4">
        <p className="text-sm text-slate-500 text-center max-w-sm">
          Essa conta não tem um perfil cadastrado. Peça pro administrador adicionar uma linha
          em <code className="bg-slate-100 px-1 rounded">profiles</code> com o seu papel.
        </p>
      </div>
    )
  }

  if (profile.papel === 'gestor') return <GestorHome />
  if (profile.papel === 'funcionario') return <FuncionarioHome />
  return <DonoHome />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Conteudo />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
