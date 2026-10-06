-- reset_demo.sql
-- Rode isso inteiro no SQL Editor do Supabase, logo ANTES de enviar o
-- link da demo pro Ebrahim. Pode rodar de novo com segurança sempre que
-- precisar resetar (é seguro repetir).
--
-- O que faz:
--   1. Apaga tudo que foi gerado em testes (vendas, itens, estoque, turnos, auditoria).
--   2. Remove qualquer produto de teste chamado "TESTE".
--   3. Recoloca 20 unidades de estoque inicial em cada produto real.
--   4. Renova o prazo de demonstração pra 7 dias a partir de agora.
--
-- Não mexe nos nomes dos perfis (Ebrahim/Fátima/João/Manuel) — isso é
-- feito uma vez só, não faz parte do reset.

begin;

delete from itens_venda;
delete from vendas;
delete from movimentos_estoque;
delete from turnos;
delete from auditoria;

delete from produtos where nome = 'TESTE';

insert into movimentos_estoque (produto_id, tipo, quantidade, usuario_id, motivo)
select id, 'entrada', 20, (select id from profiles where papel = 'gestor' limit 1), 'Estoque inicial de demonstração'
from produtos;

update configuracao
set expira_em = now() + interval '7 days', modo_demo = true
where id = 1;

commit;

-- Confira o resultado:
select 'produtos' as tabela, count(*) from produtos
union all
select 'movimentos_estoque', count(*) from movimentos_estoque
union all
select 'vendas', count(*) from vendas
union all
select 'turnos', count(*) from turnos
union all
select 'auditoria', count(*) from auditoria;

select expira_em, modo_demo from configuracao where id = 1;
