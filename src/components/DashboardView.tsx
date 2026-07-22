import React, { useState, useEffect } from 'react';
import { ToggleLeft, ToggleRight, Car, BarChart3, ShieldCheck, Plus, LogOut, RefreshCw, Layers, Camera, Trash2 } from 'lucide-react';
import type { Carro, Categoria, Evento } from '../data/mockData';

interface DashboardViewProps {
  evento: Evento | null;
  carros: Carro[];
  categorias: Categoria[];
  resultados: Record<string, { carroId: string; votosCount: number }[]>;
  isLoading: boolean;
  error: string | null;
  cadastrarCarro: (
    numeroInscricao: string,
    modelo: string,
    ano: number,
    alturaMm: number,
    nomeDono: string,
    telefoneDono?: string,
    urlFoto?: string,
    equipe?: string,
    kmRodado?: number
  ) => Promise<void>;
  deletarCarro: (id: string) => Promise<void>;
  toggleStatusVotacao: () => Promise<void>;
  fetchResultados: () => Promise<void>;
  logout: () => void;
}

type TabType = 'status' | 'resultados' | 'carros' | 'validacao';

export function DashboardView({
  evento,
  carros,
  categorias,
  resultados,
  isLoading: _isLoading,
  error,
  cadastrarCarro,
  deletarCarro,
  toggleStatusVotacao,
  fetchResultados,
  logout,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [valTab, setValTab] = useState<'ano' | 'rodagem' | 'equipes'>('ano');
  
  // States para cadastro de carro
  const [numeroInscricao, setNumeroInscricao] = useState('');
  const [isManualInscricao, setIsManualInscricao] = useState(false);
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');
  const [alturaMm, setAlturaMm] = useState('');
  const [nomeDono, setNomeDono] = useState('');
  const [telefoneDono, setTelefoneDono] = useState('');
  const [urlFoto, setUrlFoto] = useState('');
  const [equipe, setEquipe] = useState('');
  const [kmRodado, setKmRodado] = useState('');
  
  const [cadastroMsg, setCadastroMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Calcula o próximo número de inscrição sugerido sequencialmente
  const getNextSuggestedInscricao = () => {
    const numbers = carros
      .map((c) => {
        const match = c.numero_inscricao.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      })
      .filter((n): n is number => n !== null);
    const max = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `#${String(max + 1).padStart(3, '0')}`;
  };

  // Mantém o número de inscrição atualizado automaticamente
  useEffect(() => {
    if (!isManualInscricao) {
      setNumeroInscricao(getNextSuggestedInscricao());
    }
  }, [carros, isManualInscricao]);

  // Recarregar os resultados quando abre a aba correspondente
  useEffect(() => {
    if (activeTab === 'resultados') {
      fetchResultados();
    }
  }, [activeTab]);

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar e comprimir para manter string de base64 pequena (max 400px)
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = (height * maxDim) / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = (width * maxDim) / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Salvar em JPEG com 80% de qualidade
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            setUrlFoto(compressedBase64);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCadastrarCarro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadastroMsg(null);
    if (!numeroInscricao || !modelo || !ano || !alturaMm || !nomeDono) {
      setCadastroMsg({ type: 'error', text: 'Preencha todos os campos obrigatórios (*).' });
      return;
    }

    setSubmitting(true);
    try {
      await cadastrarCarro(
        numeroInscricao,
        modelo,
        parseInt(ano),
        parseInt(alturaMm),
        nomeDono,
        telefoneDono || undefined,
        urlFoto || undefined,
        equipe || undefined,
        kmRodado ? parseInt(kmRodado) : undefined
      );
      setCadastroMsg({ type: 'success', text: 'Carro cadastrado com sucesso!' });
      
      // Limpa formulário
      setModelo('');
      setAno('');
      setAlturaMm('');
      setNomeDono('');
      setTelefoneDono('');
      setUrlFoto('');
      setEquipe('');
      setKmRodado('');
      setIsManualInscricao(false); // Volta a ser automático
    } catch (err: any) {
      setCadastroMsg({ type: 'error', text: err.message || 'Erro ao cadastrar carro.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Lógica de validação interna: ordenar carros do mais antigo para o mais recente (ano ASC)
  const carrosValidadosAntigos = [...carros].sort((a, b) => a.ano - b.ano);

  return (
    <>
      {/* Sidebar - Desktop */}
      <div className="w-full md:w-64 bg-surface border-r border-[#2b2b2b] p-5 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="flex items-center space-x-2.5 mb-8">
            <div className="w-10 h-10 rounded-lg bg-[#121212] border border-primary flex items-center justify-center">
              <Car className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wider uppercase text-white leading-none">
                Painel Organizador
              </h2>
              <span className="text-[10px] text-text-secondary">Garagem Flow</span>
            </div>
          </div>

          {/* Links de Navegação */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('status')}
              className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-3 ${
                activeTab === 'status'
                  ? 'bg-primary text-white shadow-md shadow-primary/10'
                  : 'text-gray-400 hover:text-white hover:bg-[#222]'
              }`}
            >
              {evento?.status === 'aberto' ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              <span>Status da Votação</span>
            </button>

            <button
              onClick={() => setActiveTab('resultados')}
              className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-3 ${
                activeTab === 'resultados'
                  ? 'bg-primary text-white shadow-md shadow-primary/10'
                  : 'text-gray-400 hover:text-white hover:bg-[#222]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Resultados (Tempo Real)</span>
            </button>

            <button
              onClick={() => setActiveTab('carros')}
              className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-3 ${
                activeTab === 'carros'
                  ? 'bg-primary text-white shadow-md shadow-primary/10'
                  : 'text-gray-400 hover:text-white hover:bg-[#222]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Gerenciar Carros</span>
            </button>

            <button
              onClick={() => setActiveTab('validacao')}
              className={`w-full text-left px-3.5 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-3 ${
                activeTab === 'validacao'
                  ? 'bg-primary text-white shadow-md shadow-primary/10'
                  : 'text-gray-400 hover:text-white hover:bg-[#222]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Validação Interna</span>
            </button>
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="mt-8 px-3.5 py-3 rounded-lg text-xs font-bold text-gray-400 hover:text-primary hover:bg-red-950/20 transition-all flex items-center space-x-3 border border-transparent hover:border-red-950/50"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair do Painel</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-screen">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#2b2b2b] pb-5 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
              {evento?.nome || 'Carregando Evento...'}
            </h1>
            <p className="text-xs text-text-secondary mt-1">
              Data do Evento: {evento?.data}
            </p>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              evento?.status === 'aberto' ? 'bg-green-950/50 border border-green-500/50 text-green-300' : 'bg-red-950/50 border border-primary/50 text-red-300'
            }`}>
              {evento?.status === 'aberto' ? 'Votação Ativa' : 'Votação Suspensa'}
            </span>
            <button
              onClick={() => {
                fetchResultados();
              }}
              className="p-2 rounded-lg bg-surface border border-[#333] hover:border-secondary text-gray-400 hover:text-white transition-colors"
              title="Sincronizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-primary/40 text-red-200 text-xs px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* TAB: STATUS */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-surface rounded-xl p-6 border border-[#2b2b2b]">
              <h3 className="font-bold text-md text-white mb-2">Controles da Votação</h3>
              <p className="text-xs text-gray-400 mb-6 max-w-xl">
                Controle se os visitantes do evento podem enviar novos votos em tempo real. Fechar a votação congela os resultados imediatamente nas telas do público.
              </p>

              <div className="flex items-center space-x-4">
                <button
                  onClick={toggleStatusVotacao}
                  className={`px-6 py-3.5 rounded-xl font-bold text-sm flex items-center space-x-3 transition-all ${
                    evento?.status === 'aberto'
                      ? 'bg-primary hover:bg-[#c9922f] text-white shadow-lg shadow-primary/20'
                      : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20'
                  }`}
                >
                  {evento?.status === 'aberto' ? (
                    <>
                      <ToggleRight className="w-5 h-5" />
                      <span>Encerrar Votação</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5" />
                      <span>Abrir Votação</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b]">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Total de Carros</span>
                <p className="text-3xl font-black text-white mt-1">{carros.length}</p>
              </div>
              <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b]">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Categorias</span>
                <p className="text-3xl font-black text-white mt-1">{categorias.length}</p>
              </div>
              <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b]">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Status Atual</span>
                <p className={`text-lg font-black uppercase mt-2.5 ${evento?.status === 'aberto' ? 'text-green-400' : 'text-primary'}`}>
                  {evento?.status === 'aberto' ? 'Aceitando Votos' : 'Votação Fechada'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: RESULTADOS */}
        {activeTab === 'resultados' && (
          <div className="space-y-6">
            <h3 className="font-bold text-md text-white">Classificação por Categoria Votada (Top 3)</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categorias
                .filter((c) => c.tipo === 'popular')
                .map((cat) => {
                  const votosCat = resultados[cat.id] || [];
                  // Calcular total de votos na categoria
                  const totalVotosCat = votosCat.reduce((sum, item) => sum + item.votosCount, 0);

                  return (
                    <div key={cat.id} className="bg-surface rounded-xl p-5 border border-[#2b2b2b] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-3 mb-4">
                          <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">{cat.nome}</h4>
                          <span className="text-[11px] font-semibold text-gray-400 bg-[#121212] px-2 py-0.5 rounded-full">
                            {totalVotosCat} votos totais
                          </span>
                        </div>

                        <div className="space-y-4">
                          {votosCat.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500">
                              Nenhum voto computado para esta categoria.
                            </div>
                          ) : (
                            votosCat.slice(0, 3).map((item, index) => {
                              const carro = carros.find((c) => c.id === item.carroId);
                              const percent = totalVotosCat > 0 ? (item.votosCount / totalVotosCat) * 100 : 0;
                              const medalColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-400' : 'text-amber-700';

                              return (
                                <div key={item.carroId} className="space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <span className={`font-black ${medalColor}`}>#{index + 1}</span>
                                      <span className="font-bold text-white line-clamp-1">
                                        {carro ? `${carro.modelo} (${carro.numero_inscricao})` : `ID Carro: ${item.carroId}`}
                                      </span>
                                    </div>
                                    <span className="font-bold text-white shrink-0">
                                      {item.votosCount} votos ({percent.toFixed(0)}%)
                                    </span>
                                  </div>
                                  
                                  {/* Barra de progresso */}
                                  <div className="w-full bg-[#121212] h-2 rounded-full overflow-hidden border border-[#333]">
                                    <div
                                      className="bg-primary h-full rounded-full transition-all duration-500"
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Seção de Categorias Automáticas */}
            <div className="mt-8 border-t border-[#2b2b2b] pt-6">
              <h3 className="font-bold text-md text-white mb-4">Resultados das Categorias Automáticas / Quantidade</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Mais Antigo */}
                {(() => {
                  const oldestCars = [...carros]
                    .filter((c) => c.ano)
                    .sort((a, b) => a.ano - b.ano)
                    .slice(0, 3);
                  return (
                    <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-3 mb-4">
                          <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Mais antigo</h4>
                          <span className="text-[10px] font-semibold text-primary bg-[#121212] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Ano (Crescente)
                          </span>
                        </div>
                        <div className="space-y-4">
                          {oldestCars.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500">
                              Nenhum carro cadastrado.
                            </div>
                          ) : (
                            oldestCars.map((carro, index) => {
                              const medalColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-400' : 'text-amber-700';
                              return (
                                <div key={carro.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <span className={`font-black ${medalColor}`}>#{index + 1}</span>
                                      <span className="font-bold text-white line-clamp-1">
                                        {carro.modelo} ({carro.numero_inscricao})
                                      </span>
                                    </div>
                                    <span className="font-bold text-white shrink-0">
                                      {carro.ano}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-text-secondary pl-5">
                                    Dono(a): {carro.nome_dono}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Maior rodagem */}
                {(() => {
                  const longestMilage = [...carros]
                    .filter((c) => c.km_rodado !== undefined && c.km_rodado > 0)
                    .sort((a, b) => (b.km_rodado || 0) - (a.km_rodado || 0))
                    .slice(0, 3);
                  return (
                    <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-3 mb-4">
                          <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Maior rodagem</h4>
                          <span className="text-[10px] font-semibold text-primary bg-[#121212] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            KM (Decrescente)
                          </span>
                        </div>
                        <div className="space-y-4">
                          {longestMilage.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500">
                              Nenhum veículo com rodagem informada.
                            </div>
                          ) : (
                            longestMilage.map((carro, index) => {
                              const medalColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-400' : 'text-amber-700';
                              return (
                                <div key={carro.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <span className={`font-black ${medalColor}`}>#{index + 1}</span>
                                      <span className="font-bold text-white line-clamp-1">
                                        {carro.modelo} ({carro.numero_inscricao})
                                      </span>
                                    </div>
                                    <span className="font-bold text-white shrink-0">
                                      {carro.km_rodado} km
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-text-secondary pl-5">
                                    Dono(a): {carro.nome_dono}
                                  </p>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Maior equipe uniformizada */}
                {(() => {
                  const teamCounts: Record<string, number> = {};
                  carros.forEach((c) => {
                    if (c.equipe && c.equipe.trim()) {
                      const t = c.equipe.trim();
                      teamCounts[t] = (teamCounts[t] || 0) + 1;
                    }
                  });
                  const sortedTeams = Object.keys(teamCounts)
                    .map((teamName) => ({ teamName, count: teamCounts[teamName] }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 3);
                  return (
                    <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-[#2b2b2b] pb-3 mb-4">
                          <h4 className="font-bold text-sm text-secondary uppercase tracking-wider">Maior equipe</h4>
                          <span className="text-[10px] font-semibold text-primary bg-[#121212] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Qtd Carros
                          </span>
                        </div>
                        <div className="space-y-4">
                          {sortedTeams.length === 0 ? (
                            <div className="text-center py-6 text-xs text-gray-500">
                              Nenhuma equipe registrada.
                            </div>
                          ) : (
                            sortedTeams.map((team, index) => {
                              const medalColor = index === 0 ? 'text-amber-400' : index === 1 ? 'text-gray-400' : 'text-amber-700';
                              return (
                                <div key={team.teamName} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center space-x-2">
                                      <span className={`font-black ${medalColor}`}>#{index + 1}</span>
                                      <span className="font-bold text-white line-clamp-1">
                                        {team.teamName}
                                      </span>
                                    </div>
                                    <span className="font-bold text-white shrink-0">
                                      {team.count} carros
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
          </div>
        )}

        {/* TAB: GERENCIAR CARROS */}
        {activeTab === 'carros' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form de Cadastro */}
            <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b] h-fit">
              <h3 className="font-bold text-sm text-white border-b border-[#2b2b2b] pb-3 mb-4 uppercase tracking-wider flex items-center space-x-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>Novo Carro</span>
              </h3>

              <form onSubmit={handleCadastrarCarro} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-text-secondary uppercase">
                      Número de Inscrição *
                    </label>
                    <span className="text-[10px] text-gray-500">
                      {isManualInscricao ? 'Manual' : 'Automático'}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: #024"
                    value={numeroInscricao}
                    onChange={(e) => {
                      setNumeroInscricao(e.target.value);
                      setIsManualInscricao(true); // O usuário digitou manualmente
                    }}
                    className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                  />
                  {isManualInscricao && (
                    <button
                      type="button"
                      onClick={() => setIsManualInscricao(false)}
                      className="text-[10px] text-secondary hover:underline mt-1 focus:outline-none"
                    >
                      Voltar para Automático
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Modelo do Carro *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: VW Gol 1.8"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Ano *
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 1994"
                      value={ano}
                      onChange={(e) => setAno(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Altura (mm) *
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 50"
                      value={alturaMm}
                      onChange={(e) => setAlturaMm(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Nome do Dono/a & Telefone */}
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Nome do Dono/a *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rodrigo Silva"
                    value={nomeDono}
                    onChange={(e) => setNomeDono(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                    Telefone do Dono (Org)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98888-8888"
                    value={telefoneDono}
                    onChange={(e) => setTelefoneDono(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Equipe / Clube
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Flow Club"
                      value={equipe}
                      onChange={(e) => setEquipe(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">
                      Km Rodados (Distância)
                    </label>
                    <input
                      type="number"
                      placeholder="Ex: 150"
                      value={kmRodado}
                      onChange={(e) => setKmRodado(e.target.value)}
                      className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                    />
                  </div>
                </div>

                {/* Capturar Imagem com Câmera */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-text-secondary uppercase">
                    Foto do Veículo
                  </label>
                  
                  {urlFoto && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-[#2b2b2b] bg-[#121212]">
                      <img src={urlFoto} alt="Preview do carro" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setUrlFoto('')}
                        className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-black text-white font-bold p-1 rounded-full text-[10px]"
                      >
                        Remover
                      </button>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => document.getElementById('camera-file-input')?.click()}
                      className="flex-1 bg-[#121212] hover:bg-[#1a1a1a] border border-[#333] hover:border-secondary text-white py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                    >
                      <Camera className="w-3.5 h-3.5 text-secondary" />
                      <span>Abrir Câmera / Tirar Foto</span>
                    </button>
                    <input
                      id="camera-file-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleCameraCapture}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Ou cole uma URL da foto..."
                    value={urlFoto.startsWith('data:image') ? '' : urlFoto}
                    onChange={(e) => setUrlFoto(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2 px-3 text-white text-xs outline-none"
                  />
                </div>

                {cadastroMsg && (
                  <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                    cadastroMsg.type === 'success' ? 'bg-green-950/40 text-green-300 border border-green-500/40' : 'bg-red-950/40 text-red-300 border border-primary/40'
                  }`}>
                    {cadastroMsg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-secondary hover:bg-[#39637e] text-white font-bold py-2 px-4 rounded-lg text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  {submitting ? 'Salvando...' : 'Adicionar Carro'}
                </button>
              </form>
            </div>

            {/* Listagem de Carros cadastrados */}
            <div className="lg:col-span-2 bg-surface rounded-xl p-5 border border-[#2b2b2b]">
              <h3 className="font-bold text-sm text-white border-b border-[#2b2b2b] pb-3 mb-4 uppercase tracking-wider">
                Lista de Carros Cadastrados ({carros.length})
              </h3>

              <div className="max-h-[500px] overflow-y-auto space-y-3 pr-2">
                {carros.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 py-6">Nenhum carro cadastrado.</p>
                ) : (
                  carros.map((carro) => (
                    <div key={carro.id} className="bg-[#121212] border border-[#282828] rounded-lg p-3 flex items-center justify-between space-x-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={carro.url_foto}
                          alt={carro.modelo}
                          className="w-12 h-12 object-cover rounded-md border border-[#222] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-white truncate">{carro.modelo}</h4>
                          <div className="text-[10px] text-text-secondary mt-0.5 space-y-0.5">
                            <div>
                              Dono(a): <span className="text-white font-semibold">{carro.nome_dono}</span>
                              {carro.equipe && (
                                <> | Equipe: <span className="text-secondary">{carro.equipe}</span></>
                              )}
                              {carro.telefone_dono && (
                                <> | Tel: <span className="text-gray-400">{carro.telefone_dono}</span></>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="bg-surface px-1.5 py-0.5 rounded text-white font-semibold">{carro.numero_inscricao}</span>
                              <span>Ano: {carro.ano}</span>
                              <span>•</span>
                              <span>{carro.altura_mm} mm</span>
                              {carro.km_rodado !== undefined && carro.km_rodado > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-secondary">{carro.km_rodado} km rodados</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Botão de Excluir Carro */}
                      <button
                        onClick={async () => {
                          if (confirm(`Tem certeza que deseja excluir o carro "${carro.modelo}" (Inscrição: ${carro.numero_inscricao})?`)) {
                            await deletarCarro(carro.id);
                          }
                        }}
                        className="p-2 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-primary hover:text-red-400 transition-colors focus:outline-none shrink-0"
                        title="Excluir Carro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: VALIDAÇÃO INTERNA */}
        {activeTab === 'validacao' && (
          <div className="bg-surface rounded-xl p-6 border border-[#2b2b2b] space-y-6">
            <div>
              <h3 className="font-bold text-md text-white mb-2">Validação Interna de Frota e Equipes</h3>
              <p className="text-xs text-gray-400">
                Esta seção apresenta dados consolidados para auditoria dos organizadores e apuração dos troféus automáticos.
              </p>
            </div>

            {/* Sub-abas de Validação */}
            <div className="flex border-b border-[#2b2b2b]">
              <button
                onClick={() => setValTab('ano')}
                className={`py-2.5 px-4 font-bold text-xs uppercase transition-colors border-b-2 outline-none ${
                  valTab === 'ano'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Frota por Ano (Antigos)
              </button>
              <button
                onClick={() => setValTab('rodagem')}
                className={`py-2.5 px-4 font-bold text-xs uppercase transition-colors border-b-2 outline-none ${
                  valTab === 'rodagem'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Frota por Rodagem (KM)
              </button>
              <button
                onClick={() => setValTab('equipes')}
                className={`py-2.5 px-4 font-bold text-xs uppercase transition-colors border-b-2 outline-none ${
                  valTab === 'equipes'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Equipes (Quantidade)
              </button>
            </div>

            {/* TABELA 1: FROTAS POR ANO */}
            {valTab === 'ano' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2b2b2b] text-text-secondary">
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Ordenação</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Inscrição</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Modelo</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Dono(a)</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Equipe</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Ano Fabricação</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2b2b2b]">
                    {carrosValidadosAntigos.map((carro, index) => {
                      const isFirst = index === 0;
                      return (
                        <tr
                          key={carro.id}
                          className={`hover:bg-[#252525] transition-colors ${
                            isFirst ? 'bg-primary/5 font-semibold text-primary' : 'text-white'
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            {isFirst ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-black">
                                MAIS ANTIGO
                              </span>
                            ) : (
                              <span>{index + 1}º mais antigo</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold">{carro.numero_inscricao}</td>
                          <td className="py-3.5 px-4">{carro.modelo}</td>
                          <td className="py-3.5 px-4">{carro.nome_dono}</td>
                          <td className="py-3.5 px-4 font-semibold text-secondary">{carro.equipe || '-'}</td>
                          <td className="py-3.5 px-4">{carro.ano}</td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={async () => {
                                if (confirm(`Tem certeza que deseja excluir o carro "${carro.modelo}"?`)) {
                                  await deletarCarro(carro.id);
                                }
                              }}
                              className="p-1.5 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-primary hover:text-red-400 transition-colors focus:outline-none"
                              title="Excluir Carro"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABELA 2: FROTAS POR RODAGEM */}
            {valTab === 'rodagem' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2b2b2b] text-text-secondary">
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Ordenação</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Inscrição</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Modelo</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Dono(a)</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Equipe</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Km Rodado</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2b2b2b]">
                    {[...carros]
                      .sort((a, b) => (b.km_rodado || 0) - (a.km_rodado || 0))
                      .map((carro, index) => {
                        const isFirst = index === 0 && (carro.km_rodado || 0) > 0;
                        return (
                          <tr
                            key={carro.id}
                            className={`hover:bg-[#252525] transition-colors ${
                              isFirst ? 'bg-primary/5 font-semibold text-primary' : 'text-white'
                            }`}
                          >
                            <td className="py-3.5 px-4">
                              {isFirst ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-black">
                                  MAIOR RODAGEM
                                </span>
                              ) : (
                                <span>{index + 1}º mais rodado</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-bold">{carro.numero_inscricao}</td>
                            <td className="py-3.5 px-4">{carro.modelo}</td>
                            <td className="py-3.5 px-4">{carro.nome_dono}</td>
                            <td className="py-3.5 px-4 font-semibold text-secondary">{carro.equipe || '-'}</td>
                            <td className="py-3.5 px-4">{carro.km_rodado || 0} km</td>
                            <td className="py-3.5 px-4">
                              <button
                                onClick={async () => {
                                  if (confirm(`Tem certeza que deseja excluir o carro "${carro.modelo}"?`)) {
                                    await deletarCarro(carro.id);
                                  }
                                }}
                                className="p-1.5 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-primary hover:text-red-400 transition-colors focus:outline-none"
                                title="Excluir Carro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TABELA 3: EQUIPES POR QUANTIDADE */}
            {valTab === 'equipes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#2b2b2b] text-text-secondary">
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Ordenação</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Nome da Equipe</th>
                      <th className="py-3 px-4 font-bold uppercase tracking-wider">Integrantes/Carros Inscritos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2b2b2b]">
                    {(() => {
                      const teamCounts: Record<string, number> = {};
                      carros.forEach((c) => {
                        if (c.equipe && c.equipe.trim()) {
                          const t = c.equipe.trim();
                          teamCounts[t] = (teamCounts[t] || 0) + 1;
                        }
                      });
                      const sortedTeams = Object.keys(teamCounts)
                        .map((teamName) => ({ teamName, count: teamCounts[teamName] }))
                        .sort((a, b) => b.count - a.count);

                      return sortedTeams.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-gray-500">
                            Nenhuma equipe com veículo cadastrado.
                          </td>
                        </tr>
                      ) : (
                        sortedTeams.map((team, index) => {
                          const isFirst = index === 0;
                          return (
                            <tr
                              key={team.teamName}
                              className={`hover:bg-[#252525] transition-colors ${
                                isFirst ? 'bg-primary/5 font-semibold text-primary' : 'text-white'
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                {isFirst ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-black">
                                    MAIOR EQUIPE
                                  </span>
                                ) : (
                                  <span>{index + 1}ª equipe</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-bold">{team.teamName}</td>
                              <td className="py-3.5 px-4">{team.count} carros inscritos</td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
