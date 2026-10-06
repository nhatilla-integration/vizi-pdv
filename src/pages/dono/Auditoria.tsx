import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

interface RegistroComAutor {
  id: string
  usuario_id: string | null
  acao: string
  tabela: string
  registro_id: string | null
  dados_antes: Record<string, unknown> | null
  dados_depois: Record<string, unknown> | null
  motivo: string | null
  criado_em: string
  profiles: Pick<Profile, 'nome'> | null
}

const ACAO_LABEL: Record<string, string> = {
  INSERT: 'Criado',
  UPDATE: 'Atualizado',
  DELETE: 'Removido',
}

const TABELA_LABEL: Record<string, string> = {
  produtos: 'Produto',
  vendas: 'Venda',
  turnos: 'Turno',
  movimentos_estoque: 'Movimento de estoque',
}

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

function diffCampos(antes: Record<string, unknown> | null, depois: Record<string, unknown> | null) {
  const chaves = new Set([...(antes ? Object.keys(antes) : []), ...(depois ? Object.keys(depois) : [])])
  const linhas: { campo: string; antes: unknown; depois: unknown }[] = []
  for (const chave of chaves) {
    const valorAntes = antes ? antes[chave] : undefined
    const valorDepois = depois ? depois[chave] : undefined
    if (JSON.stringify(valorAntes) !== JSON.stringify(valorDepois)) {
      linhas.push({ campo: chave, antes: valorAntes, depois: valorDepois })
    }
  }
  return linhas
}

export default function Auditoria() {
  const [registros, setRegistros] = useState<RegistroComAutor[]>([])
  const [funcionarios, setFuncionarios] = useState<Profile[]>([])
  const [filtroData, setFiltroData] = useState('')
  const [filtroUsuario, setFiltroUsuario] = useState('')
  const [filtroTabela, setFiltroTabela] = useState('')
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nome, papel')
      .order('nome')
      .then(({ data, error }) => {
        if (!error) setFuncionarios((data ?? []) as Profile[])
      })
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro('')

    let query = supabase
      .from('auditoria')
      .select(
        'id, usuario_id, acao, tabela, registro_id, dados_antes, dados_depois, motivo, criado_em, profiles(nome)'
      )
      .order('criado_em', { ascending: false })
      .limit(100)

    if (filtroData) {
      const inicio = new Date(`${filtroData}T00:00:00`)
      const fim = new Date(inicio.getTime() + 24 * 60 * 60 * 1000)
      query = query.gte('criado_em', inicio.toISOString()).lt('criado_em', fim.toISOString())
    }
    if (filtroUsuario) query = query.eq('usuario_id', filtroUsuario)
    if (filtroTabela) query = query.eq('tabela', filtroTabela)

    const { data, error } = await query

    if (error) {
      setErro(error.message)
    } else {
      setRegistros((data ?? []) as unknown as RegistroComAutor[])
    }
    setLoading(false)
  }, [filtroData, filtroUsuario, filtroTabela])

  useEffect(() => {
    carregar()
  }, [carregar])

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Auditoria</h1>
      <p className="text-sm text-slate-500 mb-4">Histórico de criações e alterações no sistema, mais recentes primeiro.</p>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="date"
          value={filtroData}
          onChange={(e) => setFiltroData(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-blue"
        />
        <select
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-blue"
        >
          <option value="">Todos os usuários</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
        <select
          value={filtroTabela}
          onChange={(e) => setFiltroTabela(e.target.value)}
          className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-brand-blue"
        >
          <option value="">Todas as tabelas</option>
          {Object.entries(TABELA_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </select>
        {(filtroData || filtroUsuario || filtroTabela) && (
          <button
            onClick={() => {
              setFiltroData('')
              setFiltroUsuario('')
              setFiltroTabela('')
            }}
            className="text-sm font-medium text-slate-500 hover:text-brand-blue-dark"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {erro && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{erro}</p>
      )}

      {loading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : registros.length === 0 ? (
        <p className="text-slate-400 text-sm italic">Nenhum registro encontrado para esse filtro.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {registros.map((reg) => {
            const diffs = diffCampos(reg.dados_antes, reg.dados_depois)
            return (
              <div key={reg.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {TABELA_LABEL[reg.tabela] ?? reg.tabela} · {ACAO_LABEL[reg.acao] ?? reg.acao}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(reg.criado_em).toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      · {reg.profiles?.nome ?? 'Sistema'}
                      {reg.motivo && ` · motivo: ${reg.motivo}`}
                    </p>
                  </div>
                  {diffs.length > 0 && (
                    <button
                      onClick={() => setAbertoId(abertoId === reg.id ? null : reg.id)}
                      className="text-xs font-medium text-slate-500 hover:underline shrink-0"
                    >
                      {abertoId === reg.id ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                  )}
                </div>

                {abertoId === reg.id && diffs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <ul className="flex flex-col gap-1">
                      {diffs.map((linha) => (
                        <li key={linha.campo} className="text-xs text-slate-600">
                          <span className="font-medium text-slate-700">{linha.campo}:</span>{' '}
                          {reg.acao === 'INSERT' ? (
                            <span>{formatarValor(linha.depois)}</span>
                          ) : (
                            <span>
                              {formatarValor(linha.antes)} <span className="text-slate-400">→</span>{' '}
                              {formatarValor(linha.depois)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
