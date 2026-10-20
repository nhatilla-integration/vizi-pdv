-- Migration 0002: acesso ilimitado pra contas específicas (a dona do
-- produto), sem depender do prazo global de demonstração.
-- Rode no SQL Editor do projeto Supabase do Vizi Vendas.

alter table profiles
  add column if not exists acesso_ilimitado boolean not null default false;

-- sistema_ativo() passa a ser verdadeiro se o prazo normal estiver
-- valendo OU se o perfil logado tiver acesso_ilimitado = true.
-- Contas de demonstração (Ebrahim, Fátima, João, Manuel) continuam
-- presas ao prazo normal — só as 3 contas marcadas abaixo ignoram.
create or replace function sistema_ativo()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    coalesce((select acesso_ilimitado from profiles where id = auth.uid()), false)
    or coalesce((select now() <= expira_em from configuracao where id = 1), false);
$$;

-- Depois de criar os 3 usuários (Authentication -> Users -> Add user,
-- com os e-mails/senha que combinamos), rode isto trocando os UUIDs
-- pelos de cada conta:
--
-- insert into profiles (id, nome, papel, acesso_ilimitado) values
--   ('<uuid-gestor>', 'Natilla', 'gestor', true),
--   ('<uuid-dono>', 'Natilla', 'dono', true),
--   ('<uuid-funcionario>', 'Natilla', 'funcionario', true);
