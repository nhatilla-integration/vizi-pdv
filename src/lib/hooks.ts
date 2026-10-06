import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useAuth } from './AuthContext'
import type { Produto, Turno } from './types'

export function useProdutos(incluirInativos = false) {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProdutos = useCallback(async () => {
    let query = supabase.from('produtos').select('*').order('categoria').order('nome')
    if (!incluirInativos) {
      query = query.eq('ativo', true)
    }
    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar produtos:', error.message)
    } else {
      setProdutos((data ?? []) as Produto[])
    }
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incluirInativos])

  useEffect(() => {
    fetchProdutos()

    const channel = supabase
      .channel('produtos-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos' }, fetchProdutos)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchProdutos])

  return { produtos, loading, refetch: fetchProdutos }
}

export function useEstoque() {
  const [estoque, setEstoque] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchEstoque = useCallback(async () => {
    const { data, error } = await supabase.rpc('estoque_produtos')

    if (error) {
      console.error('Erro ao buscar estoque:', error.message)
    } else {
      const mapa: Record<string, number> = {}
      for (const linha of data ?? []) {
        mapa[linha.produto_id] = Number(linha.quantidade)
      }
      setEstoque(mapa)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEstoque()

    const channel = supabase
      .channel('estoque-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimentos_estoque' }, fetchEstoque)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchEstoque])

  return { estoque, loading, refetch: fetchEstoque }
}

export function useTurnoAberto() {
  const { session } = useAuth()
  const [turno, setTurno] = useState<Turno | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTurno = useCallback(async () => {
    if (!session) {
      setTurno(null)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .eq('funcionario_id', session.user.id)
      .eq('status', 'aberto')
      .order('aberto_em', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar turno:', error.message)
    } else {
      setTurno((data as Turno | null) ?? null)
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    fetchTurno()
  }, [fetchTurno])

  return { turno, loading, refetch: fetchTurno }
}
