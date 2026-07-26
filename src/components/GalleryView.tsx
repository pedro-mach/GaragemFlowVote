import React, { useState, useEffect } from 'react';
import { LogOut, Vote, AlertCircle, CheckCircle2, Trophy, Search, Gauge, Calendar, Ruler, Car, Shield, X, ZoomIn, UserPlus, AlertTriangle, Award, Users, Sparkles } from 'lucide-react';
import type { Carro, Categoria, Evento, Voto, Eleitor, Equipe } from '../data/mockData';
import { validateTeamName } from '../utils/teamValidation';

interface GalleryViewProps {
  user: Eleitor;
  evento: Evento | null;
  carros: Carro[];
  categorias: Categoria[];
  equipes?: Equipe[];
  userVotos: Voto[];
  resultados?: Record<string, { carroId: string; votosCount: number }[]>;
  totalVotos?: number;
  fetchResultados?: () => Promise<void>;
  votar: (carroId: string, categoriaId: string) => Promise<void>;
  cadastrarEquipe?: (nome: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export function GalleryView({
  user,
  evento,
  carros = [],
  categorias = [],
  equipes = [],
  userVotos = [],
  resultados = {},
  totalVotos: _totalVotos = 0,
  fetchResultados,
  votar,
  cadastrarEquipe,
  logout,
  isLoading,
  error: _error,
}: GalleryViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<'votacao' | 'resultados'>('votacao');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; modelo: string; numero: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  // States modal de cadastro de equipe por usuários normais
  const [showEquipeModal, setShowEquipeModal] = useState(false);
  const [equipeNomeInput, setEquipeNomeInput] = useState('');
  const [equipeValidationMsg, setEquipeValidationMsg] = useState<{
    type: 'error' | 'warning' | 'success';
    text: string;
    similarTeam?: Equipe;
  } | null>(null);
  const [submittingEquipe, setSubmittingEquipe] = useState(false);

  // Fechar lightbox com Esc
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomPhoto(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (activeMainTab === 'resultados' && fetchResultados) {
      fetchResultados();
    }
  }, [activeMainTab]);

  const safeCategorias = Array.isArray(categorias) ? categorias : [];
  const safeCarros = Array.isArray(carros) ? carros : [];
  const safeEquipes = Array.isArray(equipes) ? equipes : [];
  const safeUserVotos = Array.isArray(userVotos) ? userVotos : [];

  const visibleCategorias = safeCategorias.filter((c) => !c?.oculta);
  const currentCategory = visibleCategorias.find((c) => c?.id === activeCategoryId);
  const isInternalCategory = currentCategory?.tipo === 'interna';
  const isMaiorEquipeCategory = currentCategory?.id === 'cat-4' || currentCategory?.nome?.toLowerCase().includes('equipe');

  const equipesUniformizadas = React.useMemo(() => {
    const groups: Record<string, number> = {};
    safeCarros.forEach(c => {
      if (c.equipe && c.equipe.trim() && c.pessoas_equipe && c.pessoas_equipe > 0) {
        const name = c.equipe.trim();
        groups[name] = Math.max(groups[name] || 0, c.pessoas_equipe);
      }
    });

    let list = Object.entries(groups)
      .map(([nome, total]) => ({ nome, total }));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(item => item.nome.toLowerCase().includes(term));
    }

    return list.sort((a, b) => b.total - a.total);
  }, [safeCarros, searchTerm]);

  React.useEffect(() => {
    if (visibleCategorias.length > 0 && (!activeCategoryId || !visibleCategorias.some((c) => c.id === activeCategoryId))) {
      setActiveCategoryId(visibleCategorias[0].id);
    }
  }, [categorias, activeCategoryId]);

  const handleCreateEquipeSubmit = async (force: boolean = false) => {
    if (!equipeNomeInput.trim() || !cadastrarEquipe) return;

    if (!force) {
      const res = validateTeamName(equipeNomeInput, equipes);
      if (res.status === 'profanity') {
        setEquipeValidationMsg({ type: 'error', text: res.message || 'Nome inadequado.' });
        return;
      }
      if (res.status === 'exact') {
        setEquipeValidationMsg({ type: 'error', text: res.message || 'Esta equipe já existe.' });
        return;
      }
      if (res.status === 'similar') {
        setEquipeValidationMsg({
          type: 'warning',
          text: res.message || 'Equipe parecida encontrada.',
          similarTeam: res.similarTeam,
        });
        return;
      }
    }

    setSubmittingEquipe(true);
    try {
      await cadastrarEquipe(equipeNomeInput.trim());
      setEquipeValidationMsg({ type: 'success', text: `Equipe "${equipeNomeInput.trim()}" cadastrada com sucesso!` });
      setTimeout(() => {
        setShowEquipeModal(false);
        setEquipeNomeInput('');
        setEquipeValidationMsg(null);
      }, 1200);
    } catch (err: any) {
      setEquipeValidationMsg({ type: 'error', text: err.message || 'Erro ao cadastrar equipe.' });
    } finally {
      setSubmittingEquipe(false);
    }
  };

