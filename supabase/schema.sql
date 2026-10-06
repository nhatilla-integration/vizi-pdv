-- Vizi PDV — schema completo
-- Rode este arquivo inteiro no SQL Editor do Supabase (projeto novo, vazio).

create extension if not exists "pgcrypto";

-- =========================================================================
-- TABELAS
-- =========================================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  papel text not null check (papel in ('gestor', 'funcionario', 'dono'))
);

-- Categorias fixas (mantém em sincronia com o CHECK abaixo e com o <select>
-- do frontend): Vestuário, Souvenir, Doces, Bebidas.
-- Tamanhos fixos pra Vestuário: PP, P, M, G, XG, XXG, XXXG.
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null check (categoria in ('Vestuário', 'Souvenir', 'Doces', 'Bebidas')),
  tamanho text check (tamanho in ('PP', 'P', 'M', 'G', 'XG', 'XXG', 'XXXG')),
  preco numeric not null check (preco >= 0),
  estoque_minimo int not null default 0 check (estoque_minimo >= 0),
  ativo boolean not null default true,
  -- referência da nota fiscal de origem desse produto (opcional)
  nf text,
  criado_em timestamptz not null default now()
);

create table movimentos_estoque (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references produtos(id),
  tipo text not null check (tipo in ('entrada', 'venda', 'ajuste', 'cancelamento')),
  -- quantidade é sempre o delta assinado aplicado ao estoque:
  -- entrada > 0, venda < 0, cancelamento > 0 (devolução), ajuste pode ser + ou -
  quantidade int not null,
  usuario_id uuid not null references profiles(id),
  motivo text,
  -- referência da nota fiscal, preenchida normalmente só em entradas (opcional)
  nf text,
  criado_em timestamptz not null default now()
);

create table turnos (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null references profiles(id),
  aberto_em timestamptz not null default now(),
  fechado_em timestamptz,
  valor_inicial numeric not null default 0,
  valor_contado numeric,
  status text not null default 'aberto' check (status in ('aberto', 'fechado'))
);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references turnos(id),
  funcionario_id uuid not null references profiles(id),
  total numeric not null default 0,
  forma_pagamento text not null check (forma_pagamento in ('numerario', 'carteira_movel', 'cartao')),
  status text not null default 'concluida' check (status in ('concluida', 'cancelada')),
  cancelada_por uuid references profiles(id),
  motivo_cancelamento text,
  criado_em timestamptz not null default now()
);

create table itens_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas(id),
  produto_id uuid not null references produtos(id),
  quantidade int not null check (quantidade > 0),
  preco_unitario numeric not null check (preco_unitario >= 0)
);

create table auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references profiles(id),
  acao text not null,
  tabela text not null,
  registro_id uuid,
  dados_antes jsonb,
  dados_depois jsonb,
  motivo text,
  criado_em timestamptz not null default now()
);

create table configuracao (
  id int primary key default 1,
  modo_demo boolean not null default true,
  expira_em timestamptz not null,
  constraint apenas_uma_linha check (id = 1)
);

-- =========================================================================
-- VIEW: estoque atual (derivado dos movimentos, nunca editado à mão)
-- =========================================================================

create view estoque_atual
with (security_invoker = true)
as
select produto_id, coalesce(sum(quantidade), 0) as quantidade
from movimentos_estoque
group by produto_id;

-- =========================================================================
-- FUNÇÕES AUXILIARES
-- =========================================================================

create or replace function meu_papel()
returns text
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select papel from profiles where id = auth.uid();
$$;

create or replace function sistema_ativo()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce((select now() <= expira_em from configuracao where id = 1), false);
$$;

-- Leitura mínima de estoque pra tela de vendas do funcionário: ele não lê
-- movimentos_estoque diretamente (só gestor/dono), mas precisa saber o
-- saldo pra montar a grade de produtos. Função estreita, só devolve
-- produto_id + quantidade, nada de usuario_id/motivo.
create or replace function estoque_produtos()
returns table (produto_id uuid, quantidade bigint)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not sistema_ativo() then
    raise exception 'Período de demonstração encerrado.';
  end if;

  if coalesce(meu_papel(), '') not in ('gestor', 'funcionario', 'dono') then
    raise exception 'Acesso negado.';
  end if;

  return query
  select m.produto_id, coalesce(sum(m.quantidade), 0)::bigint
  from movimentos_estoque m
  group by m.produto_id;
