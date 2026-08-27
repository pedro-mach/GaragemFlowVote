// Dados Simulados para Testes e Desenvolvimento Offline
// Projeto: Los Felas Vote

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
  oculta?: boolean;
  /** Campos de dados que esta categoria exige ao inscrever um carro */
  campos_requeridos?: CampoRequerido[];
}

/** Campos de preenchimento que uma categoria pode exigir */
export type CampoRequerido = 'genero' | 'foto' | 'altura_mm' | 'km_rodado' | 'equipe' | 'telefone';

export interface Equipe {
  id: string;
  nome: string;
  criado_em?: string;
}

export interface Carro {
  id: string;
  evento_id: string;
  numero_inscricao: string;
  modelo: string;
  ano: number;
  altura_mm?: number;
  url_foto?: string;
  nome_dono: string;
  telefone_dono?: string;
  equipe?: string;
  km_rodado?: number;
  genero?: 'M' | 'F';
  /** IDs das categorias nas quais este carro está inscrito */
  categorias_ids?: string[];
  /** Quantidade de pessoas uniformizadas da equipe que vieram com este carro */
  pessoas_equipe?: number;
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
  nome: 'Encontro Los Felas',
  data: '2026-07-16',
  status: 'aberto',
};

// Categorias Padrão Exclusivas Los Felas
export const mockCategorias: Categoria[] = [
  { id: 'cat-1', nome: 'Carro mais antigo', tipo: 'interna', oculta: false, campos_requeridos: [] },
  { id: 'cat-2', nome: 'Destaque masculino', tipo: 'popular', oculta: false, campos_requeridos: ['genero', 'foto'] },
  { id: 'cat-3', nome: 'Destaque feminino', tipo: 'popular', oculta: false, campos_requeridos: ['genero', 'foto'] },
  { id: 'cat-4', nome: 'Destaque Turbo', tipo: 'popular', oculta: false, campos_requeridos: ['foto'] },
  { id: 'cat-5', nome: 'Destaque Jeep (Altura)', tipo: 'interna', oculta: false, campos_requeridos: ['altura_mm'] },
];

// Equipes Padrão
export const mockEquipes: Equipe[] = [];

// Carros
export const mockCarros: Carro[] = [];

// Carregados inicialmente do LocalStorage, caso existam, ou em branco para testes.
const getStoredVotos = (): Voto[] => {
  const stored = localStorage.getItem('losfelas_votos') || localStorage.getItem('regional_votos') || localStorage.getItem('garagemflow_votos');
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
  localStorage.setItem('losfelas_votos', JSON.stringify(votos));
};

export const getMockVotos = (): Voto[] => {
  return getStoredVotos();
};

export const clearMockVotos = () => {
  localStorage.removeItem('losfelas_votos');
  localStorage.removeItem('regional_votos');
  localStorage.removeItem('garagemflow_votos');
};
