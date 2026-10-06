// Teste de permissões (RBAC) do Vizi Vendas, feito direto contra a API
// (Supabase anon key), do mesmo jeito que um usuário real faria — sem
// passar pela tela. NÃO corrige nada sozinho: só reporta.
//
// Uso:
//   node scripts/teste-rbac.js             -> bateria normal (sistema ativo)
//   node scripts/teste-rbac.js --expirado  -> bateria com o prazo vencido
//     (rode "reset_demo.sql"/trecho de expiração antes, veja PARTE 3)
//
// Credenciais lidas de scripts/.credenciais-teste.local (não versionado,
// já coberto pelo .gitignore via "*.local").

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MODO_EXPIRADO = process.argv.includes('--expirado')

function lerEnvLocal() {
  const caminhos = [
    join(__dirname, '.credenciais-teste.local'),
    join(__dirname, '..', '.env.local'),
  ]
  const env = {}
  for (const caminho of caminhos) {
    if (!existsSync(caminho)) continue
    const conteudo = readFileSync(caminho, 'utf-8')
    for (const linha of conteudo.split('\n')) {
      const limpa = linha.trim()
      if (!limpa || limpa.startsWith('#')) continue
      const idx = limpa.indexOf('=')
      if (idx === -1) continue
      const chave = limpa.slice(0, idx).trim()
      let valor = limpa.slice(idx + 1).trim()
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1)
      }
      env[chave] = valor
    }
  }
  return env
}

const env = { ...lerEnvLocal(), ...process.env }

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (vêm do .env.local).')
  process.exit(1)
}

const CONTAS = {
  gestor: { email: env.GESTOR_EMAIL, password: env.GESTOR_SENHA },
  funcionario: { email: env.FUNCIONARIO_EMAIL, password: env.FUNCIONARIO_SENHA },
  dono: { email: env.DONO_EMAIL, password: env.DONO_SENHA },
}

for (const [papel, cred] of Object.entries(CONTAS)) {
  if (!cred.email || !cred.password) {
    console.error(
      `Falta email/senha de "${papel}" em scripts/.credenciais-teste.local (GESTOR_EMAIL, GESTOR_SENHA, FUNCIONARIO_EMAIL, FUNCIONARIO_SENHA, DONO_EMAIL, DONO_SENHA).`
    )
    process.exit(1)
  }
}

const resultados = [] // { papel, acao, bloqueado, detalhe }

function novoClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
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

// Classifica o resultado de uma tentativa de ESCRITA (insert/update/delete/rpc).
// Sempre encadeamos .select() nas escritas via tabela, pra pegar as linhas
// de verdade afetadas — RLS em UPDATE/DELETE sem policy aplicável não dá
// erro, só filtra silenciosamente pra "0 linhas afetadas".
function registrar(papel, acao, { error, data }) {
  if (error) {
    resultados.push({ papel, acao, bloqueado: true, detalhe: `erro: ${error.message}` })
    return
  }
  const linhas = Array.isArray(data) ? data.length : data ? 1 : 0
  if (linhas === 0) {
    resultados.push({ papel, acao, bloqueado: true, detalhe: 'sem erro, mas 0 linhas afetadas/retornadas (RLS filtrou)' })
  } else {
    resultados.push({
      papel,
      acao,
      bloqueado: false,
      detalhe: `PERMITIDO — ${linhas} linha(s): ${JSON.stringify(data).slice(0, 300)}`,
    })
  }
}

// Classifica o resultado de uma tentativa de LEITURA que deveria estar
// vazia (filtrada pela policy) ou, quando aplicável, só com linhas do
// próprio usuário.
function registrarLeitura(papel, acao, { error, data }, validarLinha) {
  if (error) {
    resultados.push({ papel, acao, bloqueado: true, detalhe: `erro: ${error.message}` })
    return
  }
  const linhas = data ?? []
  if (linhas.length === 0) {
    resultados.push({ papel, acao, bloqueado: true, detalhe: '0 linhas retornadas (RLS filtrou)' })
    return
  }
  if (validarLinha) {
    const vazamento = linhas.find((l) => !validarLinha(l))
    if (vazamento) {
      resultados.push({
        papel,
        acao,
        bloqueado: false,
        detalhe: `PERMITIDO — vazamento, achei linha de outro usuário: ${JSON.stringify(vazamento).slice(0, 300)}`,
      })
      return
    }
    resultados.push({ papel, acao, bloqueado: true, detalhe: `${linhas.length} linha(s), todas do próprio usuário (esperado)` })
    return
  }
  resultados.push({
    papel,
    acao,
    bloqueado: false,
    detalhe: `PERMITIDO — ${linhas.length} linha(s) retornada(s): ${JSON.stringify(linhas).slice(0, 300)}`,
  })
}

