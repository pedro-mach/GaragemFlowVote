// Dados Simulados para Testes e Desenvolvimento Offline
// Projeto: GaragemFlowVote

export interface Evento {
  id: string;
  nome: string;
  data: string;
  status: 'aberto' | 'fechado';
}

export interface Categoria {
  id: string;
  nome: string;
  tipo: 'popular' | 'interna';
}

export interface Carro {
  id: string;
  evento_id: string;
  numero_inscricao: string;
  modelo: string;
  ano: number;
  altura_mm: number;
  url_foto: string;
  nome_dono: string;
  telefone_dono?: string;
}

export interface Voto {
  id: string;
  eleitor_id: string;
  carro_id: string;
  categoria_id: string;
  evento_id: string;
  criado_em: string;
}

export interface Eleitor {
  id: string;
  cpf_hash: string;
  data_nascimento: string;
  criado_em: string;
}

// Evento Padrão Ativo
export const mockEvento: Evento = {
  id: '11111111-1111-1111-1111-111111111111',
  nome: 'Garagem Flow Meet 2026',
  data: '2026-07-16',
  status: 'aberto',
};

// Categorias
export const mockCategorias: Categoria[] = [
  { id: '22222222-2222-2222-2222-222222222222', nome: 'Mais Bonito', tipo: 'popular' },
  { id: '33333333-3333-3333-3333-333333333333', nome: 'Destaque', tipo: 'popular' },
  { id: '44444444-4444-4444-4444-444444444444', nome: 'Mais Baixo', tipo: 'popular' },
];

// Carros
export const mockCarros: Carro[] = [
  {
    id: 'c1',
    evento_id: mockEvento.id,
    numero_inscricao: '#042',
    modelo: 'Ford Ka (Estilo: OEM+)',
    ano: 2013,
    altura_mm: 120,
    url_foto: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600',
    nome_dono: 'Pedro Machado',
    telefone_dono: '(11) 98888-7777',
  },
  {
    id: 'c2',
    evento_id: mockEvento.id,
    numero_inscricao: '#018',
    modelo: 'VW Gol (Estilo: Rebaixado)',
    ano: 1994,
    altura_mm: 50,
    url_foto: 'https://images.unsplash.com/photo-1617469767053-d3b508a0d825?q=80&w=600',
    nome_dono: 'Rodrigo Low',
    telefone_dono: '(21) 97777-6666',
  },
  {
    id: 'c3',
    evento_id: mockEvento.id,
    numero_inscricao: '#105',
    modelo: 'Chevrolet Chevette (Estilo: Drift)',
    ano: 1989,
    altura_mm: 75,
    url_foto: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=600',
    nome_dono: 'Mateus Drift',
    telefone_dono: '(19) 96666-5555',
  },
  {
    id: 'c4',
    evento_id: mockEvento.id,
    numero_inscricao: '#007',
    modelo: 'Porsche 911 Carrera S',
    ano: 2021,
    altura_mm: 110,
    url_foto: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=600',
    nome_dono: 'Carlos Elite',
    telefone_dono: '(11) 95555-4444',
  },
  {
    id: 'c5',
    evento_id: mockEvento.id,
    numero_inscricao: '#099',
    modelo: 'Fiat Uno (Com Escada)',
    ano: 2002,
    altura_mm: 140,
    url_foto: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?q=80&w=600',
    nome_dono: 'Julio Speed',
    telefone_dono: '(11) 94444-3333',
  },
];;

// Carregados inicialmente do LocalStorage, caso existam, ou em branco para testes.
const getStoredVotos = (): Voto[] => {
  const stored = localStorage.getItem('garagemflow_votos');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const saveMockVoto = (voto: Voto) => {
  const votos = getStoredVotos();
  // Validar se o eleitor já votou nessa categoria
  const exists = votos.some(
    (v) =>
      v.eleitor_id === voto.eleitor_id &&
      v.categoria_id === voto.categoria_id &&
      v.evento_id === voto.evento_id
  );
  if (exists) {
    throw new Error('Você já votou nesta categoria!');
  }
  votos.push(voto);
  localStorage.setItem('garagemflow_votos', JSON.stringify(votos));
};

export const getMockVotos = (): Voto[] => {
  return getStoredVotos();
};

export const clearMockVotos = () => {
  localStorage.removeItem('garagemflow_votos');
};
