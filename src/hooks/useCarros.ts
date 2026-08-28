import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { Carro, Categoria, CampoRequerido, Equipe, Evento } from '../data/mockData';
import { mockCarros, mockCategorias, mockEquipes, mockEvento } from '../data/mockData';


export function useCarros() {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [carros, setCarros] = useState<Carro[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
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
            .insert({ nome: 'Encontro Los Felas', data: new Date().toISOString().split('T')[0], status: 'aberto' })
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
        const storedCatState = localStorage.getItem('losfelas_categorias_ocultas') || localStorage.getItem('regional_categorias_ocultas') || localStorage.getItem('garagemflow_categorias_ocultas');
        const ocultasMap: Record<string, boolean> = storedCatState ? JSON.parse(storedCatState) : {};

        const getCamposRequeridos = (cat: { nome?: string; campos_requeridos?: CampoRequerido[] }): CampoRequerido[] => {
          if (cat.campos_requeridos && Array.isArray(cat.campos_requeridos) && cat.campos_requeridos.length > 0) {
            return cat.campos_requeridos;
          }
          const name = (cat.nome || '').toLowerCase();
          if (name.includes('jeep') || name.includes('altura')) return ['altura_mm'];
          if (name.includes('turbo')) return ['foto'];
          if (name.includes('masculino') || name.includes('feminino')) return ['genero', 'foto'];
          return mockCategorias.find(mc => mc.nome.toLowerCase() === name)?.campos_requeridos || [];
        };

        const formattedCats = (catData || []).map((c) => ({
          ...c,
          oculta: ocultasMap[c.id] ?? c.oculta ?? false,
          campos_requeridos: getCamposRequeridos(c),
        }));

        setCategorias(formattedCats);

        // 3. Buscar equipes
        const { data: equipesData, error: equipesError } = await supabase
          .from('equipes')
          .select('*')
          .order('nome');

        if (equipesError) throw equipesError;
        setEquipes(equipesData || []);

        // 4. Buscar carros do evento ativo com suas categorias inscritas
        // NOTA: url_foto é excluída do SELECT para evitar timeout (base64 pesado).
        // A foto é carregada individualmente apenas no modal de edição.
        if (activeEvent) {
          const { data: carsData, error: carsError } = await supabase
            .from('carros')
            .select('id, evento_id, numero_inscricao, modelo, ano, altura_mm, nome_dono, telefone_dono, equipe, equipe_id, km_rodado, genero, pessoas_equipe, criado_em')
            .eq('evento_id', activeEvent.id)
            .order('numero_inscricao');

          if (carsError) throw carsError;

          // Buscar inscricoes de categoria por carro
          const carroIds = (carsData || []).map((c) => c.id);
          let categoriasMap: Record<string, string[]> = {};

          if (carroIds.length > 0) {
            const { data: inscData, error: inscError } = await supabase
              .from('carro_categorias')
              .select('carro_id, categoria_id')
              .in('carro_id', carroIds);

            if (inscError) throw inscError;

            (inscData || []).forEach((insc) => {
              if (!categoriasMap[insc.carro_id]) categoriasMap[insc.carro_id] = [];
              categoriasMap[insc.carro_id].push(insc.categoria_id);
            });
          }

          const formattedCarros = (carsData || []).map((c) => ({
            ...c,
            url_foto: getCachedFoto(c.id) || undefined,
            categorias_ids: categoriasMap[c.id] || [],
          }));

          // Carregamento inicial rápido de metadados
          console.log(`✅ [useCarros] ${carsData?.length} carros carregados (metadados leves). Lista inicial pronta.`);
          setCarros(formattedCarros);
        }
      } else {
        // Fluxo offline / Mock
        const localEvento = localStorage.getItem('losfelas_evento') || localStorage.getItem('regional_evento') || localStorage.getItem('garagemflow_evento');
        if (localEvento) {
          setEvento(JSON.parse(localEvento));
        } else {
          localStorage.setItem('losfelas_evento', JSON.stringify(mockEvento));
          setEvento(mockEvento);
        }

        const getCamposRequeridos = (cat: { nome?: string; campos_requeridos?: CampoRequerido[] }): CampoRequerido[] => {
          if (cat.campos_requeridos && Array.isArray(cat.campos_requeridos) && cat.campos_requeridos.length > 0) {
            return cat.campos_requeridos;
          }
          const name = (cat.nome || '').toLowerCase();
          if (name.includes('jeep') || name.includes('altura')) return ['altura_mm'];
          if (name.includes('turbo')) return ['foto'];
          if (name.includes('masculino') || name.includes('feminino')) return ['genero', 'foto'];
          return mockCategorias.find(mc => mc.nome.toLowerCase() === name)?.campos_requeridos || [];
        };

        const localCategorias = localStorage.getItem('losfelas_categorias') || localStorage.getItem('regional_categorias') || localStorage.getItem('garagemflow_categorias');
        if (localCategorias) {
          const parsedCats = JSON.parse(localCategorias);
          const mergedCats = parsedCats.map((c: Categoria) => ({
            ...c,
            campos_requeridos: getCamposRequeridos(c)
          }));
          setCategorias(mergedCats);
          localStorage.setItem('losfelas_categorias', JSON.stringify(mergedCats));
        } else {
          localStorage.setItem('losfelas_categorias', JSON.stringify(mockCategorias));
          setCategorias(mockCategorias);
        }

        const localEquipes = localStorage.getItem('losfelas_equipes') || localStorage.getItem('regional_equipes') || localStorage.getItem('garagemflow_equipes');
        if (localEquipes) {
          setEquipes(JSON.parse(localEquipes));
        } else {
          localStorage.setItem('losfelas_equipes', JSON.stringify(mockEquipes));
          setEquipes(mockEquipes);
        }

        const localCarros = localStorage.getItem('losfelas_db_carros') || localStorage.getItem('regional_db_carros') || localStorage.getItem('garagemflow_db_carros');
        if (localCarros) {
          setCarros(JSON.parse(localCarros));
        } else {
          localStorage.setItem('losfelas_db_carros', JSON.stringify(mockCarros));
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
        localStorage.setItem('losfelas_evento', JSON.stringify(novoEvento));
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
    kmRodado?: number,
    genero?: 'M' | 'F',
    categoriasIds?: string[],
    pessoasEquipe?: number
  ) => {
    if (!evento) return;
    setIsLoading(true);
    try {
      const fotoUrl = urlFoto?.trim() || null;
      const alturaValue = alturaMm ?? 0;
      const donoValue = nomeDono || 'Não informado';

      if (isSupabaseConfigured && supabase) {
        // Resolver equipe_id se o nome da equipe for fornecido
        let equipeId: string | null = null;
        if (equipe?.trim()) {
          const equipFound = equipes.find((e) => e.nome.toLowerCase() === equipe.trim().toLowerCase());
          if (equipFound) equipeId = equipFound.id;
        }

        const { data: insertedCar, error: insertError } = await supabase
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
            equipe_id: equipeId,
            km_rodado: kmRodado || 0,
            genero: genero || null,
            pessoas_equipe: pessoasEquipe || 0,
          })
          .select()
          .single();
        if (insertError) throw insertError;

        // Inserir inscrições nas categorias
        if (insertedCar && categoriasIds && categoriasIds.length > 0) {
          const inscricoes = categoriasIds.map((catId) => ({
            carro_id: insertedCar.id,
            categoria_id: catId,
          }));
          const { error: inscError } = await supabase
            .from('carro_categorias')
            .insert(inscricoes);
          if (inscError) throw inscError;
        }
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
          url_foto: fotoUrl ?? undefined,
          equipe: equipe || undefined,
          km_rodado: kmRodado || 0,
          genero: genero,
          categorias_ids: categoriasIds || [],
          pessoas_equipe: pessoasEquipe || 0,
        };
        currentCarros.push(newCarro);
        localStorage.setItem('losfelas_db_carros', JSON.stringify(currentCarros));
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
        localStorage.setItem('losfelas_db_carros', JSON.stringify(currentCarros));
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

  const editarCarro = async (
    id: string,
    dados: {
      numeroInscricao?: string;
      modelo?: string;
      ano?: number;
      alturaMm?: number;
      nomeDono?: string;
      telefoneDono?: string;
      urlFoto?: string;
      equipe?: string;
      kmRodado?: number;
      genero?: 'M' | 'F';
      categoriasIds?: string[];
      pessoasEquipe?: number;
    }
  ) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // Resolver equipe_id se o nome da equipe for fornecido
        let equipeId: string | null = null;
        if (dados.equipe?.trim()) {
          const eq = equipes.find((e) => e.nome.toLowerCase() === dados.equipe!.trim().toLowerCase());
          if (eq) equipeId = eq.id;
        }

        const updatePayload: Record<string, unknown> = {
          numero_inscricao: dados.numeroInscricao,
          modelo: dados.modelo,
          ano: dados.ano,
          altura_mm: dados.alturaMm ?? 0,
          nome_dono: dados.nomeDono || 'Não informado',
          telefone_dono: dados.telefoneDono || null,
          equipe: dados.equipe || null,
          equipe_id: equipeId,
          km_rodado: dados.kmRodado ?? 0,
          genero: dados.genero || null,
          pessoas_equipe: dados.pessoasEquipe ?? 0,
        };
        // Só inclui url_foto no update se foi explicitamente fornecida
        // (evita sobrescrever foto existente com null quando usuário não muda a foto)
        if (dados.urlFoto !== undefined) {
          updatePayload.url_foto = dados.urlFoto.trim() || null;
        }

        const { error: updateError } = await supabase
          .from('carros')
          .update(updatePayload)
          .eq('id', id);
        if (updateError) throw updateError;

        // Atualizar inscrições nas categorias: apaga tudo e re-insere
        const { error: delInscError } = await supabase
          .from('carro_categorias')
          .delete()
          .eq('carro_id', id);
        if (delInscError) throw delInscError;

        if (dados.categoriasIds && dados.categoriasIds.length > 0) {
          const inscricoes = dados.categoriasIds.map((catId) => ({
            carro_id: id,
            categoria_id: catId,
          }));
          const { error: inscError } = await supabase
            .from('carro_categorias')
            .insert(inscricoes);
          if (inscError) throw inscError;
        }
      } else {
        const currentCarros = carros.map((c) => {
          if (c.id !== id) return c;
          const equipeNome = dados.equipe?.trim() || c.equipe;
          return {
            ...c,
            numero_inscricao: dados.numeroInscricao ?? c.numero_inscricao,
            modelo: dados.modelo ?? c.modelo,
            ano: dados.ano ?? c.ano,
            altura_mm: dados.alturaMm ?? c.altura_mm,
            nome_dono: dados.nomeDono ?? c.nome_dono,
            telefone_dono: dados.telefoneDono ?? c.telefone_dono,
            url_foto: dados.urlFoto ?? c.url_foto,
            equipe: equipeNome,
            km_rodado: dados.kmRodado ?? c.km_rodado,
            genero: dados.genero ?? c.genero,
            categorias_ids: dados.categoriasIds ?? c.categorias_ids,
            pessoas_equipe: dados.pessoasEquipe ?? c.pessoas_equipe,
          } as Carro;
        });
        localStorage.setItem('losfelas_db_carros', JSON.stringify(currentCarros));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao editar carro:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cadastrarEquipe = async (nome: string) => {
    if (!nome.trim()) return;
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: insertError } = await supabase
          .from('equipes')
          .insert({ nome: nome.trim() });
        if (insertError) throw insertError;
      } else {
        const currentEquipes = [...equipes];
        const newEquipe: Equipe = {
          id: `eq-${Math.random().toString(36).substr(2, 9)}`,
          nome: nome.trim(),
        };
        currentEquipes.push(newEquipe);
        localStorage.setItem('losfelas_equipes', JSON.stringify(currentEquipes));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao cadastrar equipe:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deletarEquipe = async (id: string) => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: deleteError } = await supabase
          .from('equipes')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
      } else {
        const currentEquipes = equipes.filter((e) => e.id !== id);
        localStorage.setItem('losfelas_equipes', JSON.stringify(currentEquipes));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao deletar equipe:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cadastrarCategoria = async (nome: string, tipo: 'popular' | 'interna' = 'popular', camposRequeridos: CampoRequerido[] = []) => {
    if (!nome.trim()) return;
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: insertError } = await supabase
          .from('categorias')
          .insert({ nome: nome.trim(), tipo, campos_requeridos: camposRequeridos });
        if (insertError) throw insertError;
      } else {
        const currentCats = [...categorias];
        const newCat: Categoria = {
          id: `cat-${Math.random().toString(36).substr(2, 9)}`,
          nome: nome.trim(),
          tipo,
          oculta: false,
          campos_requeridos: camposRequeridos,
        };
        currentCats.push(newCat);
        localStorage.setItem('losfelas_categorias', JSON.stringify(currentCats));
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
        localStorage.setItem('losfelas_categorias', JSON.stringify(currentCats));
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
      const storedCatState = localStorage.getItem('losfelas_categorias_ocultas') || localStorage.getItem('regional_categorias_ocultas') || localStorage.getItem('garagemflow_categorias_ocultas');
      const ocultasMap: Record<string, boolean> = storedCatState ? JSON.parse(storedCatState) : {};
      ocultasMap[id] = novoOculta;
      localStorage.setItem('losfelas_categorias_ocultas', JSON.stringify(ocultasMap));

      if (!isSupabaseConfigured || !supabase) {
        const currentCats = categorias.map((c) => (c.id === id ? { ...c, oculta: novoOculta } : c));
        localStorage.setItem('losfelas_categorias', JSON.stringify(currentCats));
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
        localStorage.setItem('losfelas_categorias', JSON.stringify(currentCats));
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
        localStorage.setItem('losfelas_evento', JSON.stringify(novoEvento));
      }
      await fetchDados();
    } catch (err: any) {
      console.error('Erro ao alterar status da votação:', err);
      setError(err.message || 'Erro ao alterar status da votação.');
    } finally {
      setIsLoading(false);
    }
  };

