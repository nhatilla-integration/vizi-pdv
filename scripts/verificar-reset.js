// Verificação pós-reset do Vizi Vendas — confirma que o ambiente está
// limpo e pronto pra enviar a demo: produtos com estoque, nenhuma
// venda, nenhum caixa aberto, resumo zerado, auditoria só com os
// registros do próprio reset, e o prazo de expiração correto.
//
// Uso: node scripts/verificar-reset.js
// Credenciais lidas de scripts/.credenciais-teste.local (não versionado).

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

function lerEnvLocal() {
  const caminhos = [join(__dirname, '.credenciais-teste.local'), join(__dirname, '..', '.env.local')]
  const env = {}
  for (const caminho of caminhos) {
    if (!existsSync(caminho)) continue
    for (const linha of readFileSync(caminho, 'utf-8').split('\n')) {
      const limpa = linha.trim()
      if (!limpa || limpa.startsWith('#')) continue
      const idx = limpa.indexOf('=')
      if (idx === -1) continue
      env[limpa.slice(0, idx).trim()] = limpa.slice(idx + 1).trim()
    }
  }
  return env
}

const env = { ...lerEnvLocal(), ...process.env }
const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

const CONTAS = {
  gestor: { email: env.GESTOR_EMAIL, password: env.GESTOR_SENHA },
  funcionario1: { email: env.FUNCIONARIO1_EMAIL, password: env.FUNCIONARIO1_SENHA },
  funcionario2: { email: env.FUNCIONARIO2_EMAIL, password: env.FUNCIONARIO2_SENHA },
  dono: { email: env.DONO_EMAIL, password: env.DONO_SENHA },
}

for (const [papel, cred] of Object.entries(CONTAS)) {
  if (!cred.email || !cred.password) {
    console.error(`Falta email/senha de "${papel}" em scripts/.credenciais-teste.local`)
    process.exit(1)
  }
}

const checagens = [] // { descricao, ok, detalhe }

function novoClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function login(papel) {
  const client = novoClient()
  const { data, error } = await client.auth.signInWithPassword(CONTAS[papel])
  if (error) {
    console.error(`Não consegui logar como ${papel}: ${error.message}`)
    process.exit(1)
  }
  return { client, userId: data.user.id }
}

function checar(descricao, ok, detalhe) {
  checagens.push({ descricao, ok, detalhe })
}

async function verificarFuncionario(papel, nomeExibicao, client, userId) {
  const { data: estoque, error: erroEstoque } = await client.rpc('estoque_produtos')
  if (erroEstoque) {
    checar(`${nomeExibicao}: ver estoque dos produtos`, false, `erro: ${erroEstoque.message}`)
  } else {
    const semEstoque = estoque.filter((e) => Number(e.quantidade) <= 0)
    checar(
      `${nomeExibicao}: produtos com estoque inicial`,
      semEstoque.length === 0 && estoque.length > 0,
      `${estoque.length} produto(s) com saldo, ${semEstoque.length} com estoque zero/negativo`
    )
  }

  const { data: vendas, error: erroVendas } = await client.from('vendas').select('id')
  checar(
    `${nomeExibicao}: nenhuma venda registrada`,
    !erroVendas && (vendas ?? []).length === 0,
    erroVendas ? `erro: ${erroVendas.message}` : `${(vendas ?? []).length} venda(s) encontrada(s)`
  )

  const { data: turnoAberto, error: erroTurno } = await client
    .from('turnos')
    .select('id')
    .eq('funcionario_id', userId)
    .eq('status', 'aberto')
  checar(
    `${nomeExibicao}: nenhum caixa aberto`,
    !erroTurno && (turnoAberto ?? []).length === 0,
    erroTurno ? `erro: ${erroTurno.message}` : `${(turnoAberto ?? []).length} turno(s) aberto(s)`
  )
}

async function verificarDono(client) {
  const { data: vendas, error: erroVendas } = await client.from('vendas').select('id')
  checar(
    'Dono: resumo zerado (nenhuma venda no sistema)',
    !erroVendas && (vendas ?? []).length === 0,
    erroVendas ? `erro: ${erroVendas.message}` : `${(vendas ?? []).length} venda(s) no total`
  )

  const { data: auditoria, error: erroAuditoria } = await client.from('auditoria').select('tabela, acao')
  if (erroAuditoria) {
    checar('Dono: auditoria vazia ou só com registros do reset', false, `erro: ${erroAuditoria.message}`)
  } else {
    const linhas = auditoria ?? []
    const foraDoReset = linhas.filter((l) => !(l.tabela === 'movimentos_estoque' && l.acao === 'INSERT'))
    checar(
      'Dono: auditoria vazia ou só com registros do reset',
      foraDoReset.length === 0,
      `${linhas.length} registro(s) no total, ${foraDoReset.length} fora do padrão esperado (entrada de estoque do reset)`
    )
  }
}

async function verificarConfiguracao(client) {
  const { data, error } = await client.from('configuracao').select('expira_em, modo_demo').eq('id', 1).single()
  if (error || !data) {
    checar('Configuração: leitura de expira_em/modo_demo', false, `erro: ${error?.message ?? 'sem dados'}`)
    return
  }

  const data_expira = new Date(data.expira_em)
  const maputo = new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Africa/Maputo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data_expira)
  const brasilia = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data_expira)

  checar(
    'Configuração: expira_em lido com sucesso',
    true,
    `Maputo: ${maputo} · Brasília: ${brasilia} · ISO: ${data.expira_em}`
  )
  checar('Configuração: modo_demo está ativo (true)', data.modo_demo === true, `modo_demo = ${data.modo_demo}`)
}

async function main() {
  const gestor = await login('gestor')
  await verificarConfiguracao(gestor.client)
  await gestor.client.auth.signOut()

  const f1 = await login('funcionario1')
  await verificarFuncionario('funcionario1', 'Funcionário 1 (João)', f1.client, f1.userId)
  await f1.client.auth.signOut()

  const f2 = await login('funcionario2')
  await verificarFuncionario('funcionario2', 'Funcionário 2 (Manuel)', f2.client, f2.userId)
  await f2.client.auth.signOut()

  const dono = await login('dono')
  await verificarDono(dono.client)
  await dono.client.auth.signOut()

  console.log('\n=== Verificação pós-reset ===\n')
  let houveFalha = false
  for (const c of checagens) {
    const status = c.ok ? 'OK' : 'FALHOU'
    if (!c.ok) houveFalha = true
    console.log(`[${status}] ${c.descricao} — ${c.detalhe}`)
  }
  console.log(houveFalha ? '\nAlgo FALHOU — aguardando revisão, nada foi corrigido.' : '\nTudo OK.')
}

main().catch((e) => {
  console.error('Erro inesperado:', e)
  process.exit(1)
})
