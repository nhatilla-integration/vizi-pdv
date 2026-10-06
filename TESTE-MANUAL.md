# Vizi Vendas — permissões por perfil e roteiro de teste manual

Documento de apoio pra validar, antes de enviar a demo de 7 dias, que cada
perfil (gestor, funcionário, dono) só consegue fazer o que deveria. A
garantia real é no banco (RLS + funções `security definer` com checagem de
papel) — a interface só reflete isso. Mesmo que alguém tentasse pular a
tela e chamar a API direto, o banco barra do mesmo jeito.

## Tabela de permissões

| Ação | Gestor | Funcionário | Dono | Garantido por |
|---|---|---|---|---|
| Login no sistema | ✅ | ✅ | ✅ | Supabase Auth |
| Ver os próprios dados de perfil | ✅ | ✅ | ✅ | RLS `profiles_select` |
| Ver perfil de outros usuários | ✅ | ❌ | ✅ | RLS `profiles_select` |
| Ver lista de produtos e preços | ✅ | ✅ | ✅ | RLS `produtos_select` |
| Cadastrar/editar produto (categoria, tamanho, preço, NF) | ✅ | ❌ | ❌ | RLS `produtos_insert`/`produtos_update` |
| Ativar/desativar produto | ✅ | ❌ | ❌ | RLS `produtos_update` |
| Ver saldo de estoque (quantidade) | ✅ | ✅ | ✅ | RPC `estoque_produtos()` |
| Ver movimentos de estoque (motivo, quem fez, NF) | ✅ | ❌ | ✅ | RLS `movimentos_estoque_select` |
| Registrar entrada de estoque | ✅ | ❌ | ❌ | RPC `registrar_entrada_estoque` |
| Fazer ajuste de estoque | ✅ | ❌ | ❌ | RPC `ajustar_estoque` |
| Abrir caixa (turno) | ❌ | ✅ | ❌ | RPC `abrir_turno` |
| Registrar venda | ❌ | ✅ (com turno aberto) | ❌ | RPC `registrar_venda` |
| Fechar caixa (turno) | ❌ | ✅ (só o próprio) | ❌ | RPC `fechar_turno` |
| Ver vendas | todas | só as próprias | todas | RLS `vendas_select` |
| Cancelar venda | ✅ | ❌ | ❌ | RPC `cancelar_venda` |
| Ver resumo do dia (forma de pagto/funcionário/produto) | sem tela¹ | ❌ | ✅ | tela Resumo |
| Ver auditoria (quem alterou o quê) | ✅ | ❌ | ✅ | RLS `auditoria_select` |
| Alterar/apagar registro de auditoria | ❌ | ❌ | ❌ | sem policy de UPDATE/DELETE — ninguém consegue |
| Mudar prazo de expiração da demonstração | ❌ | ❌ | ❌ | só direto no banco, fora do app |

¹ O gestor tem acesso aos dados no banco (mesma regra do dono), mas a tela
de Resumo só existe na área do dono hoje — não é uma restrição de
segurança, é só a aba não ter sido construída pra esse perfil.

## Roteiro de teste manual

Use as 3 contas de teste já criadas (gestor / funcionário / dono).

### Gestor

**✅ Deve funcionar:**
1. Login com a conta de gestor.
2. Produtos → cadastrar um produto novo (categoria Vestuário, com tamanho).
3. Editar um produto existente (mudar o preço).
4. Desativar um produto e confirmar que ele some da tela de venda do funcionário.
5. Estoque → registrar uma entrada com NF.
6. Estoque → fazer um ajuste negativo (perda/quebra).
7. Histórico → conferir se a entrada e o ajuste aparecem.
8. Cancelamentos → cancelar uma venda concluída, ver os itens, conferir que o estoque voltou.

**🚫 Tentar e confirmar que está bloqueado:**
1. **Abrir caixa / registrar uma venda.** Procure por qualquer tela de "abrir caixa" ou "nova venda" na área do gestor. *Resultado esperado:* não existe — as únicas abas são Produtos, Estoque, Histórico, Cancelamentos.
2. **Ver o Resumo do dia ou a Auditoria.** Procure essas abas na área do gestor. *Resultado esperado:* não aparecem — são exclusivas da área do dono.

### Funcionário

**✅ Deve funcionar:**
1. Login com a conta de funcionário.
2. Abrir caixa informando o valor inicial.
3. Fazer uma venda (escolher produtos, forma de pagamento, finalizar).
4. Fechar caixa e conferir a diferença calculada.

**🚫 Tentar e confirmar que está bloqueado:**
1. **Cancelar uma venda.** Depois de vender, procure um botão de "cancelar" na tela de venda. *Resultado esperado:* não existe nenhum — só o gestor cancela.
2. **Ver vendas de outro funcionário ou o resumo do dia.** Procure uma tela de histórico de vendas ou de resumo do negócio. *Resultado esperado:* a única coisa visível é o carrinho da venda atual; nada do negócio como um todo.
3. **(Bônus, tentativa real com erro na tela)** Com um turno já aberto, tente abrir caixa de novo (ex: recarregando a página — a tela de "abrir caixa" não deve voltar a aparecer enquanto o turno anterior estiver aberto). Se forçar a chamada de abertura de novo, o sistema responde "Você já tem um turno aberto."

### Dono

**✅ Deve funcionar:**
1. Login com a conta de dono.
2. Resumo → escolher uma data, conferir os totais (forma de pagamento, por funcionário, mais vendidos).
3. Auditoria → filtrar por data/usuário/tabela, abrir "Ver detalhes" de um registro (ex: o cancelamento de uma venda).

**🚫 Tentar e confirmar que está bloqueado:**
1. **Cadastrar ou editar um produto.** Procure um botão de "novo produto" ou de edição. *Resultado esperado:* não existe nenhuma aba de Produtos ou Estoque na área do dono.
2. **Vender ou cancelar uma venda.** Procure uma tela de venda ou um botão de cancelamento. *Resultado esperado:* não existe em lugar nenhum — o dono é só leitura em todo o sistema, não tem nenhuma ação de escrita.

## Teste de expiração (período de demonstração)

O prazo fica numa única linha na tabela `configuracao` (`expira_em`). Pra
testar sem esperar os 7 dias de verdade, simule no SQL Editor do Supabase:

```sql
-- simula o fim do prazo (teste)
update configuracao set expira_em = now() - interval '1 hour' where id = 1;
```

Com isso ativo, confira em cada um dos 3 perfis:

1. **Login novo** (sair e entrar de novo, ou abrir aba anônima): deve cair direto na tela "Período de demonstração encerrado", não na tela normal do papel.
2. **Sessão que já estava aberta**: sem fazer nada, espere até 5 minutos (ou troque de aba e volte) — a sessão deve ser bloqueada sozinha, sem precisar de um novo login. Essa é a revalidação periódica que foi adicionada na última rodada de correções.
3. **Tentar qualquer ação de escrita** (ex: funcionário tentando abrir caixa, gestor tentando cadastrar produto): deve vir o erro "Período de demonstração encerrado", mesmo que a tela ainda não tenha atualizado sozinha.

Depois do teste, **restaure o prazo real** pra não comer os 7 dias da demo
de verdade:

```sql
-- restaura os 7 dias (ajuste o intervalo se já tiver corrido tempo)
update configuracao set expira_em = now() + interval '7 days' where id = 1;
```
