// Utilitário de Validação de Nomes de Equipes
// Inclui Filtro de Palavras Explícitas e Algoritmo de Distância Levenshtein para evitar duplicatas por similaridade

import type { Equipe } from '../data/mockData';

// Lista de palavras e termos impróprios/ofensivos em português
const PALAVRAS_EXPLICITAS: string[] = [
  'caralho', 'porra', 'merda', 'bosta', 'puta', 'puto', 'foda', 'foder',
  'cacete', 'buceta', 'caralhas', 'piranha', 'cu', 'cuzão', 'cuzao', 'boquete',
  'otario', 'otário', 'viado', 'viadagem', 'arrombado', 'arrombada', 'desgraça',
  'vagabundo', 'vagabunda', 'desgraçado', 'prostituta', 'babaca', 'nazi', 'nazista',
];

/**
 * Normaliza uma string removendo acentos, caracteres especiais e convertendo para minúsculas.
 */
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, '')   // remove caracteres especiais
    .replace(/\s+/g, ' ')           // reduz múltiplos espaços para um único
    .trim();
}

/**
 * Calcula a distância de Levenshtein entre duas strings.
 * Retorna o número mínimo de edições (inserções, deleções, substituições) para transformar a string A na B.
 */
export function levenshteinDistance(a: string, b: string): number {
  const normA = normalizeText(a);
  const normB = normalizeText(b);

  if (normA === normB) return 0;
  if (normA.length === 0) return normB.length;
  if (normB.length === 0) return normA.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= normB.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= normA.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= normB.length; i++) {
    for (let j = 1; j <= normA.length; j++) {
      if (normB.charAt(i - 1) === normA.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substituição
          matrix[i][j - 1] + 1,     // inserção
          matrix[i - 1][j] + 1      // remoção
        );
      }
    }
  }

  return matrix[normB.length][normA.length];
}

export interface ValidationResult {
  status: 'valid' | 'profanity' | 'exact' | 'similar';
  message?: string;
  similarTeam?: Equipe;
}

/**
 * Valida o nome de uma equipe contra palavras ofensivas e equipes já existentes.
 */
export function validateTeamName(name: string, existingTeams: Equipe[] = []): ValidationResult {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { status: 'profanity', message: 'Por favor, informe um nome para a equipe.' };
  }

  const safeTeams = Array.isArray(existingTeams) ? existingTeams : [];
  const normalizedInput = normalizeText(trimmed);
  const words = normalizedInput.split(' ');

  // 1. Filtro de Palavras Explícitas
  const foundBadWord = words.find((w) => PALAVRAS_EXPLICITAS.includes(w)) ||
    PALAVRAS_EXPLICITAS.find((bw) => normalizedInput.includes(bw));

  if (foundBadWord) {
    return {
      status: 'profanity',
      message: 'O nome da equipe contém palavras ou termos inadequados.',
    };
  }

  // 2. Verificação de Match Exato (após normalização)
  const exactMatch = safeTeams.find((eq) => normalizeText(eq.nome) === normalizedInput);
  if (exactMatch) {
    return {
      status: 'exact',
      message: `A equipe "${exactMatch.nome}" já está cadastrada!`,
      similarTeam: exactMatch,
    };
  }

  // 3. Verificação de Similaridade (Levenshtein)
  for (const eq of safeTeams) {
    const normEq = normalizeText(eq.nome);
    const dist = levenshteinDistance(normalizedInput, normEq);

    const maxLen = Math.max(normalizedInput.length, normEq.length);
    const similarityRatio = 1 - dist / maxLen;

    // Se for muito similar (distância <= 2 para nomes com > 4 letras, ou similaridade >= 80%)
    if ((dist <= 2 && maxLen >= 4) || (similarityRatio >= 0.80 && dist <= 3)) {
      return {
        status: 'similar',
        message: `Foi encontrada uma equipe com nome muito semelhante: "${eq.nome}".`,
        similarTeam: eq,
      };
    }
  }

  return { status: 'valid' };
}
