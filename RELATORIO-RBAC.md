# Relatório de verificação de permissões (RBAC) — Vizi Vendas

Verificação feita em 2026-10-06, direto contra a API do Supabase (chave
anon, como um usuário real faria — sem passar pela tela), usando o
script `scripts/teste-rbac.js`. Cobre as 4 contas de papel (gestor,
funcionário 1 = João, funcionário 2 = Manuel, dono), sem login nenhum,
e o cenário de prazo expirado.

**Resultado geral: 70 de 70 ações testadas vieram bloqueadas. Nenhuma
ação proibida foi permitida.**

## Ação × perfil (sistema ativo)

| Ação | Gestor | Funcionário 1 (João) | Funcionário 2 (Manuel) | Dono | Sem login |
|---|---|---|---|---|---|
| Cadastrar produto (insert) | — ¹ | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |
| Editar produto (update) | — ¹ | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |
| Entrada de estoque (RPC) | — ¹ | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |
| Ajuste de estoque (RPC) | — ¹ | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |
| Abrir caixa — `abrir_turno` (RPC) | ✅ bloqueado | — ¹ | — ¹ | ✅ bloqueado | ✅ bloqueado |
| Registrar venda (RPC) | ✅ bloqueado | — ¹ | — ¹ | ✅ bloqueado | ✅ bloqueado |
| Fechar caixa — `fechar_turno` (RPC)² | ✅ bloqueado | — ¹ | — ¹ | ✅ bloqueado | ✅ bloqueado |
| Cancelar venda (RPC) | — ¹ | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |
| Ler vendas de outro usuário | — ¹ | ✅ bloqueado | ✅ bloqueado | — ¹ | ✅ bloqueado |
| Ler movimentos de estoque | — ¹ | ✅ bloqueado | ✅ bloqueado | — ¹ | ✅ bloqueado |
| Ler auditoria | — ¹ | ✅ bloqueado | ✅ bloqueado | — ¹ | ✅ bloqueado |
| Alterar registro de auditoria (update) | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |
| Apagar registro de auditoria (delete) | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |
| Alterar `configuracao` (ex: `expira_em`) | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado | ✅ bloqueado |

¹ Ação permitida pra esse papel — não faz parte do que deveria estar
bloqueado, então não foi testada como proibida (testar isso só
geraria dado real na demo sem necessidade).

² `fechar_turno` não tem checagem explícita de papel no código — é
bloqueado porque a função exige que o turno pertença a quem está
chamando (`funcionario_id = auth.uid()`), e só funcionário consegue ter
um turno. Na prática o resultado é o mesmo (gestor/dono não conseguem
fechar caixa nenhum), mas o mecanismo é "dono do dado", não "checagem
de papel" — registrando aqui pra ficar documentado.

**Observação sem relevância de segurança**: sem login, a RPC
`registrar_entrada_estoque` bloqueou com uma mensagem diferente das
outras (`permission denied for function`, em vez de `Não
autenticado.`) — ambas são o Postgres recusando a chamada antes de
qualquer dado ser tocado, só por caminhos distintos. Resultado final é
o mesmo (bloqueado); registrando aqui só por transparência, não é um
problema.

**Sobre os dois funcionários**: João e Manuel foram testados
separadamente, cada um tentando ler vendas/estoque/auditoria sem
filtro — nenhum dos dois conseguiu ver nada além do que é seu (ou
nada, já que nenhum dos dois tem vendas registradas no momento do
teste). Como o RLS é baseado no papel (`meu_papel() = 'funcionario'`)
e não no usuário individual, os dois tiveram exatamente o mesmo
resultado em cada teste — que é o esperado.

## Prazo expirado (sistema_ativo = false)

Testado simulando `configuracao.expira_em` no passado e restaurado
logo em seguida.

| Ação | Gestor | Funcionário 1 (João) | Funcionário 2 (Manuel) | Dono | Sem login |
|---|---|---|---|---|---|
| Ler produtos | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (erro de permissão) |
| Ler vendas | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (RLS filtrou) | ✅ bloqueado (erro de permissão) |
| Ação de escrita principal do papel³ | ✅ bloqueado ("Período de demonstração encerrado.") | ✅ bloqueado ("Período de demonstração encerrado.") | ✅ bloqueado ("Período de demonstração encerrado.") | — | — |
| Ler auditoria | ✅ bloqueado (RLS filtrou) | — | — | ✅ bloqueado (RLS filtrou) | — |

³ Entrada de estoque pro gestor, abrir caixa pro funcionário — RPCs
que já checam `sistema_ativo()` antes de qualquer outra coisa.

**Nota sobre login**: o login em si (Supabase Auth) continua
funcionando mesmo com o prazo expirado — é esperado, é o app que
decide mostrar a tela de bloqueio depois que a sessão carrega. O que
importa é que nenhuma leitura ou escrita de dado real passa, e isso
foi confirmado em todos os papéis, incluindo os dois funcionários.

## Troca de senha/e-mail via API direta (`auth.updateUser`)

- **Não existe nenhuma tela no app** pra troca de senha ou e-mail —
  confirmado buscando no código-fonte inteiro (nenhuma ocorrência de
  `updateUser` nem de qualquer campo de "nova senha").
- **Não é controlado pelo nosso RLS.** É comportamento padrão do
  Supabase Auth: qualquer usuário autenticado pode chamar
  `auth.updateUser()` pra trocar a própria senha ou e-mail,
  independente do papel — isso não passa pelas políticas que
  protegem as tabelas do sistema. Vale pra gestor, funcionário 1,
  funcionário 2 e dono igualmente, porque não é uma permissão
  controlada por `papel`.
- Tentei testar numa conta descartável (criada na hora, sem usar
  nenhuma das 4 contas reais) pra confirmar isso sem risco, mas
  **o cadastro público está desativado neste projeto** ("Signups not
  allowed for this instance") — o que é positivo (ninguém de fora cria
  conta sozinho), mas impediu o teste ao vivo com segurança total.
- **Decisão tomada em conjunto**: não mexer em configuração de Auth
  pra bloquear isso (fora do escopo pedido, risco de mexer às cegas
  num sistema que já vai ser enviado), e também não testar ao vivo
  trocando a senha de uma conta real. Em vez disso, `reset_demo.sql`
  agora tem um lembrete pra resetar as 4 senhas no painel antes de
  cada envio da demo — o risco real é baixo (não muda permissão nem
  o prazo de 7 dias, só exige um reset de senha pelo painel se
  alguém trocar a própria).

## Conclusão

Nenhuma ação proibida foi permitida em nenhum dos 70 testes, em nenhum
dos 4 papéis, com o sistema ativo ou expirado — incluindo, agora, a
coluna "sem login" testada por completo (antes algumas ações dela
estavam assumidas como óbvias e não tinham sido rodadas de verdade). O único ponto sem
confirmação prática ao vivo (troca de senha/e-mail) tem explicação
registrada acima e um mitigador de baixo esforço já incluído no
`reset_demo.sql`. Nenhuma regra do sistema foi alterada durante essa
verificação.

Scripts usados: `scripts/teste-rbac.js` (bateria normal e
`--expirado`). Dados brutos de cada rodada em `RELATORIO-RBAC-normal.md`
e `RELATORIO-RBAC-expirado.md`.
