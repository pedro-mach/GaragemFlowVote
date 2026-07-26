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

-- 4. Tabela de Equipes
create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  criado_em timestamptz default now() not null
);

-- 5. Tabela de Carros
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
  equipe text, -- nome da equipe (redundância para compatibilidade)
  equipe_id uuid references public.equipes(id) on delete set null, -- FK para equipe
  pessoas_equipe integer not null default 0, -- nº de pessoas uniformizadas que vieram com este carro
  km_rodado integer not null default 0,
  criado_em timestamptz default now() not null
);

-- 6. Tabela de Categorias
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null, -- ex: 'Mais Bonito', 'Destaque', 'Mais Baixo'
  tipo text not null default 'popular' check (tipo in ('popular', 'interna')), -- 'popular' (público vota), 'interna' (organizadores decidem)
  campos_requeridos text[] not null default '{}'::text[],
  criado_em timestamptz default now() not null
);

-- 7. Tabela de Inscrições (Carro × Categoria) — em quais categorias o carro concorre
create table if not exists public.carro_categorias (
  id uuid primary key default gen_random_uuid(),
  carro_id uuid not null references public.carros(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  criado_em timestamptz default now() not null,
  constraint unique_carro_categoria unique (carro_id, categoria_id)
);

-- 8. Tabela de Votos
create table if not exists public.votos (
  id uuid primary key default gen_random_uuid(),
  eleitor_id uuid not null references public.eleitores(id) on delete cascade,
  carro_id uuid not null references public.carros(id) on delete cascade,
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  evento_id uuid not null references public.eventos(id) on delete cascade,
  criado_em timestamptz default now() not null,
  constraint unique_eleitor_categoria_evento unique (eleitor_id, categoria_id, evento_id)
);

-- Habilitar RLS (Row Level Security)
alter table public.eleitores enable row level security;
alter table public.eventos enable row level security;
alter table public.equipes enable row level security;
alter table public.carros enable row level security;
alter table public.categorias enable row level security;
alter table public.carro_categorias enable row level security;
alter table public.votos enable row level security;

-- Criar políticas de acesso aberto temporárias para funcionamento do app cliente
drop policy if exists "Acesso livre a eleitores" on public.eleitores;
create policy "Acesso livre a eleitores" on public.eleitores for all using (true) with check (true);

drop policy if exists "Acesso livre a eventos" on public.eventos;
create policy "Acesso livre a eventos" on public.eventos for all using (true) with check (true);

drop policy if exists "Acesso livre a equipes" on public.equipes;
create policy "Acesso livre a equipes" on public.equipes for all using (true) with check (true);

drop policy if exists "Acesso livre a carros" on public.carros;
create policy "Acesso livre a carros" on public.carros for all using (true) with check (true);

drop policy if exists "Acesso livre a categorias" on public.categorias;
create policy "Acesso livre a categorias" on public.categorias for all using (true) with check (true);

drop policy if exists "Acesso livre a carro_categorias" on public.carro_categorias;
create policy "Acesso livre a carro_categorias" on public.carro_categorias for all using (true) with check (true);

drop policy if exists "Acesso livre a votos" on public.votos;
create policy "Acesso livre a votos" on public.votos for all using (true) with check (true);

-- 9. Categorias Iniciais Padrão
insert into public.categorias (nome, tipo, campos_requeridos) values
  ('Destaque Masculino', 'popular', array['genero', 'foto']),
  ('Destaque Feminino', 'popular', array['genero', 'foto']),
  ('Mais antigo', 'interna', array[]::text[]),
  ('Maior equipe uniformizada', 'interna', array['equipe']),
  ('Maior rodagem', 'interna', array['km_rodado'])
on conflict (nome) do update set tipo = excluded.tipo, campos_requeridos = excluded.campos_requeridos;

-- ─── ÍNDICES DE ALTA PERFORMANCE (Evita Erro 57014 Statement Timeout) ─────────────────
create index if not exists idx_carros_evento_id on public.carros(evento_id);
create index if not exists idx_carros_equipe_id on public.carros(equipe_id);

create index if not exists idx_carro_categorias_carro_id on public.carro_categorias(carro_id);
create index if not exists idx_carro_categorias_categoria_id on public.carro_categorias(categoria_id);

create index if not exists idx_votos_evento_id on public.votos(evento_id);
create index if not exists idx_votos_eleitor_evento on public.votos(eleitor_id, evento_id);
create index if not exists idx_votos_carro_id on public.votos(carro_id);
create index if not exists idx_votos_categoria_id on public.votos(categoria_id);

create index if not exists idx_eleitores_id on public.eleitores(id);