const UUID_FALSO = '00000000-0000-0000-0000-000000000000'

async function testarAcoesComuns(papel, client) {
  // Universal: ninguém altera/apaga auditoria, ninguém mexe em configuracao.
  registrar(papel, 'alterar registro de auditoria (update)', await client
    .from('auditoria')
    .update({ motivo: 'tentativa de alteração via teste' })
    .neq('id', UUID_FALSO)
    .select())

  registrar(papel, 'apagar registro de auditoria (delete)', await client
    .from('auditoria')
    .delete()
    .neq('id', UUID_FALSO)
    .select())

  registrar(papel, 'alterar configuracao (expira_em)', await client
    .from('configuracao')
    .update({ expira_em: new Date(Date.now() + 1000 * 3600 * 24 * 365).toISOString() })
    .eq('id', 1)
    .select())
}

async function testarGestor(client, userId) {
  registrar('gestor', 'abrir_turno (RPC)', await client.rpc('abrir_turno', { p_valor_inicial: 0 }))
  registrar('gestor', 'registrar_venda (RPC)', await client.rpc('registrar_venda', {
    p_itens: [{ produto_id: UUID_FALSO, quantidade: 1 }],
    p_forma_pagamento: 'numerario',
  }))
  registrar('gestor', 'fechar_turno (RPC, turno inexistente/alheio)', await client.rpc('fechar_turno', {
    p_turno_id: UUID_FALSO,
    p_valor_contado: 0,
  }))
  await testarAcoesComuns('gestor', client)
}

async function testarFuncionario(client, userId) {
  registrar('funcionario', 'cadastrar produto (insert)', await client
    .from('produtos')
    .insert([{ nome: 'Produto via teste RBAC', categoria: 'Souvenir', preco: 1 }])
    .select())

  registrar('funcionario', 'editar produto (update)', await client
    .from('produtos')
    .update({ preco: 999 })
    .neq('id', UUID_FALSO)
    .select())

  registrar('funcionario', 'entrada de estoque (RPC)', await client.rpc('registrar_entrada_estoque', {
    p_produto_id: UUID_FALSO,
    p_quantidade: 1,
    p_motivo: 'teste rbac',
    p_nf: null,
  }))

  registrar('funcionario', 'ajuste de estoque (RPC)', await client.rpc('ajustar_estoque', {
    p_produto_id: UUID_FALSO,
    p_quantidade: 1,
    p_motivo: 'teste rbac',
  }))

  registrar('funcionario', 'cancelar venda (RPC)', await client.rpc('cancelar_venda', {
    p_venda_id: UUID_FALSO,
    p_motivo: 'teste rbac',
  }))

  registrarLeitura(
    'funcionario',
    'ler vendas de outros (select sem filtro)',
    await client.from('vendas').select('id, funcionario_id'),
    (linha) => linha.funcionario_id === userId
  )

  registrarLeitura(
    'funcionario',
    'ler movimentos de estoque (motivo/quem fez)',
    await client.from('movimentos_estoque').select('id')
  )

  registrarLeitura('funcionario', 'ler auditoria', await client.from('auditoria').select('id'))

  await testarAcoesComuns('funcionario', client)
}

