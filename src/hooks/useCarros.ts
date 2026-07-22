import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { Carro, Categoria, Evento } from '../data/mockData';
import { mockCarros, mockCategorias, mockEvento } from '../data/mockData';

export function useCarros() {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [carros, setCarros] = useState<Carro[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDados = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Buscar evento ativo (status = 'aberto' ou o primeiro disponível)
        const { data: eventosData, error: evError } = await supabase
          .from('eventos')
          .select('*')
          .order('data', { ascending: false });

        if (evError) throw evError;
        
        let activeEvent = eventosData?.find((e) => e.status === 'aberto') || eventosData?.[0] || null;

        // Se não houver nenhum evento, criamos um de teste para não quebrar a UI
        if (!activeEvent) {
          const { data: newEv, error: newEvError } = await supabase
            .from('eventos')
            .insert({ nome: 'Evento Padrão 2026', data: new Date().toISOString().split('T')[0], status: 'aberto' })
            .select()
            .single();
          if (newEvError) throw newEvError;
          activeEvent = newEv;
        }

        setEvento(activeEvent);

        // 2. Buscar categorias
        const { data: catData, error: catError } = await supabase
          .from('categorias')
          .select('*')
          .order('nome');

        if (catError) throw catError;
        setCategorias(catData || []);

        // 3. Buscar carros do evento ativo
        if (activeEvent) {
          const { data: carsData, error: carsError } = await supabase
            .from('carros')
            .select('*')
            .eq('evento_id', activeEvent.id)
            .order('numero_inscricao');

          if (carsError) throw carsError;
          setCarros(carsData || []);
        }
      } else {
        // Fluxo offline / Mock
        // Evento
        const localEvento = localStorage.getItem('garagemflow_evento');
        if (localEvento) {
          setEvento(JSON.parse(localEvento));
        } else {
          localStorage.setItem('garagemflow_evento', JSON.stringify(mockEvento));
          setEvento(mockEvento);
        }

        // Categorias
        setCategorias(mockCategorias);

        // Carros
        const localCarros = localStorage.getItem('garagemflow_db_carros');
        if (localCarros) {
          setCarros(JSON.parse(localCarros));
        } else {
          localStorage.setItem('garagemflow_db_carros', JSON.stringify(mockCarros));
          setCarros(mockCarros);
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message || 'Erro ao buscar dados do evento.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const cadastrarCarro = async (
    numeroInscricao: string,
    modelo: string,
    ano: number,
    alturaMm: number,
    nomeDono: string,
    telefoneDono?: string,
    urlFoto?: string,
    equipe?: string,
    kmRodado?: number
  ) => {
    if (!evento) return;
    setIsLoading(true);
    try {
      const fotoUrl = urlFoto || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600';
      if (isSupabaseConfigured && supabase) {
        const { error: insertError } = await supabase
          .from('carros')
          .insert({
            evento_id: evento.id,
            numero_inscricao: numeroInscricao,
            modelo,
            ano,
            altura_mm: alturaMm,
            nome_dono: nomeDono,
            telefone_dono: telefoneDono,
            url_foto: fotoUrl,
            equipe: equipe || null,
            km_rodado: kmRodado || 0,
          });
        if (insertError) throw insertError;
      } else {
        const currentCarros = [...carros];
        const newCarro: Carro = {
          id: `c-${Math.random().toString(36).substr(2, 9)}`,
          evento_id: evento.id,
          numero_inscricao: numeroInscricao,
          modelo,
          ano,
          altura_mm: alturaMm,
          nome_dono: nomeDono,
          telefone_dono: telefoneDono,
          url_foto: fotoUrl,
          equipe: equipe || undefined,
          km_rodado: kmRodado || 0,
        };
        currentCarros.push(newCarro);
        localStorage.setItem('garagemflow_db_carros', JSON.stringify(currentCarros));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao cadastrar carro:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deletarCarro = async (id: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: deleteError } = await supabase
          .from('carros')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
      } else {
        const currentCarros = carros.filter((c) => c.id !== id);
        localStorage.setItem('garagemflow_db_carros', JSON.stringify(currentCarros));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao deletar carro:', err);
      setError(err.message || 'Erro ao deletar carro.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatusVotacao = async () => {
    if (!evento) return;
    setIsLoading(true);
    try {
      const novoStatus = evento.status === 'aberto' ? 'fechado' : 'aberto';
      if (isSupabaseConfigured && supabase) {
        const { error: updateError } = await supabase
          .from('eventos')
          .update({ status: novoStatus })
          .eq('id', evento.id);
        if (updateError) throw updateError;
      } else {
        const novoEvento = { ...evento, status: novoStatus };
        localStorage.setItem('garagemflow_evento', JSON.stringify(novoEvento));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao alterar status da votação:', err);
      setError(err.message || 'Erro ao alterar status da votação.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    evento,
    carros,
    categorias,
    isLoading,
    error,
    refresh: fetchDados,
    cadastrarCarro,
    deletarCarro,
    toggleStatusVotacao,
  };
}
