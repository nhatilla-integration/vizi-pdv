-- reset_demo.sql
-- Rode isso inteiro no SQL Editor do Supabase, logo ANTES de enviar o
-- link da demo pro Ebrahim. Pode rodar de novo com segurança sempre que
-- precisar resetar (é seguro repetir).
--
-- O que faz, nesta ordem:
--   1. Apaga itens_venda, vendas, movimentos_estoque, turnos (nessa ordem,
--      por causa das referências entre as tabelas) e qualquer produto de
--      teste chamado "TESTE".
--   2. Recoloca o estoque inicial: 50 unidades pra maioria dos produtos,
--      exceto Água 500ml, Refresco de ananás 300ml e Refresco de manga
--      300ml, que ficam de propósito abaixo do estoque mínimo deles —
--      assim o alerta de estoque baixo continua aparecendo na demo
--      (esses 3 têm o maior estoque_minimo do catálogo: 30/20/20).
--   3. Só então apaga a auditoria — depois de tudo o resto, pra não
--      sobrar nem o rastro do próprio reset (a entrada de estoque acima
--      também gera linha de auditoria, por isso essa ordem importa).
--   4. Define a expiração pra uma data fixa (ajuste conforme o combinado).
-- Tudo dentro de begin/commit: ou roda tudo, ou não roda nada.
--
-- Não mexe nos nomes dos perfis (Ebrahim/Fátima/João/Manuel) — isso é
-- feito uma vez só, não faz parte do reset.
--
-- CHECKLIST MANUAL (fazer no painel, não dá pra fazer por SQL):
--   Antes de cada envio, resete a senha das 4 contas de demonstração
--   pra valores conhecidos (Authentication -> Users -> "..." -> Reset
--   password). Qualquer uma delas pode trocar a própria senha via API
--   direta (comportamento padrão do Supabase Auth, não é papel-
--   específico e não muda nenhuma permissão) — resetar antes de cada
--   envio garante que você sempre sabe a senha de quem vai testar.

begin;

delete from itens_venda;
delete from vendas;
delete from movimentos_estoque;
delete from turnos;

delete from produtos where nome = 'TESTE';

insert into movimentos_estoque (produto_id, tipo, quantidade, usuario_id, motivo)
select
  id,
  'entrada',
  case nome
    when 'Água 500ml' then 10
    when 'Refresco de ananás 300ml' then 5
    when 'Refresco de manga 300ml' then 15
    else 50
  end,
  (select id from profiles where papel = 'gestor' limit 1),
  'Estoque inicial de demonstração'
from produtos;

delete from auditoria;

update configuracao
set expira_em = '2026-10-13 23:59:00+02', modo_demo = true
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