async function testarDono(client, userId) {
  registrar('dono', 'cadastrar produto (insert)', await client
    .from('produtos')
    .insert([{ nome: 'Produto via teste RBAC', categoria: 'Souvenir', preco: 1 }])
    .select())

  registrar('dono', 'editar produto (update)', await client
    .from('produtos')
    .update({ preco: 999 })
    .neq('id', UUID_FALSO)
    .select())

  registrar('dono', 'entrada de estoque (RPC)', await client.rpc('registrar_entrada_estoque', {
    p_produto_id: UUID_FALSO,
    p_quantidade: 1,
    p_motivo: 'teste rbac',
    p_nf: null,
  }))

  registrar('dono', 'ajuste de estoque (RPC)', await client.rpc('ajustar_estoque', {
    p_produto_id: UUID_FALSO,
    p_quantidade: 1,
    p_motivo: 'teste rbac',
  }))

  registrar('dono', 'abrir_turno (RPC)', await client.rpc('abrir_turno', { p_valor_inicial: 0 }))
  registrar('dono', 'registrar_venda (RPC)', await client.rpc('registrar_venda', {
    p_itens: [{ produto_id: UUID_FALSO, quantidade: 1 }],
    p_forma_pagamento: 'numerario',
  }))
  registrar('dono', 'fechar_turno (RPC, turno inexistente/alheio)', await client.rpc('fechar_turno', {
    p_turno_id: UUID_FALSO,
    p_valor_contado: 0,
  }))

  registrar('dono', 'cancelar venda (RPC)', await client.rpc('cancelar_venda', {
    p_venda_id: UUID_FALSO,
    p_motivo: 'teste rbac',
  }))

  await testarAcoesComuns('dono', client)
}

async function testarSemLogin() {
  const client = novoClient()
  registrarLeitura('sem_login', 'ler produtos', await client.from('produtos').select('id'))
  registrarLeitura('sem_login', 'ler vendas', await client.from('vendas').select('id'))
  registrar('sem_login', 'estoque_produtos (RPC)', await client.rpc('estoque_produtos'))
  registrar('sem_login', 'registrar_venda (RPC)', await client.rpc('registrar_venda', {
    p_itens: [{ produto_id: UUID_FALSO, quantidade: 1 }],
    p_forma_pagamento: 'numerario',
  }))
  registrar('sem_login', 'cadastrar produto (insert)', await client
    .from('produtos')
    .insert([{ nome: 'Produto via teste RBAC (anon)', categoria: 'Souvenir', preco: 1 }])
    .select())
  registrar('sem_login', 'alterar configuracao', await client
    .from('configuracao')
    .update({ expira_em: new Date().toISOString() })
    .eq('id', 1)
    .select())
}

// auth.updateUser (trocar a própria senha/e-mail) não é controlado pelo
// nosso RLS — é comportamento padrão do Supabase Auth, igual pra
// qualquer papel. Testamos numa conta descartável criada na hora (nunca
// nas contas reais da demo), pra não arriscar travar o login de ninguém.
async function testarAutoAlteracaoDeCredenciais() {
  const client = novoClient()
  const emailDescartavel = `teste-rbac-${Date.now()}@example.com`
  const senhaOriginal = `Senha-${Date.now()}!`

  const { data: signUpData, error: signUpError } = await client.auth.signUp({
    email: emailDescartavel,
    password: senhaOriginal,
  })

  if (signUpError) {
    resultados.push({
      papel: 'qualquer_papel',
      acao: 'trocar a própria senha via auth.updateUser',
      bloqueado: null,
      detalhe: `não testado ao vivo — cadastro de conta descartável falhou (${signUpError.message}). Por padrão do Supabase, qualquer usuário autenticado pode trocar a própria senha/e-mail via auth.updateUser, independente de papel — isso não é algo que RLS controle.`,
    })
    return
  }

  if (!signUpData.session) {
    resultados.push({
      papel: 'qualquer_papel',
      acao: 'trocar a própria senha/e-mail via auth.updateUser',
      bloqueado: null,
      detalhe:
        'não testado ao vivo — o projeto exige confirmação por e-mail antes de ativar a sessão, e não recebo esse e-mail aqui. Por padrão do Supabase (sem essa confirmação pendente), qualquer usuário autenticado pode trocar a própria senha/e-mail via auth.updateUser, independente de papel.',
    })
    return
  }

  const novaSenha = `${senhaOriginal}-nova`
  const { error: erroTrocaSenha } = await client.auth.updateUser({ password: novaSenha })
  resultados.push({
    papel: 'qualquer_papel (testado em conta descartável)',
    acao: 'trocar a própria senha via auth.updateUser',
    bloqueado: !!erroTrocaSenha,
    detalhe: erroTrocaSenha ? `erro: ${erroTrocaSenha.message}` : 'PERMITIDO — senha trocada com sucesso (comportamento padrão do Supabase Auth, não é papel-específico)',
  })

  const { error: erroEmail } = await client.auth.updateUser({ email: `${emailDescartavel}.novo@example.com` })
  resultados.push({
    papel: 'qualquer_papel (testado em conta descartável)',
    acao: 'trocar o próprio e-mail via auth.updateUser',
    bloqueado: !!erroEmail,
    detalhe: erroEmail
      ? `erro: ${erroEmail.message}`
      : 'PERMITIDO (ou pendente de confirmação por e-mail) — comportamento padrão do Supabase Auth, não é papel-específico',
  })
}

