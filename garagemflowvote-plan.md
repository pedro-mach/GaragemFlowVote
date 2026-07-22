# Projeto: Sistema de Votação para Eventos Automotivos
Um aplicativo web mobile-first para votação em tempo real em eventos de carros, eliminando contagens manuais. Arquitetura baseada em React (Vite), Tailwind CSS e Supabase (PostgreSQL + Auth), com deploy na Vercel.

**DESIGN SYSTEM (REQUIRED):**
- Platform: Web, Mobile-first (90% do tráfego será via celular no evento)
- Theme: Dark, automotivo, moderno e de alto contraste.
- Background: Deep Carbon (#121212)
- Surface: Garage Gray (#1E1E1E) para cards de carros e painéis
- Primary Accent: Racing Red (#E63946) para botões principais de ação e badges de "Votação Aberta"
- Secondary Accent: Neon Blue (#457B9D) para categorias e navegação
- Text Primary: Pure White (#FFFFFF) para títulos e placas
- Text Secondary: Muted Silver (#A8DADC) para especificações (ano, altura)
- Cards: Bordas sutilmente arredondadas (rounded-lg), sem sombras pesadas, focando no contraste de cor.
- Botões: Pill-shaped (rounded-full) para chamadas de ação principais.

**Mock Data (Para referência de UI e testes):**
- Carro 1: Ford Ka 2013 - Estilo: OEM+ (Inscrição: #042)
- Carro 2: VW Gol 1994 - Estilo: Rebaixado (Inscrição: #018)

---

## 1. Estrutura de Banco de Dados (Supabase / PostgreSQL)

Por favor, gere os scripts SQL e a integração via Supabase Client para as seguintes tabelas:

1. `eleitores`: id, cpf_hash (único), data_nascimento, criado_em.
2. `eventos`: id, nome, data, status (aberto/fechado).
3. `carros`: id, evento_id, numero_inscricao, modelo, ano, altura_mm, url_foto.
4. `categorias`: id, nome (ex: Mais Bonito, Destaque, Mais Baixo), tipo (popular/interna).
5. `votos`: id, eleitor_id, carro_id, categoria_id, evento_id. 
   *(Regra de negócio: constraint UNIQUE para `eleitor_id` + `categoria_id` + `evento_id` para garantir voto único).*

---

## 2. Estrutura das Páginas (Frontend React/Vite)

Siga os princípios da skill `react:components` (Modularidade, isolamento de lógica em hooks, data decoupling).

### Tela A: Autenticação do Público (Mobile View)
**Objetivo:** Tela de entrada simples e direta para o visitante do evento.
1. **Header:** Logo do evento/sistema centralizado.
2. **Formulário de Acesso:** 
   - Input para CPF (com máscara).
   - Input para Data de Nascimento.
   - Checkbox de consentimento (LGPD).
3. **Ação:** Botão Primary (Racing Red) "Entrar para Votar". Lógica deve buscar/criar o usuário no Supabase silenciosamente.

### Tela B: Galeria de Votação (Mobile View)
**Objetivo:** Onde o usuário escolhe os carros.
1. **Header:** Nome do Evento e botão de "Sair".
2. **Navegação:** Tabs roláveis horizontalmente para as `categorias` (Destaque, Mais Baixo, etc).
3. **Grid de Carros:** Cards contendo:
   - Imagem do carro (otimizada para mobile).
   - Badge com `numero_inscricao` sobreposto na imagem.
   - Título: `modelo`.
   - Subtexto: `ano` e `altura_mm`.
   - Botão Outline "Votar neste carro" (muda para "Votado" e desabilita os demais da mesma categoria após o clique).

### Tela C: Dashboard do Organizador (Desktop/Tablet View)
**Objetivo:** Painel de controle privado do evento.
1. **Sidebar:** Links para "Gerenciar Carros", "Status da Votação", "Resultados".
2. **Controles Principais:** Botão Toggle grande para "Abrir Votação" / "Encerrar Votação".
3. **Painel de Resultados (Tempo Real):**
   - Cards por categoria mostrando o Top 3 carros com barra de progresso/contagem de votos.
   - Seção "Validação Interna" listando automaticamente o carro mais antigo cadastrado (query de `ano` ascendente).

---

## 3. Instruções de Execução para o Copilot
1. Use a skill `design-md` (se aplicável) para estabelecer o baseline visual.
2. Gere as interfaces via Stitch baseadas na "Estrutura das Páginas".
3. Utilize a skill `react:components` para converter os designs do Stitch em componentes React modulares (arquitetura Vite).
4. Crie os hooks (`useAuth`, `useVotos`, `useCarros`) conectando ao `@supabase/supabase-js`.