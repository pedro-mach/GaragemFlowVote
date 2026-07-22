import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { Voto } from '../data/mockData';
import { getMockVotos, saveMockVoto } from '../data/mockData';

export function useVotos(eleitorId?: string, eventoId?: string) {
  const [userVotos, setUserVotos] = useState<Voto[]>([]);
  const [resultados, setResultados] = useState<Record<string, { carroId: string; votosCount: number }[]>>({});
  const [totalUsuarios, setTotalUsuarios] = useState<number>(0);
  const [totalVotos, setTotalVotos] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserVotos = async () => {
    if (!eleitorId || !eventoId) return;
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: fetchError } = await supabase
          .from('votos')
          .select('*')
          .eq('eleitor_id', eleitorId)
          .eq('evento_id', eventoId);

        if (fetchError) throw fetchError;
        setUserVotos(data || []);
      } else {
        const allVotes = getMockVotos();
        const filtered = allVotes.filter(
          (v) => v.eleitor_id === eleitorId && v.evento_id === eventoId
        );
        setUserVotos(filtered);
      }
    } catch (err: any) {
      console.error('Erro ao buscar votos do usuário:', err);
    }
  };

  const fetchResultados = async () => {
    if (!eventoId) return;
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Obter contagem de votos do Supabase
        const { data, error: votesError } = await supabase
          .from('votos')
          .select('carro_id, categoria_id, eleitor_id')
          .eq('evento_id', eventoId);

        if (votesError) throw votesError;

        // Obter contagem total de eleitores cadastrados
        const { count: eleitoresCount } = await supabase
          .from('eleitores')
          .select('*', { count: 'exact', head: true });

        const uniqueVotersInVotes = new Set(data?.map((v: { eleitor_id: string }) => v.eleitor_id)).size;
        setTotalUsuarios(eleitoresCount ?? uniqueVotersInVotes);
        setTotalVotos(data?.length || 0);

        // Agrupar votos
        const counts: Record<string, Record<string, number>> = {};
        data?.forEach((v: { carro_id: string; categoria_id: string }) => {
          if (!counts[v.categoria_id]) counts[v.categoria_id] = {};
          counts[v.categoria_id][v.carro_id] = (counts[v.categoria_id][v.carro_id] || 0) + 1;
        });

        const formattedResults: Record<string, { carroId: string; votosCount: number }[]> = {};
        Object.keys(counts).forEach((catId) => {
          const catCounts = counts[catId];
          const sorted = Object.keys(catCounts)
            .map((carId) => ({ carroId: carId, votosCount: catCounts[carId] }))
            .sort((a, b) => b.votosCount - a.votosCount);
          formattedResults[catId] = sorted;
        });

        setResultados(formattedResults);
      } else {
        // Fluxo offline / Mock
        const allVotes = getMockVotos();
        const eventVotes = allVotes.filter((v) => v.evento_id === eventoId);
        const localDb = JSON.parse(localStorage.getItem('garagemflow_db_eleitores') || '[]');
        const uniqueVoters = new Set(eventVotes.map((v) => v.eleitor_id)).size;

        setTotalUsuarios(Math.max(localDb.length, uniqueVoters));
        setTotalVotos(eventVotes.length);

        const counts: Record<string, Record<string, number>> = {};
        eventVotes.forEach((v) => {
          if (!counts[v.categoria_id]) counts[v.categoria_id] = {};
          counts[v.categoria_id][v.carro_id] = (counts[v.categoria_id][v.carro_id] || 0) + 1;
        });

        const formattedResults: Record<string, { carroId: string; votosCount: number }[]> = {};
        Object.keys(counts).forEach((catId) => {
          const catCounts = counts[catId];
          const sorted = Object.keys(catCounts)
            .map((carId) => ({ carroId: carId, votosCount: catCounts[carId] }))
            .sort((a, b) => b.votosCount - a.votosCount);
          formattedResults[catId] = sorted;
        });

        setResultados(formattedResults);
      }
    } catch (err: any) {
      console.error('Erro ao buscar resultados:', err);
      setError(err.message || 'Erro ao carregar estatísticas.');
    } finally {
      setIsLoading(false);
    }
  };

  const votar = async (carroId: string, categoriaId: string) => {
    if (!eleitorId || !eventoId) {
      throw new Error('Usuário ou evento não identificado.');
    }
    setError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        // Enviar para o Supabase
        const { error: insertError } = await supabase.from('votos').insert({
          eleitor_id: eleitorId,
          carro_id: carroId,
          categoria_id: categoriaId,
          evento_id: eventoId,
        });

        if (insertError) {
          // Tratar erro de constraint UNIQUE
          if (insertError.code === '23505') {
            throw new Error('Você já registrou seu voto para esta categoria.');
          }
          throw insertError;
        }
      } else {
        // Gravar no Mock
        const newVoto: Voto = {
          id: `v-${Math.random().toString(36).substr(2, 9)}`,
          eleitor_id: eleitorId,
          carro_id: carroId,
          categoria_id: categoriaId,
          evento_id: eventoId,
          criado_em: new Date().toISOString(),
        };
        saveMockVoto(newVoto);
      }
      // Atualiza os votos do usuário localmente
      await fetchUserVotos();
      await fetchResultados();
    } catch (err: any) {
      console.error('Erro ao votar:', err);
      setError(err.message || 'Erro ao salvar o seu voto.');
      throw err;
    }
  };

  useEffect(() => {
    if (eleitorId && eventoId) {
      fetchUserVotos();
    }
  }, [eleitorId, eventoId]);

  useEffect(() => {
    if (eventoId) {
      fetchResultados();
    }
  }, [eventoId]);

  return {
    userVotos,
    resultados,
    totalUsuarios,
    totalVotos,
    isLoading,
    error,
    votar,
    fetchResultados,
    refreshUserVotos: fetchUserVotos,
  };
}
