# Relatório de verificação RBAC — bateria de expiração

Gerado em 2026-10-06T21:23:06.848Z

| Papel | Ação | Resultado | Detalhe |
|---|---|---|---|
| gestor | [expirado] ler produtos | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| gestor | [expirado] entrada de estoque (RPC) | ✅ bloqueado | erro: Período de demonstração encerrado. |
| funcionario | [expirado] ler produtos | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| funcionario | [expirado] abrir_turno (RPC) | ✅ bloqueado | erro: Período de demonstração encerrado. |
| dono | [expirado] ler produtos | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| dono | [expirado] ler auditoria | ✅ bloqueado | 0 linhas retornadas (RLS filtrou) |
| sem_login | [expirado] ler produtos | ✅ bloqueado | erro: permission denied for table produtos |

## Nenhuma ação proibida foi permitida nesta bateria.
