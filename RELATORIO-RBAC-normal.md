# Relatório de verificação RBAC — bateria normal

Gerado em 2026-10-06T21:12:58.358Z

| Papel | Ação | Resultado | Detalhe |
|---|---|---|---|
| gestor | abrir_turno (RPC) | ✅ bloqueado | erro: Apenas funcionários abrem turno. |
| gestor | registrar_venda (RPC) | ✅ bloqueado | erro: Apenas funcionários registram vendas. |
| gestor | fechar_turno (RPC, turno inexistente/alheio) | ✅ bloqueado | erro: Turno não encontrado, não é seu, ou já está fechado. |
| gestor | alterar registro de auditoria (update) | ✅ bloqueado | erro: permission denied for table auditoria |
| gestor | apagar registro de auditoria (delete) | ✅ bloqueado | erro: permission denied for table auditoria |
| gestor | alterar configuracao (expira_em) | ✅ bloqueado | erro: permission denied for table configuracao |
| funcionario | cadastrar produto (insert) | ✅ bloqueado | erro: new row violates row-level security policy for table "produtos" |
| funcionario | editar produto (update) | ✅ bloqueado | sem erro, mas 0 linhas afetadas/retornadas (RLS filtrou) |
| funcionario | entrada de estoque (RPC) | ✅ bloqueado | erro: Apenas o gestor dá entrada em estoque. |
| funcionario | ajuste de estoque (RPC) | ✅ bloqueado | erro: Apenas o gestor ajusta estoque. |
| funcionario | cancelar venda (RPC) | ✅ bloqueado | erro: Apenas o gestor cancela vendas. |
| funcionario | ler vendas de outros (select sem filtro) | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario | ler movimentos de estoque (motivo/quem fez) | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario | ler auditoria | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario | alterar registro de auditoria (update) | ✅ bloqueado | erro: permission denied for table auditoria |
| funcionario | apagar registro de auditoria (delete) | ✅ bloqueado | erro: permission denied for table auditoria |
| funcionario | alterar configuracao (expira_em) | ✅ bloqueado | erro: permission denied for table configuracao |
| dono | cadastrar produto (insert) | ✅ bloqueado | erro: new row violates row-level security policy for table "produtos" |
| dono | editar produto (update) | ✅ bloqueado | sem erro, mas 0 linhas afetadas/retornadas (RLS filtrou) |
| dono | entrada de estoque (RPC) | ✅ bloqueado | erro: Apenas o gestor dá entrada em estoque. |
| dono | ajuste de estoque (RPC) | ✅ bloqueado | erro: Apenas o gestor ajusta estoque. |
| dono | abrir_turno (RPC) | ✅ bloqueado | erro: Apenas funcionários abrem turno. |
| dono | registrar_venda (RPC) | ✅ bloqueado | erro: Apenas funcionários registram vendas. |
| dono | fechar_turno (RPC, turno inexistente/alheio) | ✅ bloqueado | erro: Turno não encontrado, não é seu, ou já está fechado. |
| dono | cancelar venda (RPC) | ✅ bloqueado | erro: Apenas o gestor cancela vendas. |
| dono | alterar registro de auditoria (update) | ✅ bloqueado | erro: permission denied for table auditoria |
| dono | apagar registro de auditoria (delete) | ✅ bloqueado | erro: permission denied for table auditoria |
| dono | alterar configuracao (expira_em) | ✅ bloqueado | erro: permission denied for table configuracao |
| sem_login | ler produtos | ✅ bloqueado | erro: permission denied for table produtos |
| sem_login | ler vendas | ✅ bloqueado | erro: permission denied for table vendas |
| sem_login | estoque_produtos (RPC) | ✅ bloqueado | erro: Não autenticado. |
| sem_login | registrar_venda (RPC) | ✅ bloqueado | erro: Não autenticado. |
| sem_login | cadastrar produto (insert) | ✅ bloqueado | erro: permission denied for table produtos |
| sem_login | alterar configuracao | ✅ bloqueado | erro: permission denied for table configuracao |
| qualquer_papel | trocar a própria senha via auth.updateUser | ⚠️ NÃO TESTADO | não testado ao vivo — cadastro de conta descartável falhou (Signups not allowed for this instance). Por padrão do Supabase, qualquer usuário autenticado pode trocar a própria senha/e-mail via auth.updateUser, independente de papel — isso não é algo que RLS controle. |

## Nenhuma ação proibida foi permitida nesta bateria.
