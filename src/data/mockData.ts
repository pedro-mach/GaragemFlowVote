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
  equipe?: string;
  km_rodado?: number;
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
export const mockCategorias: Categoria[] = [];

// Carros
export const mockCarros: Carro[] = [];;

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
