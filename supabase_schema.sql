-- ==============================================================================
-- SCRIPT DE CRIAÇÃO E CONFIGURAÇÃO DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- Evento Oficial: Encontro Los Felas
-- ==============================================================================

-- 1. Habilitar extensões necessárias
create extension if not exists "pgcrypto";

-- 2. Tabela de Eleitores (participantes votantes)
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
  data date not null default current_date,
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  criado_em timestamptz default now() not null
);

-- 4. Tabela de Equipes
create table if not exists public.equipes (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  criado_em timestamptz default now() not null
);

-- 5. Tabela de Carros (veículos participantes)
create table if not exists public.carros (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  numero_inscricao text not null,
  modelo text not null,
  ano integer not null default 2000,
  altura_mm integer not null default 0,
  url_foto text,
  nome_dono text not null default '',
  genero text default 'M' check (genero in ('M', 'F')),
  telefone_dono text,
  equipe text, -- Nome da equipe (redundância para busca rápida)
  equipe_id uuid references public.equipes(id) on delete set null,
  pessoas_equipe integer not null default 0,
  km_rodado integer not null default 0,
  criado_em timestamptz default now() not null
);

-- 6. Tabela de Categorias
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null,
  tipo text not null default 'popular' check (tipo in ('popular', 'interna')),
  campos_requeridos text[] not null default '{}'::text[],
  criado_em timestamptz default now() not null
);

-- 7. Tabela de Associação (Carro x Categoria)
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

-- ==============================================================================
-- POLÍTICAS DE ACESSO (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
alter table public.eleitores enable row level security;
alter table public.eventos enable row level security;
alter table public.equipes enable row level security;
alter table public.carros enable row level security;
alter table public.categorias enable row level security;
alter table public.carro_categorias enable row level security;
alter table public.votos enable row level security;

-- Políticas de acesso livre para a aplicação web pública
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

-- ==============================================================================
-- SEED DE DADOS INICIAIS (LOS FELAS)
-- ==============================================================================

-- Evento inicial padrão
insert into public.eventos (nome, data, status)
values ('Encontro Los Felas', current_date, 'aberto')
on conflict do nothing;

-- As 5 Categorias Oficiais do Los Felas
insert into public.categorias (nome, tipo, campos_requeridos) values
  ('Carro mais antigo', 'interna', array[]::text[]),
  ('Destaque masculino', 'popular', array['genero', 'foto']),
  ('Destaque feminino', 'popular', array['genero', 'foto']),
  ('Destaque Turbo', 'popular', array['foto']),
  ('Destaque Jeep (Altura)', 'interna', array['altura_mm'])
on conflict (nome) do update set 
  tipo = excluded.tipo, 
  campos_requeridos = excluded.campos_requeridos;

-- ==============================================================================
-- ÍNDICES DE ALTA PERFORMANCE (Evita Statement Timeout em picos de votação)
-- ==============================================================================
create index if not exists idx_carros_evento_id on public.carros(evento_id);
create index if not exists idx_carros_equipe_id on public.carros(equipe_id);
create index if not exists idx_carro_categorias_carro_id on public.carro_categorias(carro_id);
create index if not exists idx_carro_categorias_categoria_id on public.carro_categorias(categoria_id);
create index if not exists idx_votos_evento_id on public.votos(evento_id);
create index if not exists idx_votos_eleitor_evento on public.votos(eleitor_id, evento_id);
create index if not exists idx_votos_carro_id on public.votos(carro_id);
create index if not exists idx_votos_categoria_id on public.votos(categoria_id);
create index if not exists idx_eleitores_id on public.eleitores(id);

-- ==============================================================================
-- HABILITAR REALTIME (Para atualização instantânea de votos e ranking ao vivo)
-- ==============================================================================
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.votos;
    alter publication supabase_realtime add table public.carros;
    alter publication supabase_realtime add table public.eventos;
    alter publication supabase_realtime add table public.categorias;
  end if;
exception when others then
  -- Silently continue se a tabela já estiver na publicação
end $$;
