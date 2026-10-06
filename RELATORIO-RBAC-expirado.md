# Relatório de verificação RBAC — bateria de expiração

Gerado em 2026-10-06T22:36:32.087Z

| Papel | Ação | Resultado | Detalhe |
|---|---|---|---|
| gestor | [expirado] ler produtos | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| gestor | [expirado] ler vendas | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| gestor | [expirado] entrada de estoque (RPC) | ✅ bloqueado | erro: Período de demonstração encerrado. |
| gestor | [expirado] ler auditoria | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario1 | [expirado] ler produtos | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario1 | [expirado] ler vendas | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario1 | [expirado] abrir_turno (RPC) | ✅ bloqueado | erro: Período de demonstração encerrado. |
| funcionario2 | [expirado] ler produtos | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario2 | [expirado] ler vendas | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario2 | [expirado] abrir_turno (RPC) | ✅ bloqueado | erro: Período de demonstração encerrado. |
| dono | [expirado] ler produtos | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| dono | [expirado] ler vendas | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| dono | [expirado] ler auditoria | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| sem_login | [expirado] ler produtos | ✅ bloqueado | erro: permission denied for table produtos |
| sem_login | [expirado] ler vendas | ✅ bloqueado | erro: permission denied for table vendas |

## Nenhuma ação proibida foi permitida nesta bateria.
