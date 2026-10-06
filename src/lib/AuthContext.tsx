import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'

interface AuthState {
  loading: boolean
  session: Session | null
  profile: Profile | null
  sistemaAtivo: boolean
  signIn: (email: string, senha: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sistemaAtivo, setSistemaAtivo] = useState(false)

  async function carregarContexto(currentSession: Session | null) {
    setSession(currentSession)

    if (!currentSession) {
      setProfile(null)
      setSistemaAtivo(false)
      setLoading(false)
      return
    }

    const [{ data: profileData }, { data: ativo }] = await Promise.all([
      supabase.from('profiles').select('id, nome, papel').eq('id', currentSession.user.id).single(),
      supabase.rpc('sistema_ativo'),
    ])

    setProfile((profileData as Profile) ?? null)
    setSistemaAtivo(Boolean(ativo))
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

  async function signIn(email: string, senha: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ loading, session, profile, sistemaAtivo, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