  useEffect(() => {
    setVisibleCount(10);
  }, [activeCategoryId, searchTerm]);

  const eventCarros = safeCarros
    .filter((c) => Boolean(c))
    .filter((c) => !evento || c.evento_id === evento.id)
    .filter((c) => {
      const catObj = safeCategorias.find((cat) => cat.id === activeCategoryId);
      const catName = (catObj?.nome || '').toLowerCase();
      const isDestaqueOuPopular = catObj?.tipo === 'popular' || catName.includes('destaque');

      // Se for categoria de destaque/popular de voto direto por visual, exige foto real
      if (isDestaqueOuPopular && (!c.url_foto || c.url_foto.trim() === '')) {
        return false;
      }
      return true;
    })
    .filter((c) => {
      const catObj = safeCategorias.find((cat) => cat.id === activeCategoryId);
      if (catObj) {
        const catName = (catObj.nome || '').toLowerCase();
        if (catName.includes('masculino') && c.genero !== 'M') return false;
        if (catName.includes('feminino') && c.genero !== 'F') return false;
      }
      return true;
    })
    .filter((c) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        (c.modelo || '').toLowerCase().includes(term) ||
        (c.numero_inscricao || '').toLowerCase().includes(term) ||
        (c.nome_dono || '').toLowerCase().includes(term) ||
        (c.equipe && c.equipe.toLowerCase().includes(term))
      );
    });

  const votoNestaCategoria = safeUserVotos.find(
    (v) => v.categoria_id === activeCategoryId
  );

  const handleVoto = async (carroId: string) => {
    if (!evento || evento.status === 'fechado' || isLoading) return;
    try {
      await votar(carroId, activeCategoryId);
    } catch (e) {
      // Erro tratado no hook useVotos
    }
  };

  const votacaoAberta = evento?.status === 'aberto';

  return (
    <div className="w-full flex-1 flex flex-col" style={{ gap: 0 }}>

      {/* ===== HEADER ===== */}
      <div
        style={{
          background: '#181818',
          borderBottom: '1px solid #202020',
          padding: '14px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 1,
        }}
      >
        {/* Linha 1: Logo + Status + Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo */}
          <div
            style={{
              width: 38,
              height: 38,
              background: '#202020',
              border: '1px solid rgba(255,192,0,0.25)',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            <img
              src="/Logo-evento.jpeg"
              alt="Logo Regional das Equipes em Valinhos - GaragemFlow, Los Felas, Low Mafia"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>

          {/* Status + Nome do Evento */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: votacaoAberta ? '#4ade80' : '#ef4444',
                  display: 'inline-block',
                  flexShrink: 0,
                  animation: votacaoAberta ? 'pulse-dot 1.4s infinite' : 'none',
                }}
              />
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: '#FFC000',
                whiteSpace: 'nowrap',
              }}>
                {votacaoAberta ? 'Votação Popular Aberta' : 'Votação Encerrada'} • Valinhos
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#FFFFFF',
              margin: 0,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {evento?.nome || 'Regional das Equipes em Valinhos'}
            </h1>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              color: '#888888',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: 2,
            }}>
              Organização: GaragemFlow • Los Felas • Low Mafia
            </div>
          </div>


          {/* Ações: Cadastrar Equipe + Sair */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {cadastrarEquipe && (
              <button
                onClick={() => {
                  setShowEquipeModal(true);
                  setEquipeNomeInput('');
                  setEquipeValidationMsg(null);
                }}
                className="btn-gold"
                style={{
                  height: 34,
                  padding: '0 10px',
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
                }}
                title="Cadastrar Minha Equipe"
              >
                <UserPlus size={13} />
                <span className="hidden sm:inline">Cadastrar Equipe</span>
              </button>
            )}

            <button
              onClick={logout}
              className="btn-ghost"
              style={{
                height: 34,
                padding: '0 10px',
                fontSize: 11,
                borderColor: 'rgba(255,255,255,0.2)',
              }}
              title="Sair"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Linha 2: Alternador de Tela (Votação vs Resultados) */}
        <div style={{ display: 'flex', gap: 0, background: '#0a0a0a', padding: 3, border: '1px solid #202020' }}>
          <button
            onClick={() => setActiveMainTab('votacao')}
            style={{
              flex: 1,
              height: 36,
              background: activeMainTab === 'votacao' ? '#FFC000' : 'transparent',
              color: activeMainTab === 'votacao' ? '#000000' : '#7D7D7D',
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Vote size={14} />
            <span>Votação de Carros</span>
          </button>
          <button
            onClick={() => {
              setActiveMainTab('resultados');
              if (fetchResultados) fetchResultados();
            }}
            style={{
              flex: 1,
              height: 36,
              background: activeMainTab === 'resultados' ? '#FFC000' : 'transparent',
              color: activeMainTab === 'resultados' ? '#000000' : '#7D7D7D',
              border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Trophy size={14} />
            <span>Resultados & Ranking</span>
          </button>
        </div>
      </div>

      {activeMainTab === 'resultados' ? (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100, margin: '0 auto', width: '100%' }}>


          {/* Seção 1: Classificação por Votação Popular */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Sparkles size={16} color="#FFC000" />
              <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
                Categorias de Votação Popular (Mais Votados)
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {visibleCategorias.filter((c) => c.tipo === 'popular').map((cat) => {
                const votosCat = (resultados && resultados[cat.id]) || [];
                const totalVotosCat = votosCat.reduce((sum, item) => sum + item.votosCount, 0);

                return (
                  <div key={cat.id} style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #FFC000', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #202020', paddingBottom: 10, marginBottom: 14 }}>
                      <h5 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFC000', margin: 0 }}>
                        {cat.nome}
                      </h5>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#7D7D7D', background: '#0a0a0a', border: '1px solid #313131', padding: '3px 8px' }}>
                        {totalVotosCat} voto(s)
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {votosCat.length === 0 ? (
                        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7D7D7D', textAlign: 'center', padding: '20px 0' }}>
                          Nenhum voto registrado nesta categoria ainda.
                        </div>
                      ) : (
                        votosCat.slice(0, 5).map((item, index) => {
                          const carro = safeCarros.find((c) => c.id === item.carroId);
                          const percent = totalVotosCat > 0 ? (item.votosCount / totalVotosCat) * 100 : 0;
                          const medalColors = [
                            { bg: '#FFC000', text: '#000000', label: '1º LUGAR' },
                            { bg: '#C0C0C0', text: '#000000', label: '2º LUGAR' },
                            { bg: '#CD7F32', text: '#FFFFFF', label: '3º LUGAR' },
                          ];
                          const medal = medalColors[index] || { bg: '#313131', text: '#A3A3A3', label: `${index + 1}º` };

                          return (
                            <div key={item.carroId} style={{ background: '#0a0a0a', border: '1px solid #202020', padding: '10px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                {/* Miniatura do carro */}
                                {carro?.url_foto ? (
                                  <div
                                    onClick={() => carro?.url_foto && setZoomPhoto({ url: carro.url_foto, modelo: carro.modelo, numero: carro.numero_inscricao })}
                                    style={{ width: 48, height: 48, background: '#181818', border: '1px solid #313131', cursor: 'pointer', flexShrink: 0, overflow: 'hidden' }}
                                    title="Clique para ampliar foto"
                                  >
                                    <img src={carro.url_foto} alt={carro.modelo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                ) : (
                                  <div style={{ width: 48, height: 48, background: '#181818', border: '1px solid #313131', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Car size={20} color="#7D7D7D" />
                                  </div>
                                )}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                                      <span style={{
                                        background: medal.bg,
                                        color: medal.text,
                                        padding: '1px 6px',
                                        fontFamily: "'Barlow Condensed', sans-serif",
                                        fontWeight: 800,
                                        fontSize: 10,
                                        letterSpacing: '0.08em',
                                        flexShrink: 0,
                                      }}>
                                        {medal.label}
                                      </span>
                                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {carro ? `${carro.modelo} ${carro.numero_inscricao ? `(#${carro.numero_inscricao})` : ''}` : `ID: ${item.carroId}`}
                                      </span>
                                    </div>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#FFC000', flexShrink: 0 }}>
                                      {item.votosCount} vts ({percent.toFixed(0)}%)
                                    </span>
                                  </div>

                                  {carro && (carro.nome_dono || carro.equipe) && (
                                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {carro.nome_dono}{carro.equipe ? ` • Equipe: ${carro.equipe}` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Barra de progresso */}
                              <div style={{ width: '100%', height: 4, background: '#181818', overflow: 'hidden' }}>
                                <div style={{ width: `${percent}%`, height: '100%', background: index === 0 ? '#FFC000' : index === 1 ? '#C0C0C0' : '#CD7F32', transition: 'width 0.4s ease' }} />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Categorias Automotivas Especiais da Organização */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Award size={16} color="#FFC000" />
              <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
                Destaques Técnicos
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {/* Carro Mais Antigo */}
              {(() => {
                const antigo = safeCarros.filter(c => c.ano && c.ano > 1900).sort((a, b) => a.ano - b.ano)[0];
                return (
                  <div style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #3b82f6', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Calendar size={16} color="#3b82f6" />
                      <h5 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: '#3b82f6', margin: 0 }}>
                        Carro Mais Antigo Cadastrado
                      </h5>
                    </div>
                    {antigo ? (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {antigo.url_foto ? (
                          <img src={antigo.url_foto} alt={antigo.modelo} style={{ width: 56, height: 56, objectFit: 'cover', border: '1px solid #313131', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 56, height: 56, background: '#0a0a0a', border: '1px solid #313131', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Car size={24} color="#7D7D7D" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>
                            {antigo.modelo} ({antigo.ano})
                          </div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#FFC000' }}>
                            Inscrição #{antigo.numero_inscricao}
                          </div>
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D' }}>
                            Dono: {antigo.nome_dono}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#7D7D7D' }}>Sem dados suficientes</span>
                    )}
                  </div>
                );
              })()}

              {/* Maior Equipe Uniformizada */}
              {(() => {
                const equipeLider = safeCarros.filter(c => c.pessoas_equipe && c.pessoas_equipe > 0).sort((a, b) => (b.pessoas_equipe || 0) - (a.pessoas_equipe || 0))[0];
                return (
                  <div style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #22c55e', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Users size={16} color="#22c55e" />
                      <h5 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: '#22c55e', margin: 0 }}>
                        Maior Equipe
                      </h5>
                    </div>
                    {equipeLider ? (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 56, height: 56, background: '#0a0a0a', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Users size={24} color="#22c55e" />
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>
                            {equipeLider.equipe || 'Equipe Sem Nome'}
                          </div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#22c55e', fontWeight: 700 }}>
                            {equipeLider.pessoas_equipe} Integrantes Uniformizados
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#7D7D7D' }}>Sem dados suficientes</span>
                    )}
                  </div>
                );
              })()}

              {/* Maior Rodagem */}
              {(() => {
                const rodagemLider = safeCarros.filter(c => c.km_rodado && c.km_rodado > 0).sort((a, b) => (b.km_rodado || 0) - (a.km_rodado || 0))[0];
                return (
                  <div style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #eab308', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Gauge size={16} color="#eab308" />
                      <h5 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: '#eab308', margin: 0 }}>
                        Maior Rodagem
                      </h5>
                    </div>
                    {rodagemLider ? (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {rodagemLider.url_foto ? (
                          <img src={rodagemLider.url_foto} alt={rodagemLider.modelo} style={{ width: 56, height: 56, objectFit: 'cover', border: '1px solid #313131', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 56, height: 56, background: '#0a0a0a', border: '1px solid #313131', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Car size={24} color="#7D7D7D" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>
                            {rodagemLider.modelo} ({rodagemLider.numero_inscricao})
                          </div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#eab308', fontWeight: 700 }}>
                            {rodagemLider.km_rodado?.toLocaleString('pt-BR')} KM Rodados
                          </div>
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D' }}>
                            Dono: {rodagemLider.nome_dono}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#7D7D7D' }}>Sem dados suficientes</span>
                    )}
                  </div>
                );
              })()}

              {/* Menor Altura / Mais Baixo */}
              {(() => {
                const rebaixadoLider = safeCarros.filter(c => c.altura_mm && c.altura_mm > 0).sort((a, b) => (a.altura_mm || 0) - (b.altura_mm || 0))[0];
                return (
                  <div style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #a855f7', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <Ruler size={16} color="#a855f7" />
                      <h5 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: '#a855f7', margin: 0 }}>
                        Menor Altura (Mais Baixo)
                      </h5>
                    </div>
                    {rebaixadoLider ? (
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {rebaixadoLider.url_foto ? (
                          <img src={rebaixadoLider.url_foto} alt={rebaixadoLider.modelo} style={{ width: 56, height: 56, objectFit: 'cover', border: '1px solid #313131', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 56, height: 56, background: '#0a0a0a', border: '1px solid #313131', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Car size={24} color="#7D7D7D" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>
                            {rebaixadoLider.modelo} (#{rebaixadoLider.numero_inscricao})
                          </div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#a855f7', fontWeight: 700 }}>
                            {rebaixadoLider.altura_mm} mm de altura
                          </div>
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D' }}>
                            Dono: {rebaixadoLider.nome_dono}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#7D7D7D' }}>Sem dados suficientes</span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Linha 2: Busca */}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              color="#7D7D7D"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Buscar por nº (#042), modelo, dono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-ds"
              style={{ paddingLeft: 40, paddingRight: 36, height: 40, fontSize: 13 }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#7D7D7D',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* ===== ALERTA ENCERRADA ===== */}
          {!votacaoAberta && (
            <div
              style={{
                background: 'rgba(180,0,0,0.12)',
                borderBottom: '1px solid rgba(200,50,50,0.3)',
                borderLeft: '3px solid #ef4444',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#fca5a5' }}>
                A votação deste evento foi encerrada pelos organizadores.
              </span>
            </div>
          )}

          {/* ===== TABS DE CATEGORIAS ===== */}
          <div
            style={{
              background: '#181818',
              borderBottom: '1px solid #202020',
              padding: '12px 20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={14} color="#FFC000" />
                <span className="label-ds">Categorias de Votação</span>
              </div>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#FFC000',
                background: 'rgba(255,192,0,0.08)',
                border: '1px solid rgba(255,192,0,0.2)',
                padding: '4px 12px',
              }}>
                {safeUserVotos.length} voto(s)
              </span>
            </div>

            <div className="no-scrollbar" style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
              {visibleCategorias.map((cat) => {
                const isSelected = cat.id === activeCategoryId;
                const jaVotou = safeUserVotos.some((v) => v.categoria_id === cat.id);
                const isInterna = cat.tipo === 'interna';
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    style={{
                      flexShrink: 0,
                      padding: '10px 16px',
                      background: isSelected ? '#FFC000' : '#202020',
                      color: isSelected ? '#000000' : '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      transition: 'background 0.12s ease, color 0.12s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = '#313131';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = '#202020';
                    }}
                  >
                    <span>{cat.nome}</span>
                    {isInterna ? (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 5px',
                        background: isSelected ? 'rgba(0,0,0,0.15)' : 'rgba(41,171,226,0.15)',
                        color: isSelected ? '#000000' : '#29ABE2',
                        border: `1px solid ${isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(41,171,226,0.3)'}`,
                        borderRadius: 2,
                        letterSpacing: '0.05em',
                      }}>
                        TÉCNICA
                      </span>
                    ) : jaVotou ? (
                      <CheckCircle2 size={13} color={isSelected ? '#000000' : '#FFC000'} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ===== STATUS BAR ===== */}
          <div
            style={{
              padding: '10px 20px',
              background: '#000000',
              borderBottom: '1px solid #181818',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span className="label-ds">
              {isMaiorEquipeCategory
                ? `${equipesUniformizadas.length} equipe(s)`
                : `${eventCarros.length} veículo(s)`}
            </span>
            {votoNestaCategoria && (
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#FFC000',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}>
                <CheckCircle2 size={13} />
                Voto registrado nesta categoria
              </span>
            )}
          </div>

          {/* ===== GRID DE CARROS / EQUIPES ===== */}
          <div style={{ padding: '20px 0', flex: 1 }}>
            {isMaiorEquipeCategory ? (
              equipesUniformizadas.length === 0 ? (
                <div
                  style={{
                    background: '#181818',
                    border: '1px solid #202020',
                    padding: '48px 24px',
                    textAlign: 'center',
                    margin: '0 0',
                  }}
                >
                  <Users size={36} color="#313131" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#7D7D7D', margin: 0 }}>
                    Nenhuma equipe com integrantes cadastrada neste evento.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 16,
                  }}
                >
                  {equipesUniformizadas.slice(0, visibleCount).map((eq, index) => (
                    <div
                      key={eq.nome}
                      className="card-surface"
                      style={{
                        padding: '24px 20px',
                        borderTop: index === 0 ? '3px solid #22c55e' : '1px solid #202020',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        position: 'relative',
                      }}
                    >
                      {/* Rank Badge para a maior equipe */}
                      {index === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            background: '#22c55e',
                            color: '#000000',
                            padding: '2px 8px',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                          }}
                        >
                          Líder
                        </div>
                      )}

                      <div
                        style={{
                          width: 52,
                          height: 52,
                          background: '#0a0a0a',
                          border: `1px solid ${index === 0 ? 'rgba(34, 197, 94, 0.4)' : '#313131'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Users size={24} color={index === 0 ? '#22c55e' : '#7D7D7D'} />
                      </div>

                      <div>
                        <h3
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700,
                            fontSize: 18,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: '#FFFFFF',
                            margin: '0 0 4px 0',
                            lineHeight: 1.1,
                          }}
                        >
                          {eq.nome}
                        </h3>
                        <span
                          style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontSize: 13,
                            color: index === 0 ? '#22c55e' : '#969696',
                            fontWeight: index === 0 ? 700 : 500,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {eq.total} Integrantes
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              eventCarros.length === 0 ? (
                <div
                  style={{
                    background: '#181818',
                    border: '1px solid #202020',
                    padding: '48px 24px',
                    textAlign: 'center',
                    margin: '0 0',
                  }}
                >
                  <Car size={36} color="#313131" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#7D7D7D', margin: 0 }}>
                    Nenhum veículo encontrado nesta categoria.
                  </p>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: 2,
                  }}
                >
                  {eventCarros.slice(0, visibleCount).map((carro) => {
                    const isVotadoPorMim = votoNestaCategoria?.carro_id === carro.id;
                    const disabled = !votacaoAberta || !!votoNestaCategoria || isLoading;

                    return (
                      <div
                        key={carro.id}
                        style={{
                          background: isVotadoPorMim ? '#181818' : '#181818',
                          border: isVotadoPorMim
                            ? '1px solid #FFC000'
                            : '1px solid #202020',
                          display: 'flex',
                          flexDirection: 'column',
                          transition: 'border-color 0.15s ease',
                          outline: isVotadoPorMim ? '1px solid rgba(255,192,0,0.3)' : 'none',
                          outlineOffset: '-1px',
                          position: 'relative',
                        }}
                      >
                        {/* Foto ou Placeholder sem foto */}
                        <div
                          style={{ position: 'relative', height: 200, background: '#0a0a0a', overflow: 'hidden', cursor: carro.url_foto ? 'zoom-in' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => {
                            if (carro.url_foto) {
                              setZoomPhoto({ url: carro.url_foto, modelo: carro.modelo, numero: carro.numero_inscricao });
                            }
                          }}
                          title={carro.url_foto ? "Clique para ampliar" : "Sem foto cadastrada"}
                        >
                          {carro.url_foto ? (
                            <img
                              src={carro.url_foto}
                              alt={carro.modelo}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s ease' }}
                              loading="lazy"
                              onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
                            />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: '#313131' }}>
                              <Car size={48} strokeWidth={1.5} color="#555555" />
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sem foto enviada</span>
                            </div>
                          )}

                          {/* Ícone zoom hint se houver foto */}
                          {carro.url_foto && (
                            <div
                              style={{
                                position: 'absolute',
                                bottom: 8,
                                right: 8,
                                background: 'rgba(0,0,0,0.65)',
                                border: '1px solid rgba(255,192,0,0.4)',
                                borderRadius: 2,
                                padding: '4px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                pointerEvents: 'none',
                              }}
                            >
                              <ZoomIn size={12} color="#FFC000" />
                            </div>
                          )}

                          {/* Badge número */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              background: '#000000',
                              borderBottom: '1px solid #FFC000',
                              borderRight: '1px solid #FFC000',
                              padding: '6px 12px',
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.12em',
                              color: '#FFC000',
                            }}
                          >
                            {carro.numero_inscricao}
                          </div>

                          {/* Overlay "Votado" */}
                          {isVotadoPorMim && (
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(0,0,0,0.75)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <div
                                style={{
                                  background: '#FFC000',
                                  color: '#000000',
                                  padding: '10px 20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  fontFamily: "'Barlow Condensed', sans-serif",
                                  fontWeight: 700,
                                  fontSize: 14,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.1em',
                                }}
                              >
                                <Trophy size={18} color="#000000" />
                                Seu Voto Registrado
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div>
                            <h3 style={{
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontWeight: 700,
                              fontSize: 20,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              color: '#FFFFFF',
                              margin: '0 0 4px 0',
                              lineHeight: 1.1,
                            }}>
                              {carro.modelo}
                            </h3>
                            <p style={{
                              fontFamily: "'Barlow', sans-serif",
                              fontSize: 12,
                              color: '#7D7D7D',
                              margin: 0,
                            }}>
                              {carro.nome_dono}{carro.equipe ? ` · ${carro.equipe}` : ''}
                            </p>
                          </div>

                          {/* Specs */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            <span
                              style={{
                                background: '#202020',
                                border: '1px solid #313131',
                                padding: '4px 10px',
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontSize: 11,
                                color: '#969696',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                              }}
                            >
                              <Calendar size={11} color="#FFC000" />
                              {carro.ano}
                            </span>
                            {carro.altura_mm !== undefined && carro.altura_mm > 0 && (
                              <span
                                style={{
                                  background: '#202020',
                                  border: '1px solid #313131',
                                  padding: '4px 10px',
                                  fontFamily: "'Barlow Condensed', sans-serif",
                                  fontSize: 11,
                                  color: '#969696',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                <Ruler size={11} color="#FFC000" />
                                {carro.altura_mm}mm
                              </span>
                            )}
                            {carro.km_rodado !== undefined && carro.km_rodado > 0 && (
                              <span
                                style={{
                                  background: '#202020',
                                  border: '1px solid #313131',
                                  padding: '4px 10px',
                                  fontFamily: "'Barlow Condensed', sans-serif",
                                  fontSize: 11,
                                  color: '#969696',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                }}
                              >
                                <Gauge size={11} color="#FFC000" />
                                {carro.km_rodado}km
                              </span>
                            )}
                          </div>

                          {/* Botão de Voto / Aviso Categoria Interna */}
                          {isInternalCategory ? (
                            <div
                              style={{
                                width: '100%',
                                height: 44,
                                background: '#181818',
                                border: '1px solid #313131',
                                color: '#7D7D7D',
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 700,
                                fontSize: 12,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                marginTop: 'auto',
                              }}
                            >
                              <Shield size={14} color="#29ABE2" />
                              <span>Avaliação Técnica Interna</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleVoto(carro.id)}
                              disabled={disabled}
                              style={{
                                width: '100%',
                                height: 44,
                                background: isVotadoPorMim
                                  ? '#FFC000'
                                  : votoNestaCategoria || !votacaoAberta
                                    ? '#181818'
                                    : 'transparent',
                                color: isVotadoPorMim
                                  ? '#000000'
                                  : votoNestaCategoria || !votacaoAberta
                                    ? '#313131'
                                    : '#FFC000',
                                border: isVotadoPorMim
                                  ? 'none'
                                  : votoNestaCategoria || !votacaoAberta
                                    ? '1px solid #313131'
                                    : '1px solid #FFC000',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 700,
                                fontSize: 13,
                                textTransform: 'uppercase',
                                letterSpacing: '0.12em',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'background 0.15s ease, color 0.15s ease',
                                marginTop: 'auto',
                              }}
                              onMouseEnter={e => {
                                if (!disabled && !isVotadoPorMim) {
                                  e.currentTarget.style.background = '#FFC000';
                                  e.currentTarget.style.color = '#000000';
                                }
                              }}
                              onMouseLeave={e => {
                                if (!disabled && !isVotadoPorMim) {
                                  e.currentTarget.style.background = 'transparent';
                                  e.currentTarget.style.color = '#FFC000';
                                }
                              }}
                            >
                              {isVotadoPorMim ? (
                                <>
                                  <Trophy size={16} color="#000000" />
                                  <span>Votado!</span>
                                </>
                              ) : votoNestaCategoria ? (
                                <>
                                  <CheckCircle2 size={16} color="#313131" />
                                  <span>Voto Já Realizado</span>
                                </>
                              ) : !votacaoAberta ? (
                                <span>Votação Encerrada</span>
                              ) : (
                                <>
                                  <Vote size={16} color="#FFC000" />
                                  <span>Confirmar Voto</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
            {visibleCount < (isMaiorEquipeCategory ? equipesUniformizadas.length : eventCarros.length) && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  style={{
                    background: '#202020',
                    color: '#FFC000',
                    border: '1px solid #313131',
                    padding: '12px 32px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontWeight: 600,
                    fontSize: 14,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#313131'}
                  onMouseLeave={e => e.currentTarget.style.background = '#202020'}
                >
                  Ver Mais {isMaiorEquipeCategory ? 'Equipes' : 'Carros'} ({(isMaiorEquipeCategory ? equipesUniformizadas.length : eventCarros.length) - visibleCount} restantes)
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== FOOTER ===== */}
      <div
        style={{
          background: '#181818',
          borderTop: '1px solid #202020',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} color="#FFC000" />
          <span className="label-ds">Sessão auditada de votação popular</span>
        </div>
        <span style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 11,
          color: '#313131',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          ID: {user.id.slice(0, 8)}…
        </span>
      </div>
      {/* ===== LIGHTBOX / ZOOM MODAL ===== */}
      {zoomPhoto && (
        <div
          onClick={() => setZoomPhoto(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.93)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(4px)',
          }}
        >
          {/* Cabeçalho */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: '#FFC000',
                  background: '#000000',
                  border: '1px solid #FFC000',
                  padding: '3px 10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                {zoomPhoto.numero}
              </span>
              <span
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 18,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {zoomPhoto.modelo}
              </span>
            </div>
            <button
              onClick={() => setZoomPhoto(null)}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              title="Fechar (Esc)"
            >
              <X size={20} />
            </button>
          </div>

          {/* Imagem em tamanho real */}
          <img
            src={zoomPhoto.url}
            alt={zoomPhoto.modelo}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 100px)',
              objectFit: 'contain',
              display: 'block',
              boxShadow: '0 0 60px rgba(0,0,0,0.8)',
              border: '1px solid rgba(255,192,0,0.2)',
            }}
          />

          {/* Dica fechar */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              pointerEvents: 'none',
            }}
          >
            Clique fora ou pressione ESC para fechar
          </div>
        </div>
      )}

      {/* ===== MODAL CADASTRO DE EQUIPE ===== */}
      {showEquipeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowEquipeModal(false); }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)' }} onClick={() => setShowEquipeModal(false)} />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              background: '#181818',
              border: '1px solid #202020',
              borderTop: '3px solid #FFC000',
              width: '100%',
              maxWidth: 460,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserPlus size={20} color="#FFC000" />
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
                  Cadastrar Nova Equipe
                </h3>
              </div>
              <button
                onClick={() => setShowEquipeModal(false)}
                style={{ background: '#202020', border: '1px solid #313131', color: '#7D7D7D', padding: 6, cursor: 'pointer', display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={e => e.currentTarget.style.color = '#7D7D7D'}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#969696', margin: 0 }}>
              Informe o nome completo da sua equipe/clube. Evite criar nomes duplicados ou com erros de digitação.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateEquipeSubmit(false);
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Lista de Equipes Já Cadastradas */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="label-ds" style={{ margin: 0 }}>
                    Equipes Já Cadastradas ({safeEquipes.length})
                  </label>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D' }}>
                    Clique para selecionar
                  </span>
                </div>

                <div
                  className="no-scrollbar"
                  style={{
                    maxHeight: 120,
                    overflowY: 'auto',
                    background: '#000000',
                    border: '1px solid #202020',
                    padding: '8px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                  }}
                >
                  {safeEquipes.length === 0 ? (
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7D7D7D', padding: '6px 4px' }}>
                      Nenhuma equipe cadastrada ainda.
                    </span>
                  ) : (
                    safeEquipes
                      .filter((eq) => !equipeNomeInput.trim() || eq.nome.toLowerCase().includes(equipeNomeInput.toLowerCase().trim()))
                      .map((eq) => {
                        const isMatch = equipeNomeInput.trim().toLowerCase() === eq.nome.toLowerCase();
                        return (
                          <span
                            key={eq.id}
                            onClick={() => {
                              setEquipeNomeInput(eq.nome);
                              setEquipeValidationMsg(null);
                            }}
                            style={{
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontSize: 12,
                              fontWeight: 600,
                              color: isMatch ? '#000000' : '#FFC000',
                              background: isMatch ? '#FFC000' : 'rgba(255,192,0,0.08)',
                              border: `1px solid ${isMatch ? '#FFC000' : 'rgba(255,192,0,0.25)'}`,
                              padding: '4px 10px',
                              cursor: 'pointer',
                              borderRadius: 2,
                              transition: 'all 0.12s',
                            }}
                            title="Clique para selecionar este nome"
                          >
                            {eq.nome}
                          </span>
                        );
                      })
                  )}
                </div>
              </div>

              <div>
                <label className="label-ds" style={{ marginBottom: 6, display: 'block' }}>Nome da Nova Equipe</label>
                <input
                  type="text"
                  placeholder="Ex: Clube do Opala SP"
                  value={equipeNomeInput}
                  onChange={(e) => {
                    setEquipeNomeInput(e.target.value);
                    setEquipeValidationMsg(null);
                  }}
                  className="input-ds"
                  style={{ height: 42, fontSize: 14 }}
                  autoFocus
                />
              </div>

              {/* Mensagens de Validação */}
              {equipeValidationMsg && (
                <div
                  style={{
                    background: equipeValidationMsg.type === 'error'
                      ? 'rgba(180,0,0,0.15)'
                      : equipeValidationMsg.type === 'warning'
                        ? 'rgba(255,192,0,0.12)'
                        : 'rgba(0,120,60,0.15)',
                    border: `1px solid ${equipeValidationMsg.type === 'error'
                      ? 'rgba(220,50,50,0.3)'
                      : equipeValidationMsg.type === 'warning'
                        ? 'rgba(255,192,0,0.3)'
                        : 'rgba(74,222,128,0.3)'
                      }`,
                    borderLeft: `3px solid ${equipeValidationMsg.type === 'error'
                      ? '#ef4444'
                      : equipeValidationMsg.type === 'warning'
                        ? '#FFC000'
                        : '#4ade80'
                      }`,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {equipeValidationMsg.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
                    {equipeValidationMsg.type === 'warning' && <AlertTriangle size={16} color="#FFC000" />}
                    {equipeValidationMsg.type === 'success' && <CheckCircle2 size={16} color="#4ade80" />}
                    <span
                      style={{
                        fontFamily: "'Barlow', sans-serif",
                        fontSize: 13,
                        color: equipeValidationMsg.type === 'error'
                          ? '#fca5a5'
                          : equipeValidationMsg.type === 'warning'
                            ? '#FFC000'
                            : '#86efac',
                      }}
                    >
                      {equipeValidationMsg.text}
                    </span>
                  </div>

                  {/* Alerta de Equipe Parecida com opção de Forçar ou Usar Existente */}
                  {equipeValidationMsg.type === 'warning' && equipeValidationMsg.similarTeam && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleCreateEquipeSubmit(true)}
                        style={{
                          background: '#FFC000',
                          color: '#000000',
                          border: 'none',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: 'uppercase',
                        }}
                      >
                        Criar "{equipeNomeInput.trim()}" mesmo assim
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEquipeModal(false);
                          setEquipeNomeInput('');
                          setEquipeValidationMsg(null);
                        }}
                        style={{
                          background: '#202020',
                          color: '#FFFFFF',
                          border: '1px solid #313131',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: 'uppercase',
                        }}
                      >
                        Usar "{equipeValidationMsg.similarTeam.nome}"
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingEquipe || !equipeNomeInput.trim()}
                className="btn-gold"
                style={{ width: '100%', height: 42, fontSize: 14, marginTop: 4 }}
              >
                {submittingEquipe ? 'Cadastrando...' : 'Salvar Equipe'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
