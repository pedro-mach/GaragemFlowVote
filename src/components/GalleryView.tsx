import React, { useState, useEffect } from 'react';
import { LogOut, Vote, AlertCircle, CheckCircle2, Trophy, Search, Gauge, Calendar, Ruler, Car, Shield, X, ZoomIn } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [zoomPhoto, setZoomPhoto] = useState<{ url: string; modelo: string; numero: string } | null>(null);

  // Fechar lightbox com Esc
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomPhoto(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const popularCategorias = categorias.filter((c) => c.tipo === 'popular' && !c.oculta);

  React.useEffect(() => {
    if (popularCategorias.length > 0 && !activeCategoryId) {
      setActiveCategoryId(popularCategorias[0].id);
    }
  }, [popularCategorias, activeCategoryId]);

  const eventCarros = carros
    .filter((c) => !evento || c.evento_id === evento.id)
    .filter((c) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        c.modelo.toLowerCase().includes(term) ||
        c.numero_inscricao.toLowerCase().includes(term) ||
        c.nome_dono.toLowerCase().includes(term) ||
        (c.equipe && c.equipe.toLowerCase().includes(term))
      );
    });

  const votoNestaCategoria = userVotos.find(
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
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          marginBottom: 1,
        }}
      >
        {/* Linha 1: Logo + Evento + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: '#202020',
                border: '1px solid rgba(255,192,0,0.25)',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              <img
                src="/Logo-evento.jpeg"
                alt="Logo do Evento"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
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
                  letterSpacing: '0.18em',
                  color: '#FFC000',
                }}>
                  {votacaoAberta ? 'Votação Popular Aberta' : 'Votação Encerrada'}
                </span>
              </div>
              <h2 style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#FFFFFF',
                margin: 0,
                lineHeight: 1,
              }}>
                {evento?.nome || 'Garagem Flow'}
              </h2>
            </div>
          </div>

          <button
            onClick={logout}
            className="btn-ghost"
            style={{ height: 36, padding: '0 14px', fontSize: 12 }}
            title="Sair"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">SAIR</span>
          </button>
        </div>

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
            {userVotos.length} voto(s)
          </span>
        </div>

        <div className="no-scrollbar" style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 2 }}>
          {popularCategorias.map((cat) => {
            const isSelected = cat.id === activeCategoryId;
            const jaVotou = userVotos.some((v) => v.categoria_id === cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                style={{
                  flexShrink: 0,
                  padding: '10px 18px',
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
                {jaVotou && (
                  <CheckCircle2 size={13} color={isSelected ? '#000000' : '#FFC000'} />
                )}
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
          {eventCarros.length} veículo(s)
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

      {/* ===== GRID DE CARROS ===== */}
      <div style={{ padding: '20px 0', flex: 1 }}>
        {eventCarros.length === 0 ? (
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
              Nenhum veículo encontrado.
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
            {eventCarros.map((carro) => {
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
                  {/* Foto */}
                  <div
                    style={{ position: 'relative', height: 200, background: '#0a0a0a', overflow: 'hidden', cursor: 'zoom-in' }}
                    onClick={() => setZoomPhoto({ url: carro.url_foto, modelo: carro.modelo, numero: carro.numero_inscricao })}
                    title="Clique para ampliar"
                  >
                    <img
                      src={carro.url_foto}
                      alt={carro.modelo}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s ease' }}
                      loading="lazy"
                      onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1.04)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = 'scale(1)'; }}
                    />

                    {/* Ícone zoom hint */}
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

                    {/* Botão de Voto */}
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
                          <CheckCircle2 size={15} color="#000000" />
                          <span>VOTADO</span>
                        </>
                      ) : votoNestaCategoria ? (
                        <span>Voto já registrado</span>
                      ) : !votacaoAberta ? (
                        <span>Votação Encerrada</span>
                      ) : (
                        <>
                          <Vote size={15} />
                          <span>VOTAR NESTE VEÍCULO</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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

    </div>
  );
}
