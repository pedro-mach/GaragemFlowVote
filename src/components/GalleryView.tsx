import React, { useState } from 'react';
import { LogOut, Vote, AlertCircle, CheckCircle2, Trophy } from 'lucide-react';
import type { Carro, Categoria, Evento, Voto, Eleitor } from '../data/mockData';

interface GalleryViewProps {
  user: Eleitor;
  evento: Evento | null;
  carros: Carro[];
  categorias: Categoria[];
  userVotos: Voto[];
  votar: (carroId: string, categoriaId: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export function GalleryView({
  user,
  evento,
  carros,
  categorias,
  userVotos,
  votar,
  logout,
  isLoading,
  error: _error,
}: GalleryViewProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');

  const popularCategorias = categorias.filter((c) => c.tipo === 'popular');

  // Seta a primeira categoria como ativa quando carregada
  React.useEffect(() => {
    if (popularCategorias.length > 0 && !activeCategoryId) {
      setActiveCategoryId(popularCategorias[0].id);
    }
  }, [popularCategorias, activeCategoryId]);

  // Filtra carros que pertencem ao evento ativo (caso de segurança)
  const eventCarros = carros.filter((c) => !evento || c.evento_id === evento.id);

  // Verifica se o usuário já votou nesta categoria ativa
  const votoNestaCategoria = userVotos.find(
    (v) => v.categoria_id === activeCategoryId
  );

  const handleVoto = async (carroId: string) => {
    if (!evento || evento.status === 'fechado' || isLoading) return;
    try {
      await votar(carroId, activeCategoryId);
    } catch (e) {
      // O erro já é tratado no hook useVotos e exposto no state
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-2 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-4 mb-4">
        <div>
          <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
            {evento?.status === 'aberto' ? '● Votação Aberta' : '○ Votação Fechada'}
          </span>
          <h2 className="text-md font-bold tracking-tight text-white line-clamp-1">
            {evento?.nome || 'Carregando evento...'}
          </h2>
        </div>
        <button
          onClick={logout}
          className="p-2 rounded-lg bg-surface border border-[#333] hover:border-primary text-gray-400 hover:text-primary transition-colors focus:outline-none"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Alerta de Votação Fechada */}
      {evento?.status === 'fechado' && (
        <div className="bg-red-950/20 border border-red-500/30 text-red-400 text-xs font-semibold px-4 py-3 rounded-lg flex items-center space-x-2 mb-4 animate-pulse">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>A votação deste evento foi encerrada pelos organizadores.</span>
        </div>
      )}

      {/* Tabs de Categorias (Horizontal Scrollable) */}
      <div className="mb-4">
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
          Categorias
        </label>
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-1 px-1">
          {popularCategorias.map((cat) => {
            const isSelected = cat.id === activeCategoryId;
            const jaVotou = userVotos.some((v) => v.categoria_id === cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`snap-start shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all focus:outline-none flex items-center space-x-1.5 border ${
                  isSelected
                    ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/10'
                    : 'bg-surface border-[#333] text-gray-400 hover:border-gray-500'
                }`}
              >
                <span>{cat.nome}</span>
                {jaVotou && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de Carros */}
      <div className="flex-1 space-y-4 mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-gray-400">
            {eventCarros.length} Carros inscritos nesta categoria
          </span>
          {votoNestaCategoria && (
            <span className="text-[11px] text-primary font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Você já votou!</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {eventCarros.map((carro) => {
            const isVotadoPorMim = votoNestaCategoria?.carro_id === carro.id;
            const disabled =
              evento?.status === 'fechado' ||
              !!votoNestaCategoria ||
              isLoading;

            return (
              <div
                key={carro.id}
                className={`bg-surface rounded-xl overflow-hidden border transition-all ${
                  isVotadoPorMim
                    ? 'border-primary/50 ring-1 ring-primary/30 shadow-lg shadow-primary/5'
                    : 'border-[#2b2b2b] hover:border-[#3b3b3b]'
                }`}
              >
                {/* Imagem do Carro com Badge do Numero de Inscrição */}
                <div className="relative h-44 w-full bg-[#121212]">
                  <img
                    src={carro.url_foto}
                    alt={carro.modelo}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-2 left-2 bg-primary text-white font-black text-xs px-2.5 py-1 rounded-md shadow-md">
                    Inscrição: {carro.numero_inscricao}
                  </div>
                  
                  {isVotadoPorMim && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="bg-primary/95 text-white font-bold text-xs py-2 px-4 rounded-full flex items-center space-x-1.5 shadow-lg scale-105 transition-transform">
                        <Trophy className="w-4 h-4" />
                        <span>Seu Voto Nesta Categoria</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Detalhes do Carro */}
                <div className="p-4 flex flex-col space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-white line-clamp-1">
                      {carro.modelo}
                    </h3>
                    <p className="text-[11px] text-secondary font-semibold mt-0.5">
                      Dono(a): {carro.nome_dono}{carro.equipe ? ` | Equipe: ${carro.equipe}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary mt-1.5">
                      <span>Ano: <strong className="text-white">{carro.ano}</strong></span>
                      <span className="text-gray-600">|</span>
                      <span>Altura: <strong className="text-white">{carro.altura_mm} mm</strong></span>
                      {carro.km_rodado !== undefined && carro.km_rodado > 0 ? (
                        <>
                          <span className="text-gray-600">|</span>
                          <span>Rodagem: <strong className="text-white">{carro.km_rodado} km</strong></span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Ação de Votar */}
                  <button
                    onClick={() => handleVoto(carro.id)}
                    disabled={disabled}
                    className={`w-full font-bold py-2 rounded-full text-xs transition-all flex items-center justify-center space-x-1.5 ${
                      isVotadoPorMim
                        ? 'bg-primary text-white cursor-default shadow-md shadow-primary/20'
                        : votoNestaCategoria
                        ? 'bg-[#1a1a1a] text-gray-600 border border-[#2b2b2b] cursor-not-allowed'
                        : evento?.status === 'fechado'
                        ? 'bg-[#161616] text-gray-500 border border-[#2b2b2b] cursor-not-allowed'
                        : 'bg-transparent hover:bg-primary/5 active:scale-[0.98] border border-primary text-primary hover:text-white transition-all duration-200'
                    }`}
                  >
                    {isVotadoPorMim ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Votado!</span>
                      </>
                    ) : votoNestaCategoria ? (
                      <span>Votação Concluída nesta categoria</span>
                    ) : evento?.status === 'fechado' ? (
                      <span>Votação Encerrada</span>
                    ) : (
                      <>
                        <Vote className="w-3.5 h-3.5" />
                        <span>Votar neste carro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Informações do Eleitor Rodapé */}
      <div className="bg-[#181818] p-3 rounded-lg border border-[#262626] text-center">
        <span className="text-[10px] text-gray-500">
          Eleitor identificado sob sessão:
        </span>
        <div className="text-[10px] font-mono text-text-secondary font-semibold mt-0.5">
          {user.id}
        </div>
      </div>
    </div>
  );
}