async function main() {
  if (MODO_EXPIRADO) {
    console.log('=== Bateria de EXPIRAÇÃO (rode só depois de setar configuracao.expira_em pro passado) ===\n')
    for (const papel of ['gestor', 'funcionario', 'dono']) {
      const { client } = await login(papel)
      registrarLeitura(papel, '[expirado] ler produtos', await client.from('produtos').select('id'))
      if (papel === 'gestor') {
        registrar(papel, '[expirado] entrada de estoque (RPC)', await client.rpc('registrar_entrada_estoque', {
          p_produto_id: UUID_FALSO,
          p_quantidade: 1,
          p_motivo: 'teste rbac expirado',
          p_nf: null,
        }))
      }
      if (papel === 'funcionario') {
        registrar(papel, '[expirado] abrir_turno (RPC)', await client.rpc('abrir_turno', { p_valor_inicial: 0 }))
      }
      if (papel === 'dono') {
        registrarLeitura(papel, '[expirado] ler auditoria', await client.from('auditoria').select('id'))
      }
      await client.auth.signOut()
    }
    registrarLeitura('sem_login', '[expirado] ler produtos', await novoClient().from('produtos').select('id'))
  } else {
    console.log('=== Bateria NORMAL (sistema ativo) ===\n')

    const gestor = await login('gestor')
    await testarGestor(gestor.client, gestor.userId)
    await gestor.client.auth.signOut()

    const funcionario = await login('funcionario')
    await testarFuncionario(funcionario.client, funcionario.userId)
    await funcionario.client.auth.signOut()

    const dono = await login('dono')
    await testarDono(dono.client, dono.userId)
    await dono.client.auth.signOut()

    await testarSemLogin()
    await testarAutoAlteracaoDeCredenciais()
  }

  // ---- monta o relatório em markdown ----
  let md = `# Relatório de verificação RBAC — ${MODO_EXPIRADO ? 'bateria de expiração' : 'bateria normal'}\n\n`
  md += `Gerado em ${new Date().toISOString()}\n\n`
  md += '| Papel | Ação | Resultado | Detalhe |\n|---|---|---|---|\n'
  let houveFalha = false
  for (const r of resultados) {
    const status = r.bloqueado === null ? '⚠️ NÃO TESTADO' : r.bloqueado ? '✅ bloqueado' : '🔴 **PERMITIDO**'
    if (r.bloqueado === false) houveFalha = true
    md += `| ${r.papel} | ${r.acao} | ${status} | ${r.detalhe.replace(/\|/g, '\\|')} |\n`
  }
  md += houveFalha
    ? '\n## 🔴 ATENÇÃO: pelo menos uma ação proibida foi PERMITIDA. Não enviei nenhuma correção — aguardando revisão.\n'
    : '\n## Nenhuma ação proibida foi permitida nesta bateria.\n'

  console.log('\n' + md)

  const nomeArquivo = MODO_EXPIRADO ? 'RELATORIO-RBAC-expirado.md' : 'RELATORIO-RBAC-normal.md'
  writeFileSync(join(__dirname, '..', nomeArquivo), md, 'utf-8')
  console.log(`\nRelatório salvo em ${nomeArquivo}`)
}

main().catch((e) => {
  console.error('Erro inesperado ao rodar o teste:', e)
  process.exit(1)
})
