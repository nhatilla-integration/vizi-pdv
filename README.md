# Vizi Vendas

Sistema de ponto de venda (PDV) pra pequenos comércios — vendas, estoque
e caixa num único app, pensado pra funcionar numa tablet Android, em
loja/quiosque. Três papéis: **gestor** (produtos, estoque, cancelamentos),
**funcionário** (abrir caixa, vender, fechar caixa) e **dono** (resumo
do dia, auditoria — só leitura).

Atualmente em fase de demonstração gratuita de 7 dias pra um piloto em
Moçambique. Contexto completo do projeto em [`PLAN.md`](./PLAN.md), o
que muda entre demo e piloto pago em [`ESCOPO_PILOTO.md`](./ESCOPO_PILOTO.md).

## Stack

React + TypeScript (Vite) · Tailwind CSS v4 · Supabase (Auth + Postgres,
com RLS e funções `security definer`) · Vercel · PWA instalável
(`vite-plugin-pwa`) · Vitest.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencher com as chaves do Supabase (ver abaixo)
npm run dev
```

Scripts disponíveis:

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção (`tsc -b && vite build`)
- `npm test` — roda a suíte de testes (Vitest)
- `npm run lint` — lint (oxlint)
- `npm run preview` — serve o build de produção localmente

## Variáveis de ambiente

Em `.env.local` (nunca commitado — veja `.env.example` pro formato):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Sempre a chave **anon/publishable**, nunca a `service_role`. O app
inteiro depende só disso + RLS pra segurança — não existe nenhum
backend próprio.

## Banco de dados

- `supabase/schema.sql` — schema completo (tabelas, RLS, funções,
  índices). Rodar inteiro num projeto Supabase novo e vazio.
- `supabase/migrations/` — alterações aplicadas depois do schema
  inicial, em projetos que já existiam.
- `supabase/reset_demo.sql` — limpa dados de teste, recoloca estoque
  inicial e renova os 7 dias de demonstração. Rodar no SQL Editor do
  Supabase antes de cada envio da demo (veja o checklist manual no
  topo do arquivo — inclui resetar as senhas das contas de
  demonstração no painel).

### Alterar a data de expiração da demo

O prazo fica numa única linha na tabela `configuracao`:

```sql
update configuracao set expira_em = now() + interval '7 days' where id = 1;
```

Ajuste o intervalo conforme necessário. Passado esse prazo, toda
leitura e escrita é bloqueada pro app inteiro (reforçado em RLS e nas
funções RPC, não só na tela).

## Verificação de permissões

`scripts/teste-rbac.js` loga de verdade com cada papel (API direta,
chave anon) e tenta as ações que aquele papel não deveria conseguir
fazer, reportando bloqueado/permitido — não é teste de UI, é contra o
banco de verdade. Precisa de um arquivo local
`scripts/.credenciais-teste.local` (nunca commitado) com as
credenciais das contas de teste. Resultado da última rodada em
[`RELATORIO-RBAC.md`](./RELATORIO-RBAC.md). Roteiro de teste manual
(pela tela) em [`TESTE-MANUAL.md`](./TESTE-MANUAL.md).

## Publicando na Vercel

```bash
vercel link        # primeira vez, vincula a pasta ao projeto na Vercel
vercel --prod       # publica
```

As variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
precisam estar configuradas no projeto da Vercel — `vercel env add
VITE_SUPABASE_URL production` (e o mesmo pra `VITE_SUPABASE_ANON_KEY`).
Elas entram no build, então mudar o valor exige publicar de novo.
