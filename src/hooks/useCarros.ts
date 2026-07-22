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
        // 1. Buscar evento ativo
        const { data: eventosData, error: evError } = await supabase
          .from('eventos')
          .select('*')
          .order('data', { ascending: false });

        if (evError) throw evError;
        
        let activeEvent = eventosData?.find((e) => e.status === 'aberto') || eventosData?.[0] || null;

        if (!activeEvent) {
          const { data: newEv, error: newEvError } = await supabase
            .from('eventos')
            .insert({ nome: 'Garagem Flow Meet 2026', data: new Date().toISOString().split('T')[0], status: 'aberto' })
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

        // Mesclar com estado de ocultação salvo localmente se necessário
        const storedCatState = localStorage.getItem('garagemflow_categorias_ocultas');
        const ocultasMap: Record<string, boolean> = storedCatState ? JSON.parse(storedCatState) : {};

        const formattedCats = (catData || []).map((c) => ({
          ...c,
          oculta: ocultasMap[c.id] ?? c.oculta ?? false,
        }));

        setCategorias(formattedCats);

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
        const localEvento = localStorage.getItem('garagemflow_evento');
        if (localEvento) {
          setEvento(JSON.parse(localEvento));
        } else {
          localStorage.setItem('garagemflow_evento', JSON.stringify(mockEvento));
          setEvento(mockEvento);
        }

        const localCategorias = localStorage.getItem('garagemflow_categorias');
        if (localCategorias) {
          setCategorias(JSON.parse(localCategorias));
        } else {
          localStorage.setItem('garagemflow_categorias', JSON.stringify(mockCategorias));
          setCategorias(mockCategorias);
        }

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

  const atualizarNomeEvento = async (novoNome: string) => {
    if (!evento || !novoNome.trim()) return;
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: updateError } = await supabase
          .from('eventos')
          .update({ nome: novoNome.trim() })
          .eq('id', evento.id);
        if (updateError) throw updateError;
      } else {
        const novoEvento = { ...evento, nome: novoNome.trim() };
        localStorage.setItem('garagemflow_evento', JSON.stringify(novoEvento));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao atualizar nome do evento:', err);
      setError(err.message || 'Erro ao atualizar nome do evento.');
    } finally {
      setIsLoading(false);
    }
  };

  const cadastrarCarro = async (
    numeroInscricao: string,
    modelo: string,
    ano: number,
    alturaMm?: number,
    nomeDono?: string,
    telefoneDono?: string,
    urlFoto?: string,
    equipe?: string,
    kmRodado?: number
  ) => {
    if (!evento) return;
    setIsLoading(true);
    try {
      const fotoUrl = urlFoto || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=600';
      const alturaValue = alturaMm ?? 0;
      const donoValue = nomeDono || 'Não informado';

      if (isSupabaseConfigured && supabase) {
        const { error: insertError } = await supabase
          .from('carros')
          .insert({
            evento_id: evento.id,
            numero_inscricao: numeroInscricao,
            modelo,
            ano,
            altura_mm: alturaValue,
            nome_dono: donoValue,
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
          altura_mm: alturaValue,
          nome_dono: donoValue,
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

  const cadastrarCategoria = async (nome: string, tipo: 'popular' | 'interna' = 'popular') => {
    if (!nome.trim()) return;
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: insertError } = await supabase
          .from('categorias')
          .insert({ nome: nome.trim(), tipo });
        if (insertError) throw insertError;
      } else {
        const currentCats = [...categorias];
        const newCat: Categoria = {
          id: `cat-${Math.random().toString(36).substr(2, 9)}`,
          nome: nome.trim(),
          tipo,
          oculta: false,
        };
        currentCats.push(newCat);
        localStorage.setItem('garagemflow_categorias', JSON.stringify(currentCats));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao cadastrar categoria:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const editarCategoria = async (id: string, novoNome: string) => {
    if (!novoNome.trim()) return;
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: updateError } = await supabase
          .from('categorias')
          .update({ nome: novoNome.trim() })
          .eq('id', id);
        if (updateError) throw updateError;
      } else {
        const currentCats = categorias.map((c) => (c.id === id ? { ...c, nome: novoNome.trim() } : c));
        localStorage.setItem('garagemflow_categorias', JSON.stringify(currentCats));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao editar categoria:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOcultarCategoria = async (id: string) => {
    setIsLoading(true);
    try {
      const cat = categorias.find((c) => c.id === id);
      if (!cat) return;
      const novoOculta = !cat.oculta;

      // Salvar estado localmente para persistência
      const storedCatState = localStorage.getItem('garagemflow_categorias_ocultas');
      const ocultasMap: Record<string, boolean> = storedCatState ? JSON.parse(storedCatState) : {};
      ocultasMap[id] = novoOculta;
      localStorage.setItem('garagemflow_categorias_ocultas', JSON.stringify(ocultasMap));

      if (!isSupabaseConfigured || !supabase) {
        const currentCats = categorias.map((c) => (c.id === id ? { ...c, oculta: novoOculta } : c));
        localStorage.setItem('garagemflow_categorias', JSON.stringify(currentCats));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao ocultar/exibir categoria:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const deletarCategoria = async (id: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: deleteError } = await supabase
          .from('categorias')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
      } else {
        const currentCats = categorias.filter((c) => c.id !== id);
        localStorage.setItem('garagemflow_categorias', JSON.stringify(currentCats));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao deletar categoria:', err);
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
    atualizarNomeEvento,
    cadastrarCarro,
    deletarCarro,
    cadastrarCategoria,
    editarCategoria,
    toggleOcultarCategoria,
    deletarCategoria,
    toggleStatusVotacao,
  };
}