// Cache em memória e sessionStorage para eliminar Egress redundante do Supabase
const photoMemoryCache = new Map<string, string>();

const getCachedFoto = (id: string): string | null => {
  if (photoMemoryCache.has(id)) return photoMemoryCache.get(id)!;
  try {
    const val = sessionStorage.getItem(`losfelas_foto_${id}`);
    if (val) {
      photoMemoryCache.set(id, val);
      return val;
    }
  } catch {
    // sessionStorage indisponível ou desabilitado
  }
  return null;
};

const saveCachedFoto = (id: string, foto: string) => {
  if (!id || !foto) return;
  photoMemoryCache.set(id, foto);
  try {
    sessionStorage.setItem(`losfelas_foto_${id}`, foto);
  } catch {
    // sessionStorage cheio ou desabilitado
  }
};

  // Busca a url_foto de um único carro (lazy — não vem no SELECT da lista)
  const fetchFotoCarro = async (id: string): Promise<string | null> => {
    // 1. Verifica no cache local (0 bytes de egress)
    const cached = getCachedFoto(id);
    if (cached) return cached;

    if (!isSupabaseConfigured || !supabase) {
      const stored = localStorage.getItem('losfelas_db_carros') || localStorage.getItem('regional_db_carros') || localStorage.getItem('garagemflow_db_carros');
      if (stored) {
        const all = JSON.parse(stored) as Carro[];
        const foto = all.find((c) => c.id === id)?.url_foto ?? null;
        if (foto) saveCachedFoto(id, foto);
        return foto;
      }
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('carros')
        .select('url_foto')
        .eq('id', id)
        .single();
      if (error) throw error;
      const foto = data?.url_foto ?? null;
      if (foto) saveCachedFoto(id, foto);
      return foto;
    } catch (err) {
      console.error('Erro ao buscar foto do carro:', err);
      return null;
    }
  };

  // Busca a url_foto sob demanda para uma lista específica de IDs de carros (ex: carros visíveis na tela)
  // Usa cache local primeiro (0 egress) e busca sequencial apenas para fotos inéditas
  const fetchFotosParaCarros = async (carroIds: string[]) => {
    if (!carroIds || carroIds.length === 0) return;

    // 1. Resolver fotos que já estão no cache local
    const idsPrecisamBuscar: string[] = [];
    const fotosResolvidasDoCache: Record<string, string> = {};

    carroIds.forEach((id) => {
      const c = carros.find((item) => item.id === id);
      if (c && c.url_foto && c.url_foto.trim() !== '') return;

      const cached = getCachedFoto(id);
      if (cached) {
        fotosResolvidasDoCache[id] = cached;
      } else {
        idsPrecisamBuscar.push(id);
      }
    });

    // Se encontramos fotos no cache, atualiza o estado imediatamente sem tocar na rede
    if (Object.keys(fotosResolvidasDoCache).length > 0) {
      setCarros((prev) =>
        prev.map((c) => (fotosResolvidasDoCache[c.id] ? { ...c, url_foto: fotosResolvidasDoCache[c.id] } : c))
      );
    }

    if (idsPrecisamBuscar.length === 0 || !isSupabaseConfigured || !supabase) return;

    console.log(`📸 [fetchFotosParaCarros] Baixando ${idsPrecisamBuscar.length} fotos inéditas do Supabase...`);

    for (const carroId of idsPrecisamBuscar) {
      try {
        let res = await supabase!
          .from('carros')
          .select('id, url_foto')
          .eq('id', carroId)
          .single();

        // Se der timeout 57014 por concorrência, faz retry imediato 1 vez
        if (res.error && (res.error.code === '57014' || res.error.message?.includes('timeout'))) {
          console.warn(`⏳ [fetchFotosParaCarros] Retry no ID ${carroId}...`);
          res = await supabase!
            .from('carros')
            .select('id, url_foto')
            .eq('id', carroId)
            .single();
        }

        if (res.error) {
          console.warn(`⚠️ [fetchFotosParaCarros] Não foi possível carregar a foto do ID ${carroId}:`, res.error);
          continue;
        }

        if (res.data && res.data.url_foto && res.data.url_foto.trim() !== '') {
          const foto = res.data.url_foto;
          saveCachedFoto(carroId, foto);
          setCarros((prev) =>
            prev.map((c) => (c.id === carroId ? { ...c, url_foto: foto } : c))
          );
        }
      } catch (err) {
        console.error(`💥 [fetchFotosParaCarros] Exceção no ID ${carroId}:`, err);
      }
    }
  };

  return {
    evento,
    carros,
    categorias,
    equipes,
    isLoading,
    error,
    refresh: fetchDados,
    atualizarNomeEvento,
    cadastrarCarro,
    editarCarro,
    deletarCarro,
    cadastrarEquipe,
    deletarEquipe,
    cadastrarCategoria,
    editarCategoria,
    toggleOcultarCategoria,
    deletarCategoria,
    toggleStatusVotacao,
    fetchFotoCarro,
    fetchFotosParaCarros,
  };
}