end;
$$;

-- =========================================================================
-- TRIGGER DE AUDITORIA (genérica, usada em várias tabelas)
-- =========================================================================

create or replace function registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into auditoria (usuario_id, acao, tabela, registro_id, dados_antes, dados_depois, motivo, criado_em)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    case when tg_op = 'UPDATE' and tg_table_name = 'vendas' then to_jsonb(new)->>'motivo_cancelamento' else null end,
    now()
  );
  return coalesce(new, old);
end;
$$;

create trigger auditoria_produtos
after insert or update on produtos
for each row execute function registrar_auditoria();

create trigger auditoria_vendas
after insert or update on vendas
for each row execute function registrar_auditoria();

create trigger auditoria_turnos
after insert or update on turnos
for each row execute function registrar_auditoria();

create trigger auditoria_movimentos_estoque
after insert on movimentos_estoque
for each row execute function registrar_auditoria();

-- =========================================================================
-- RPC: registrar_venda — atômica, valida estoque, só funcionário, só com
-- turno aberto, bloqueada se o sistema estiver expirado.
-- =========================================================================

create or replace function registrar_venda(p_itens jsonb, p_forma_pagamento text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_turno_id uuid;
  v_venda_id uuid;
  v_item record;
  v_preco numeric;
  v_ativo boolean;
  v_estoque int;
  v_total numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not sistema_ativo() then
    raise exception 'Período de demonstração encerrado.';
  end if;

  if coalesce(meu_papel(), '') <> 'funcionario' then
    raise exception 'Apenas funcionários registram vendas.';
  end if;

  if p_forma_pagamento not in ('numerario', 'carteira_movel', 'cartao') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  select id into v_turno_id
  from turnos
  where funcionario_id = auth.uid() and status = 'aberto'
  order by aberto_em desc
  limit 1;

  if v_turno_id is null then
    raise exception 'Nenhum turno aberto.';
  end if;

  if jsonb_array_length(p_itens) = 0 then
    raise exception 'A venda precisa ter pelo menos um item.';
  end if;

  -- soma por produto primeiro: o mesmo produto pode vir em mais de uma
  -- linha do carrinho, e precisamos checar o total pedido dele, não cada
  -- linha isoladamente.
  create temporary table _carrinho on commit drop as
  select
    (elem->>'produto_id')::uuid as produto_id,
    sum((elem->>'quantidade')::int) as quantidade
  from jsonb_array_elements(p_itens) as elem
  group by (elem->>'produto_id')::uuid;

  -- trava a linha do produto (ordem estável, evita deadlock entre vendas
  -- concorrentes com produtos em comum) antes de checar o estoque — sem
  -- isso, duas vendas simultâneas do mesmo item podiam ambas ver saldo
  -- suficiente e resultar em estoque negativo.
  for v_item in select * from _carrinho order by produto_id
  loop
    if v_item.quantidade is null or v_item.quantidade <= 0 then
      raise exception 'Quantidade inválida para o produto %', v_item.produto_id;
    end if;

    select preco, ativo into v_preco, v_ativo
    from produtos
    where id = v_item.produto_id
    for update;

    if v_preco is null then
      raise exception 'Produto % não encontrado', v_item.produto_id;
    end if;

    if not v_ativo then
      raise exception 'Produto % está inativo', v_item.produto_id;
    end if;

    select coalesce(quantidade, 0) into v_estoque
    from estoque_atual
    where produto_id = v_item.produto_id;

    if coalesce(v_estoque, 0) < v_item.quantidade then
      raise exception 'Estoque insuficiente para o produto %', v_item.produto_id;
    end if;

    v_total := v_total + (v_preco * v_item.quantidade);
  end loop;

  insert into vendas (turno_id, funcionario_id, total, forma_pagamento, status)
  values (v_turno_id, auth.uid(), v_total, p_forma_pagamento, 'concluida')
  returning id into v_venda_id;

  for v_item in
    select c.produto_id, c.quantidade, p.preco
    from _carrinho c
    join produtos p on p.id = c.produto_id
  loop
    insert into itens_venda (venda_id, produto_id, quantidade, preco_unitario)
    values (v_venda_id, v_item.produto_id, v_item.quantidade, v_item.preco);

    insert into movimentos_estoque (produto_id, tipo, quantidade, usuario_id, motivo)
    values (v_item.produto_id, 'venda', -v_item.quantidade, auth.uid(), 'Venda ' || v_venda_id::text);
  end loop;

  return v_venda_id;
end;
$$;

-- =========================================================================
-- RPC: cancelar_venda — só gestor, motivo obrigatório, devolve ao estoque
-- =========================================================================

create or replace function cancelar_venda(p_venda_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not sistema_ativo() then
    raise exception 'Período de demonstração encerrado.';
  end if;

  if coalesce(meu_papel(), '') <> 'gestor' then
    raise exception 'Apenas o gestor cancela vendas.';
  end if;

  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Motivo do cancelamento é obrigatório.';
  end if;

  -- trava a venda antes de checar o status: evita que dois cliques
  -- simultâneos no "cancelar" devolvam o estoque em dobro.
  select status into v_status
  from vendas
  where id = p_venda_id
  for update;

  if v_status is null then
    raise exception 'Venda não encontrada.';
  end if;

  if v_status <> 'concluida' then
    raise exception 'Venda já cancelada.';
  end if;

  update vendas
  set status = 'cancelada', cancelada_por = auth.uid(), motivo_cancelamento = p_motivo
  where id = p_venda_id;

  for v_item in select produto_id, quantidade from itens_venda where venda_id = p_venda_id
  loop
    insert into movimentos_estoque (produto_id, tipo, quantidade, usuario_id, motivo)
    values (v_item.produto_id, 'cancelamento', v_item.quantidade, auth.uid(), p_motivo);
  end loop;
end;
$$;

-- =========================================================================
-- RPC: ajustar_estoque e registrar_entrada_estoque — só gestor
-- =========================================================================

create or replace function ajustar_estoque(p_produto_id uuid, p_quantidade int, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estoque int;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not sistema_ativo() then
    raise exception 'Período de demonstração encerrado.';
  end if;

  if coalesce(meu_papel(), '') <> 'gestor' then
    raise exception 'Apenas o gestor ajusta estoque.';
  end if;

  if p_motivo is null or trim(p_motivo) = '' then
    raise exception 'Motivo do ajuste é obrigatório.';
  end if;

  if p_quantidade = 0 then
    raise exception 'A quantidade do ajuste não pode ser zero.';
  end if;

  -- trava a linha do produto antes de checar o saldo, pelo mesmo motivo
  -- do registrar_venda: evita condição de corrida com outra escrita
  -- simultânea no mesmo produto.
  perform 1 from produtos where id = p_produto_id for update;
  if not found then
    raise exception 'Produto % não encontrado', p_produto_id;
  end if;

  select coalesce(quantidade, 0) into v_estoque
  from estoque_atual
  where produto_id = p_produto_id;

  if coalesce(v_estoque, 0) + p_quantidade < 0 then
    raise exception 'Ajuste deixaria o estoque negativo (atual: %, ajuste: %)', coalesce(v_estoque, 0), p_quantidade;
  end if;

  insert into movimentos_estoque (produto_id, tipo, quantidade, usuario_id, motivo)
  values (p_produto_id, 'ajuste', p_quantidade, auth.uid(), p_motivo);
end;
$$;

create or replace function registrar_entrada_estoque(
  p_produto_id uuid,
  p_quantidade int,
  p_motivo text,
  p_nf text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not sistema_ativo() then
    raise exception 'Período de demonstração encerrado.';
  end if;

  if coalesce(meu_papel(), '') <> 'gestor' then
    raise exception 'Apenas o gestor dá entrada em estoque.';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'Quantidade de entrada deve ser positiva.';
  end if;

  insert into movimentos_estoque (produto_id, tipo, quantidade, usuario_id, motivo, nf)
  values (p_produto_id, 'entrada', p_quantidade, auth.uid(), coalesce(p_motivo, 'Entrada de estoque'), p_nf);
end;
$$;

-- =========================================================================
-- RPC: abrir_turno e fechar_turno
-- =========================================================================

create or replace function abrir_turno(p_valor_inicial numeric)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_turno_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not sistema_ativo() then
    raise exception 'Período de demonstração encerrado.';
  end if;

  if coalesce(meu_papel(), '') <> 'funcionario' then
    raise exception 'Apenas funcionários abrem turno.';
  end if;

  if exists (select 1 from turnos where funcionario_id = auth.uid() and status = 'aberto') then
    raise exception 'Você já tem um turno aberto.';
  end if;

  insert into turnos (funcionario_id, aberto_em, valor_inicial, status)
  values (auth.uid(), now(), coalesce(p_valor_inicial, 0), 'aberto')
  returning id into v_turno_id;

  return v_turno_id;
end;
$$;

create or replace function fechar_turno(p_turno_id uuid, p_valor_contado numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_valor_inicial numeric;
  v_esperado_numerario numeric;
  v_esperado_cartao numeric;
  v_esperado_carteira numeric;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;

  if not sistema_ativo() then
    raise exception 'Período de demonstração encerrado.';
  end if;

  -- trava o turno antes de fechar, pra evitar dois fechamentos
  -- simultâneos do mesmo turno (ex: duplo clique) gerando resultado
  -- inconsistente.
  select valor_inicial into v_valor_inicial
  from turnos
  where id = p_turno_id and funcionario_id = auth.uid() and status = 'aberto'
  for update;

  if v_valor_inicial is null then
    raise exception 'Turno não encontrado, não é seu, ou já está fechado.';
  end if;

  select coalesce(sum(total), 0) into v_esperado_numerario
  from vendas where turno_id = p_turno_id and status = 'concluida' and forma_pagamento = 'numerario';

  select coalesce(sum(total), 0) into v_esperado_cartao
  from vendas where turno_id = p_turno_id and status = 'concluida' and forma_pagamento = 'cartao';

  select coalesce(sum(total), 0) into v_esperado_carteira
  from vendas where turno_id = p_turno_id and status = 'concluida' and forma_pagamento = 'carteira_movel';

  update turnos
  set fechado_em = now(), valor_contado = p_valor_contado, status = 'fechado'
  where id = p_turno_id;

  return jsonb_build_object(
    'valor_inicial', v_valor_inicial,
    'esperado_numerario', v_valor_inicial + v_esperado_numerario,
    'esperado_cartao', v_esperado_cartao,
    'esperado_carteira_movel', v_esperado_carteira,
    'valor_contado', p_valor_contado,
    'diferenca', p_valor_contado - (v_valor_inicial + v_esperado_numerario)
  );
end;
$$;

-- =========================================================================
-- ROW LEVEL SECURITY — nega tudo por padrão, libera só o necessário.
-- Nenhuma tabela sensível recebe policy de INSERT/UPDATE/DELETE direta:
-- toda escrita passa pelas funções acima (security definer, dono = postgres,
-- então ignoram RLS internamente mesmo com grants revogados do cliente).
-- =========================================================================

alter table profiles enable row level security;
alter table produtos enable row level security;
alter table movimentos_estoque enable row level security;
alter table turnos enable row level security;
alter table vendas enable row level security;
alter table itens_venda enable row level security;
alter table auditoria enable row level security;
alter table configuracao enable row level security;

-- profiles: cada um vê o próprio; gestor e dono veem todos.
-- Não gated por sistema_ativo() de propósito — precisa funcionar mesmo
-- expirado, pra app saber quem é o usuário e mostrar a tela certa.
create policy profiles_select on profiles
  for select
  using (id = auth.uid() or meu_papel() in ('gestor', 'dono'));

-- configuracao: leitura liberada pra qualquer autenticado (precisa saber se
-- expirou e mostrar a faixa de demonstração). Sem policy de escrita —
-- só é alterável direto no banco, como pedido.
create policy configuracao_select on configuracao
  for select
  using (auth.uid() is not null);

-- produtos: leitura liberada pra qualquer autenticado com sistema ativo;
-- escrita só gestor.
create policy produtos_select on produtos
  for select
  using (sistema_ativo() and auth.uid() is not null);

create policy produtos_insert on produtos
  for insert
  with check (sistema_ativo() and meu_papel() = 'gestor');

create policy produtos_update on produtos
  for update
  using (sistema_ativo() and meu_papel() = 'gestor')
  with check (sistema_ativo() and meu_papel() = 'gestor');

-- movimentos_estoque: leitura só gestor/dono (tem usuario_id e motivo,
-- é informação interna). Sem policy de insert/update/delete — só as
-- funções RPC gravam aqui.
create policy movimentos_estoque_select on movimentos_estoque
  for select
  using (sistema_ativo() and meu_papel() in ('gestor', 'dono'));

-- turnos: funcionário vê os próprios; gestor/dono veem todos.
-- Sem policy de insert/update — só via abrir_turno/fechar_turno.
create policy turnos_select on turnos
  for select
  using (sistema_ativo() and (funcionario_id = auth.uid() or meu_papel() in ('gestor', 'dono')));

-- vendas: funcionário vê as próprias; gestor/dono veem todas.
-- Sem policy de insert/update — só via registrar_venda/cancelar_venda.
create policy vendas_select on vendas
  for select
  using (sistema_ativo() and (funcionario_id = auth.uid() or meu_papel() in ('gestor', 'dono')));

-- itens_venda: segue a visibilidade da venda associada.
create policy itens_venda_select on itens_venda
  for select
  using (
    sistema_ativo()
    and exists (
      select 1 from vendas v
      where v.id = itens_venda.venda_id
        and (v.funcionario_id = auth.uid() or meu_papel() in ('gestor', 'dono'))
    )
  );

-- auditoria: só gestor e dono leem. SEM policy de update ou delete — é
-- isso que garante que o rastro não pode ser alterado nem apagado por
-- ninguém via API. Insert só acontece pelas triggers (security definer).
create policy auditoria_select on auditoria
  for select
  using (sistema_ativo() and meu_papel() in ('gestor', 'dono'));

-- =========================================================================
-- GRANTS — o Supabase concede INSERT/UPDATE/DELETE/TRUNCATE por padrão pra
-- anon E authenticated em toda tabela nova, e EXECUTE em toda função nova
-- pra PUBLIC. Aqui fechamos tudo primeiro e abrimos só o necessário; RLS
-- acima faz o resto do trabalho linha a linha.
-- =========================================================================

-- anon não participa deste sistema: ninguém usa sem login.
revoke all on all tables in schema public from anon;

-- Mesma regra pra objetos futuros: se uma tabela ou função nova for criada
-- depois (ex: numa migração), o anon não deve herdar acesso automaticamente.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;

-- O Postgres concede EXECUTE a PUBLIC por padrão em toda função nova, o que
-- vazaria pra authenticated também (PUBLIC é implícito em todo mundo). Isso
-- fecha essa porta pra funções futuras, do mesmo jeito que já revogamos
-- EXECUTE de PUBLIC nas funções que existem hoje.
alter default privileges in schema public revoke execute on functions from public;

-- authenticated: fecha tudo, depois abre seletivamente.
-- TRUNCATE nunca é devolvido — ele ignora RLS e apaga a tabela inteira,
-- então fica fora mesmo pra quem está autenticado.
revoke all on all tables in schema public from authenticated;

grant select on
  profiles, configuracao, produtos, movimentos_estoque,
  turnos, vendas, itens_venda, auditoria, estoque_atual
to authenticated;

grant insert, update on produtos to authenticated;

-- Funções: revoga de PUBLIC (grant automático do Postgres) e libera só pra
-- quem está logado. registrar_auditoria() não entra aqui — só é chamada
-- pelas triggers, nunca diretamente pelo cliente.
revoke execute on function meu_papel() from public;
revoke execute on function sistema_ativo() from public;
revoke execute on function estoque_produtos() from public;
revoke execute on function registrar_venda(jsonb, text) from public;
revoke execute on function cancelar_venda(uuid, text) from public;
revoke execute on function ajustar_estoque(uuid, int, text) from public;
revoke execute on function registrar_entrada_estoque(uuid, int, text, text) from public;
revoke execute on function abrir_turno(numeric) from public;
revoke execute on function fechar_turno(uuid, numeric) from public;

grant execute on function meu_papel() to authenticated;
grant execute on function sistema_ativo() to authenticated;
grant execute on function estoque_produtos() to authenticated;
grant execute on function registrar_venda(jsonb, text) to authenticated;
grant execute on function cancelar_venda(uuid, text) to authenticated;
grant execute on function ajustar_estoque(uuid, int, text) to authenticated;
grant execute on function registrar_entrada_estoque(uuid, int, text, text) to authenticated;
grant execute on function abrir_turno(numeric) to authenticated;
grant execute on function fechar_turno(uuid, numeric) to authenticated;

-- =========================================================================
-- REALTIME (opcional, mas combina com telas que atualizam sozinhas)
-- =========================================================================

alter publication supabase_realtime add table produtos;
alter publication supabase_realtime add table vendas;
alter publication supabase_realtime add table movimentos_estoque;

-- =========================================================================
-- CONFIGURAÇÃO INICIAL E SEED
-- =========================================================================

insert into configuracao (id, modo_demo, expira_em)
values (1, true, now() + interval '7 days');

insert into produtos (nome, categoria, preco, estoque_minimo) values
  ('Camiseta Moçambique', 'Vestuário', 450, 5),
  ('Boné bordado', 'Vestuário', 350, 5),
  ('Ímã de geladeira', 'Souvenir', 120, 10),
  ('Chaveiro de madeira', 'Souvenir', 90, 10),
  ('Colar de missangas', 'Souvenir', 180, 8),
  ('Pulseira artesanal', 'Souvenir', 85, 10),
  ('Estatueta de madeira pequena', 'Souvenir', 320, 5),
  ('Postal ilustrado', 'Souvenir', 40, 15),
  ('Chocolate Mocam 100g', 'Doces', 95, 12),
  ('Chocolate Mocam 200g', 'Doces', 170, 10),
  ('Bombons sortidos (caixa)', 'Doces', 260, 6),
  ('Caramelo de coco', 'Doces', 60, 15),
  ('Bolacha Maria pacote', 'Doces', 55, 15),
  ('Refresco de manga 300ml', 'Bebidas', 70, 20),
  ('Refresco de ananás 300ml', 'Bebidas', 70, 20),
  ('Água 500ml', 'Bebidas', 35, 30),
  ('Sumo de caju lata', 'Bebidas', 85, 15),
  ('Capulana pequena', 'Vestuário', 520, 4),
  ('Sandália artesanal', 'Vestuário', 380, 6),
  ('Ecobag estampada', 'Vestuário', 150, 8);

-- Entradas iniciais de estoque pra cada produto cadastrado acima (50
-- unidades cada, só pra ter saldo inicial de demonstração). O usuario_id
-- aqui precisa ser trocado pelo UUID real do gestor depois que ele for
-- criado (ver PLAN.md, passo "Criar os 3 usuários de teste").
-- Deixe comentado até existir um gestor de verdade:
--
-- insert into movimentos_estoque (produto_id, tipo, quantidade, usuario_id, motivo)
-- select id, 'entrada', 50, '<UUID_DO_GESTOR>', 'Estoque inicial de demonstração'
-- from produtos;
