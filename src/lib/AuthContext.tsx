import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Configuracao, Profile } from './types'

interface AuthState {
  loading: boolean
  session: Session | null
  profile: Profile | null
  sistemaAtivo: boolean
  configuracao: Configuracao | null
  signIn: (email: string, senha: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sistemaAtivo, setSistemaAtivo] = useState(false)
  const [configuracao, setConfiguracao] = useState<Configuracao | null>(null)

  async function carregarContexto(currentSession: Session | null) {
    setSession(currentSession)

    if (!currentSession) {
      setProfile(null)
      setSistemaAtivo(false)
      setConfiguracao(null)
      setLoading(false)
      return
    }

    const [{ data: profileData }, { data: ativo }, { data: configData, error: erroConfig }] = await Promise.all([
      supabase.from('profiles').select('id, nome, papel').eq('id', currentSession.user.id).single(),
      supabase.rpc('sistema_ativo'),
      supabase.from('configuracao').select('id, modo_demo, expira_em').eq('id', 1).single(),
    ])

    if (erroConfig) console.error('Erro ao buscar configuracao:', erroConfig.message)

    setProfile((profileData as Profile) ?? null)
    setSistemaAtivo(Boolean(ativo))
    setConfiguracao((configData as Configuracao) ?? null)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      carregarContexto(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setLoading(true)
      carregarContexto(newSession)
    })

    return () => listener.subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // sistema_ativo() só era checado no login — uma sessão aberta durante o
  // momento em que o período de demonstração expira não percebia isso
  // sozinha. Reverifica periodicamente e quando a aba volta a ficar visível.
  useEffect(() => {
    if (!session) return

    async function revalidar() {
      const [{ data: ativo }, { data: configData }] = await Promise.all([
        supabase.rpc('sistema_ativo'),
        supabase.from('configuracao').select('id, modo_demo, expira_em').eq('id', 1).single(),
      ])
      setSistemaAtivo(Boolean(ativo))
      setConfiguracao((configData as Configuracao) ?? null)
    }

    const intervalo = setInterval(revalidar, 5 * 60 * 1000)

    function aoFocar() {
      if (document.visibilityState === 'visible') revalidar()
    }
    document.addEventListener('visibilitychange', aoFocar)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoFocar)
    }
  }, [session])

  async function signIn(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ loading, session, profile, sistemaAtivo, configuracao, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
