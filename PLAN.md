# Vizi PDV

Sistema de ponto de venda pra um quiosque em Moçambique (souvenirs, roupas, doces, bebidas).

Plano e esquema de banco, pra aprovação antes de começar o frontend.

## Os três pontos que você pediu pra conferir

1. **Expiração nas políticas RLS, não só na tela.** Toda tabela sensível (produtos, vendas, itens_venda, turnos, movimentos_estoque, auditoria) tem `sistema_ativo()` dentro do `using()` da política de SELECT, e toda função RPC de escrita começa checando `sistema_ativo()` e lançando exceção se falso. Quem souber chamar a API direto continua barrado.
   - **Exceção proposital**: `profiles` e `configuracao` **não** são gated por `sistema_ativo()`, porque o app precisa conseguir ler "quem é esse usuário" e "o sistema expirou?" mesmo depois do prazo, pra decidir se mostra a tela de bloqueio. Se preferir que `auditoria` continue acessível ao dono mesmo expirado (pra auditoria histórica), me avisa — hoje ela também está gated.

2. **Auditoria sem UPDATE nem DELETE.** A tabela `auditoria` só tem política de `SELECT` (gestor/dono). Não existe política de update ou delete — o Postgres nega por padrão quando RLS está ativo e não há policy pra aquela operação. Ninguém altera ou apaga o rastro via API, nem gestor, nem dono.

3. **Estoque só por movimento, nunca editado à mão.** Não existe coluna de "estoque atual" em `produtos`. O saldo é a `view estoque_atual`, soma de `movimentos_estoque.quantidade` (entrada positivo, venda negativo, ajuste positivo/negativo, cancelamento positivo pra devolver). A tabela `movimentos_estoque` não tem política de INSERT pra clientes — só as funções RPC (`registrar_venda`, `cancelar_venda`, `ajustar_estoque`, `registrar_entrada_estoque`) escrevem nela, e são `security definer`, então funcionam mesmo com a escrita direta revogada do cliente.

## Decisões que tomei e preciso que você confirme

- **`registrar_venda`** recebe os itens como um array JSON (`[{"produto_id": "...", "quantidade": 2}, ...]`) e a forma de pagamento. Valida preço, estoque e turno aberto antes de gravar qualquer coisa; se qualquer item falhar, a função inteira falha (nada fica gravado pela metade, porque é uma única transação).
- **`fechar_turno`** calcula o esperado por forma de pagamento a partir das vendas daquele turno, soma o valor inicial ao esperado em numerário, e retorna a diferença (`valor_contado - esperado`). Isso aparece pronto no fechamento de caixa.
- **Perfis não têm tela de autoedição** — não há política de UPDATE em `profiles`. Como são só 3 usuários fixos de teste, presumi que trocar nome/papel é feito direto no banco, não pelo app. Se quiser uma tela pra isso depois, dá pra adicionar.
- **Criação dos 3 usuários de teste**: como no Vizi, crio o login de cada um direto no Supabase Dashboard (Authentication → Users → Add user) — é o jeito mais confiável de garantir senha funcionando de verdade. Depois disso, insiro manualmente a linha correspondente em `profiles` com o `papel` de cada um. O SQL já está pronto pra isso, só falta os UUIDs reais.
- **Estoque inicial do seed**: deixei os 20 produtos cadastrados, mas o insert de `movimentos_estoque` que dá 50 unidades iniciais pra cada um está comentado no final do `schema.sql`, porque precisa do UUID do usuário gestor (que só existe depois de criar os usuários de teste). Depois que o gestor existir, é só descomentar essas duas linhas e rodar.

## Próximos passos (nessa ordem)

1. ✅ `schema.sql` aprovado e revisado (segurança, locks de concorrência)
2. ✅ Projeto Supabase criado, schema rodado
3. ✅ 3 usuários de teste criados (gestor/funcionario/dono)
4. ✅ `profiles` preenchido, estoque inicial de demonstração lançado
5. ✅ Base do frontend (Vite + React + TS + Tailwind + PWA), login real, roteamento por papel — testado com os 3 perfis, todos entrando certo
6. ✅ Funcionário: abrir caixa → tela de venda (grade de produtos por categoria, carrinho, forma de pagamento) → fechar caixa. Testado de ponta a ponta (venda real descontando estoque, fechamento calculando diferença corretamente).
7. ✅ Gestor: produtos (cadastro/edição com categoria/tamanho/NF), entrada de estoque, ajustes, histórico (com devolução por cancelamento), cancelamentos (com itens da venda visíveis). Testado de ponta a ponta.
8. ✅ Dono: resumo do dia (por forma de pagamento, funcionário, mais vendidos) e auditoria (filtros por data/usuário/tabela, diff de campos). Testado de ponta a ponta.
9. ✅ Projeto versionado (git), suíte de testes (vitest, lógica de Resumo/Auditoria extraída e testada), constraints de integridade (tamanho só em Vestuário, valores de caixa não-negativos), índices de performance, revalidação periódica de `sistema_ativo()`, alerta de estoque baixo.

## Ideias pra personalizar o piloto (pós-demo, não pra agora)

Feedback de quem vai rodar a demo: as permissões atuais fazem sentido pro
teste de 7 dias, mas um quiosque pequeno de verdade provavelmente pede
ajustes. Guardando aqui pra quando for montar a proposta do piloto —
também vira argumento de venda ("ajustamos as permissões à rotina real
do quiosque").

- **Gestor acompanhar vendas do dia.** Hoje só o dono tem a aba Resumo.
  O RLS já libera gestor pra ler `vendas`/`itens_venda` (mesma regra do
  dono) — é só reaproveitar o componente `Resumo.tsx` também no
  `GestorHome`. Não precisa mexer no banco, só na navegação.
- **Gestor também vender / abrir caixa.** Em quiosque pequeno o gestor
  às vezes atende. Hoje `abrir_turno`, `registrar_venda` e
  `fechar_turno` exigem `meu_papel() = 'funcionario'` estritamente —
  pra liberar, trocaria pra `meu_papel() in ('funcionario', 'gestor')`
  nas 3 funções, e o `GestorHome` ganharia uma aba "Vender" reaproveitando
  `AbrirCaixa.tsx`/`Venda.tsx`/`FecharCaixa.tsx`. Isso é mudança de RLS
  e RPC, não só de tela — vale tratar como uma opção configurável por
  cliente, não como padrão pra todo mundo.

## Pendências conhecidas (não bloqueantes pro uso atual)

- Sem recuperação de senha ("esqueci minha senha") — ok pros 3 usuários de teste fixos (senha trocada direto no Supabase Dashboard), mas necessário antes de qualquer uso com dono de loja real.
- PWA instalável mas sem tratamento de estado offline (sem fila/retry se a conexão cair no meio de uma venda).
- Cancelar uma venda de um turno já fechado devolve o estoque corretamente, mas o resumo de fechamento que o funcionário já viu naquele turno não é recalculado — é um snapshot do momento do fechamento, não uma visão viva.
- Sem exportação (CSV/PDF) do Resumo do dia ou da Auditoria.
- Sem unique constraint em produtos — possível cadastrar duplicado sem perceber.

## Stack confirmada

React + TypeScript (Vite) · Tailwind · Supabase (Auth + Postgres) · Vercel · PWA instalável, layout de tablet · Vitest.
