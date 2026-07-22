-- Script de Banco de Dados Supabase (PostgreSQL)
-- Projeto: GaragemFlowVote

-- 1. Habilitar extensões necessárias (se aplicável)
create extension if not exists "pgcrypto";

-- 2. Tabela de Eleitores
create table if not exists public.eleitores (
  id uuid primary key default gen_random_uuid(),
  cpf_hash text unique not null, -- Hash SHA-256 do CPF para privacidade
  data_nascimento date not null,
  criado_em timestamptz default now() not null
);

-- 3. Tabela de Eventos
create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data date not null,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  criado_em timestamptz default now() not null
);

-- 4. Tabela de Carros
create table if not exists public.carros (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  numero_inscricao text not null,
  modelo text not null,
  ano integer not null,
  altura_mm integer not null,
  url_foto text,
  nome_dono text not null default '',
  telefone_dono text,
  equipe text,
  km_rodado integer not null default 0,
  criado_em timestamptz default now() not null
);

-- 5. Tabela de Categorias
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null, -- ex: 'Mais Bonito', 'Destaque', 'Mais Baixo'
  tipo text not null default 'popular' check (tipo in ('popular', 'interna')), -- 'popular' (público vota), 'interna' (organizadores decidem)
  criado_em timestamptz default now() not null
);

-- 6. Tabela de Votos
create table if not exists public.votos (
  id uuid primary key default gen_random_uuid(),
  eleitor_id uuid not null references public.eleitores(id) on delete cascade,
  carro_id uuid not null references public.carros(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  evento_id uuid not null references public.eventos(id) on delete cascade,
  criado_em timestamptz default now() not null,
  constraint unique_eleitor_categoria_evento unique (eleitor_id, categoria_id, evento_id)
);

-- Habilitar RLS (Row Level Security) - para simplificar e garantir funcionamento imediato
-- nas configurações locais ou desenvolvimento rápido, desative RLS ou configure políticas permissivas.
alter table public.eleitores enable row level security;
alter table public.eventos enable row level security;
alter table public.carros enable row level security;
alter table public.categorias enable row level security;
alter table public.votos enable row level security;

-- Criar políticas de acesso aberto temporárias para funcionamento do app cliente
create policy "Acesso livre a eleitores" on public.eleitores for all using (true) with check (true);
create policy "Acesso livre a eventos" on public.eventos for all using (true) with check (true);
create policy "Acesso livre a carros" on public.carros for all using (true) with check (true);
create policy "Acesso livre a categorias" on public.categorias for all using (true) with check (true);
create policy "Acesso livre a votos" on public.votos for all using (true) with check (true);

-- 7. Categorias Iniciais Padrão
insert into public.categorias (id, nome, tipo) values
  ('22222222-2222-2222-2222-222222222222', 'Destaque Masculino', 'popular'),
  ('33333333-3333-3333-3333-333333333333', 'Destaque Feminino', 'popular'),
  ('44444444-4444-4444-4444-444444444444', 'Mais antigo', 'interna'),
  ('55555555-5555-5555-5555-555555555555', 'Maior equipe uniformizada', 'interna'),
  ('66666666-6666-6666-6666-666666666666', 'Maior rodagem', 'interna')
on conflict (id) do update set nome = excluded.nome, tipo = excluded.tipo;

