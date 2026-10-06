-- Migration 0001: integridade de dados + índices
-- Rode isso no SQL Editor do projeto Supabase já existente do Vizi PDV.
-- (schema.sql também foi atualizado, então um projeto novo já nasce assim.)

-- =========================================================================
-- 1. Tamanho só faz sentido pra categoria "Vestuário".
-- Hoje o CHECK de `tamanho` aceita NULL em qualquer categoria, mas nada
-- impede um "Bebidas" com tamanho "G" via API direta. A UI já impede isso,
-- isso aqui fecha a mesma porta no banco.
-- =========================================================================
alter table produtos
  add constraint tamanho_so_vestuario
  check (categoria = 'Vestuário' or tamanho is null);

-- =========================================================================
-- 2. Valores de caixa não podem ser negativos.
-- Nem abrir_turno nem fechar_turno validavam isso — um valor inicial ou
-- contado negativo passava direto.
-- =========================================================================
alter table turnos
  add constraint valor_inicial_nao_negativo check (valor_inicial >= 0);

alter table turnos
  add constraint valor_contado_nao_negativo check (valor_contado is null or valor_contado >= 0);

-- Mensagens de erro amigáveis nas RPCs, antes de bater no CHECK acima.
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

  if p_valor_inicial is not null and p_valor_inicial < 0 then
    raise exception 'O valor inicial não pode ser negativo.';
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

  if p_valor_contado is null or p_valor_contado < 0 then
    raise exception 'O valor contado não pode ser negativo.';
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
-- 3. Índices nas colunas de filtro/join que crescem com o uso.
-- Hoje (poucos registros) não faz diferença; depois de meses de vendas
-- reais, Resumo/Histórico/Auditoria fariam full scan sem isso.
-- =========================================================================
create index if not exists idx_movimentos_estoque_produto_id on movimentos_estoque(produto_id);
create index if not exists idx_movimentos_estoque_criado_em on movimentos_estoque(criado_em);
create index if not exists idx_itens_venda_venda_id on itens_venda(venda_id);
create index if not exists idx_vendas_turno_id on vendas(turno_id);
create index if not exists idx_vendas_funcionario_id on vendas(funcionario_id);
create index if not exists idx_vendas_criado_em on vendas(criado_em);
create index if not exists idx_auditoria_criado_em on auditoria(criado_em);
create index if not exists idx_auditoria_usuario_id on auditoria(usuario_id);
create index if not exists idx_auditoria_tabela on auditoria(tabela);
