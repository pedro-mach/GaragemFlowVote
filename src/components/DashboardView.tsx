import React, { useState, useEffect } from 'react';
import {
  ToggleLeft, ToggleRight, Car, BarChart3, ShieldCheck,
  Plus, LogOut, RefreshCw, Layers, Camera, Trash2, Trophy, Award,
  Edit2, Eye, EyeOff, Check, Tag, X, Menu, Users
} from 'lucide-react';
import type { Carro, Categoria, Evento } from '../data/mockData';

interface DashboardViewProps {
  evento: Evento | null;
  carros: Carro[];
  categorias: Categoria[];
  resultados: Record<string, { carroId: string; votosCount: number }[]>;
  totalUsuarios?: number;
  totalVotos?: number;
  isLoading: boolean;
  error: string | null;
  atualizarNomeEvento?: (novoNome: string) => Promise<void>;
  cadastrarCarro: (
    numeroInscricao: string,
    modelo: string,
    ano: number,
    alturaMm?: number,
    nomeDono?: string,
    telefoneDono?: string,
    urlFoto?: string,
    equipe?: string,
    kmRodado?: number
  ) => Promise<void>;
  deletarCarro: (id: string) => Promise<void>;
  cadastrarCategoria?: (nome: string, tipo: 'popular' | 'interna') => Promise<void>;
  editarCategoria?: (id: string, novoNome: string) => Promise<void>;
  toggleOcultarCategoria?: (id: string) => Promise<void>;
  deletarCategoria?: (id: string) => Promise<void>;
  toggleStatusVotacao: () => Promise<void>;
  fetchResultados: () => Promise<void>;
  logout: () => void;
}

type TabType = 'status' | 'resultados' | 'carros' | 'validacao' | 'categorias';

// ─── Style helpers ─────────────────────────────────────────────────
const S = {
  label: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.16em',
    color: '#7D7D7D',
    display: 'block',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    background: '#000000',
    border: '1px solid #313131',
    borderRadius: 0,
    color: '#FFFFFF',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 15,
    letterSpacing: '0.04em',
    padding: '0 12px',
    height: 40,
    outline: 'none',
  },
  metricCard: {
    background: '#181818',
    border: '1px solid #202020',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: (active: boolean) => ({
    background: active ? '#FFC000' : 'transparent',
    color: active ? '#000000' : '#7D7D7D',
    border: 'none',
    padding: '10px 14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: "'Barlow Condensed', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    width: '100%',
    textAlign: 'left' as const,
    transition: 'background 0.12s, color 0.12s',
    whiteSpace: 'nowrap' as const,
  }),
};

export function DashboardView({
  evento,
  carros,
  categorias,
  resultados,
  totalUsuarios = 0,
  totalVotos = 0,
  isLoading: _isLoading,
  error,
  atualizarNomeEvento,
  cadastrarCarro,
  deletarCarro,
  cadastrarCategoria,
  editarCategoria,
  toggleOcultarCategoria,
  deletarCategoria,
  toggleStatusVotacao,
  fetchResultados,
  logout,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [valTab, setValTab] = useState<'ano' | 'rodagem' | 'equipes'>('ano');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);

  // Estado edição do nome do evento
  const [isEditingEventName, setIsEditingEventName] = useState(false);
  const [eventTempName, setEventTempName] = useState('');

  // States cadastro de carro
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

  // States gerenciamento de categorias
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatTipo, setNovaCatTipo] = useState<'popular' | 'interna'>('popular');
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [catTempName, setCatTempName] = useState('');

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

  useEffect(() => {
    if (!isManualInscricao) setNumeroInscricao(getNextSuggestedInscricao());
  }, [carros, isManualInscricao]);

  useEffect(() => {
    if (activeTab === 'resultados') fetchResultados();
  }, [activeTab]);

  const handleSaveEventName = async () => {
    if (!eventTempName.trim() || !atualizarNomeEvento) return;
    await atualizarNomeEvento(eventTempName.trim());
    setIsEditingEventName(false);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
          } else {
            if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            setUrlFoto(canvas.toDataURL('image/jpeg', 0.8));
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

    setSubmitting(true);
    try {
      const finalInscricao = numeroInscricao.trim() || getNextSuggestedInscricao();
      const finalModelo = modelo.trim() || 'Sem modelo';
      const finalNomeDono = nomeDono.trim() || 'Não informado';
      const parsedAno = ano.trim() ? parseInt(ano.trim(), 10) : new Date().getFullYear();
      const finalAno = isNaN(parsedAno) ? new Date().getFullYear() : parsedAno;

      await cadastrarCarro(
        finalInscricao,
        finalModelo,
        finalAno,
        alturaMm ? parseInt(alturaMm, 10) : undefined,
        finalNomeDono,
        telefoneDono || undefined,
        urlFoto || undefined,
        equipe || undefined,
        kmRodado ? parseInt(kmRodado, 10) : undefined
      );
      setCadastroMsg({ type: 'success', text: 'Carro cadastrado com sucesso!' });
      setModelo(''); setAno(''); setAlturaMm(''); setNomeDono('');
      setTelefoneDono(''); setUrlFoto(''); setEquipe(''); setKmRodado('');
      setIsManualInscricao(false);
    } catch (err: any) {
      setCadastroMsg({ type: 'error', text: err.message || 'Erro ao cadastrar carro.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCatNome.trim() || !cadastrarCategoria) return;
    await cadastrarCategoria(novaCatNome.trim(), novaCatTipo);
    setNovaCatNome('');
  };

  const handleSaveCategoriaName = async (id: string) => {
    if (!catTempName.trim() || !editarCategoria) return;
    await editarCategoria(id, catTempName.trim());
    setCatEditingId(null);
  };

  const carrosValidadosAntigos = [...carros].sort((a, b) => a.ano - b.ano);
  const votacaoAberta = evento?.status === 'aberto';

  const navItems: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: 'status', icon: votacaoAberta ? <ToggleRight size={16} /> : <ToggleLeft size={16} />, label: 'Status da Votação' },
    { id: 'resultados', icon: <BarChart3 size={16} />, label: 'Resultados Ao Vivo' },
    { id: 'carros', icon: <Layers size={16} />, label: 'Gerenciar Veículos' },
    { id: 'categorias', icon: <Tag size={16} />, label: 'Gerenciar Categorias' },
    { id: 'validacao', icon: <ShieldCheck size={16} />, label: 'Validação Interna' },
  ];

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100dvh', background: '#000000', overflow: 'hidden', position: 'relative' }}>

      {/* Backdrop overlay para mobile quando a sidebar está aberta */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            zIndex: 40,
          }}
          className="md:hidden"
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        style={{
          background: '#181818',
          borderRight: isSidebarOpen ? '1px solid #202020' : 'none',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flexShrink: 0,
          width: isSidebarOpen ? 240 : 0,
          overflow: 'hidden',
          transition: 'width 0.2s ease, border-color 0.2s ease',
          zIndex: 50,
        }}
        className={`
          ${isSidebarOpen ? 'fixed inset-y-0 left-0 h-full md:relative md:h-auto' : 'hidden md:flex'}
        `}
      >
        {/* Logo e Cabeçalho do Menu */}
        <div>
          <div style={{ padding: '16px 16px', borderBottom: '1px solid #202020', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, background: '#202020', border: '1px solid rgba(255,192,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Car size={16} color="#FFC000" />
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FFC000', lineHeight: 1.1 }}>
                  Painel
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#7D7D7D', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Organizador
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#7D7D7D', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = '#7D7D7D'}
              title="Fechar Menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav Items */}
          <nav style={{ padding: '8px 0' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setIsSidebarOpen(false);
                  }
                }}
                style={S.navBtn(activeTab === item.id)}
                onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.color = '#7D7D7D'; }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Sair */}
        <button
          onClick={logout}
          style={{
            ...S.navBtn(false),
            borderTop: '1px solid #202020',
            padding: '14px 16px',
            color: '#7D7D7D',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(180,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#7D7D7D'; e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={16} />
          <span>Encerrar Sessão</span>
        </button>
      </div>

      {/* Coluna direita: conteúdo principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowY: 'auto', maxHeight: '100dvh' }}>

        {/* ===== CONTEÚDO PRINCIPAL ===== */}
        <div style={{ flex: 1, background: '#000000' }}>

          {/* Header com Botão Sandwich + Nome do Evento */}
          <div style={{ background: '#181818', borderBottom: '1px solid #202020', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Botão Sandwich Menu */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                  background: isSidebarOpen ? 'rgba(255,192,0,0.15)' : '#202020',
                  border: '1px solid rgba(255,192,0,0.3)',
                  color: '#FFC000',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                title={isSidebarOpen ? 'Fechar Menu' : 'Abrir Menu'}
              >
                <Menu size={18} />
                <span>MENU</span>
              </button>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.16em',
                    color: '#FFC000',
                    background: 'rgba(255,192,0,0.08)',
                    border: '1px solid rgba(255,192,0,0.2)',
                    padding: '3px 10px',
                  }}>
                    Evento Ativo
                  </span>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7D7D7D' }}>
                    {evento?.data}
                  </span>
                </div>

                {/* Nome do Evento (Visualizar ou Editar) */}
                {isEditingEventName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="text"
                      value={eventTempName}
                      onChange={(e) => setEventTempName(e.target.value)}
                      style={{ ...S.input, height: 36, fontSize: 18, width: 280 }}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEventName}
                      style={{ background: '#FFC000', color: '#000000', border: 'none', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                    >
                      <Check size={14} /> Salvar
                    </button>
                    <button
                      onClick={() => setIsEditingEventName(false)}
                      style={{ background: '#202020', color: '#FFFFFF', border: '1px solid #313131', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif" }}
                    >
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FFFFFF', margin: 0, lineHeight: 1 }}>
                      {evento?.nome || 'Carregando...'}
                    </h1>
                    {atualizarNomeEvento && (
                      <button
                        onClick={() => {
                          setEventTempName(evento?.nome || '');
                          setIsEditingEventName(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#7D7D7D', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.12s' }}
                        title="Editar Nome do Evento"
                        onMouseEnter={e => e.currentTarget.style.color = '#FFC000'}
                        onMouseLeave={e => e.currentTarget.style.color = '#7D7D7D'}
                      >
                        <Edit2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: votacaoAberta ? '#4ade80' : '#ef4444',
                border: `1px solid ${votacaoAberta ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                padding: '5px 12px',
              }}>
                {votacaoAberta ? '● EM ANDAMENTO' : '○ ENCERRADA'}
              </span>
              <button
                onClick={() => fetchResultados()}
                style={{ background: '#202020', border: '1px solid #313131', padding: '6px', cursor: 'pointer', display: 'flex', color: '#FFC000' }}
                title="Atualizar Dados"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Erro Global */}
          {error && (
            <div style={{ background: 'rgba(180,0,0,0.12)', borderBottom: '1px solid rgba(200,50,50,0.3)', borderLeft: '3px solid #ef4444', padding: '12px 24px' }}>
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#fca5a5' }}>{error}</span>
            </div>
          )}

          <div style={{ padding: '24px' }}>

            {/* ══════ TAB: STATUS ══════ */}
            {activeTab === 'status' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Controle */}
                <div style={{ background: '#181818', border: '1px solid #202020', borderLeft: '3px solid #FFC000', padding: '24px' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 8px 0' }}>
                    Controle Geral da Votação
                  </h3>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7D7D7D', margin: '0 0 20px 0', lineHeight: 1.6, maxWidth: 520 }}>
                    Alterne o status em tempo real. Fechar a votação bloqueia instantaneamente novas interações pelo celular dos visitantes.
                  </p>
                  <button
                    onClick={toggleStatusVotacao}
                    style={{
                      background: votacaoAberta ? '#b91c1c' : '#FFC000',
                      color: votacaoAberta ? '#FFFFFF' : '#000000',
                      border: 'none',
                      padding: '0 24px',
                      height: 48,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontFamily: "'Barlow Condensed', sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = votacaoAberta ? '#991b1b' : '#917300'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = votacaoAberta ? '#b91c1c' : '#FFC000'; }}
                  >
                    {votacaoAberta ? (
                      <><ToggleRight size={20} /><span>Encerrar Votação Agora</span></>
                    ) : (
                      <><ToggleLeft size={20} /><span>Abrir Votação para o Público</span></>
                    )}
                  </button>
                </div>

                {/* Métricas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Frota Inscrita', value: carros.length, icon: <Car size={24} color="#FFC000" /> },
                    { label: 'Categorias', value: categorias.length, icon: <Trophy size={24} color="#FFC000" /> },
                    { label: 'Usuários Cadastrados', value: totalUsuarios, icon: <Users size={24} color="#FFC000" /> },
                    { label: 'Votos Computados', value: totalVotos, icon: <BarChart3 size={24} color="#FFC000" /> },
                    { label: 'Status da Votação', value: votacaoAberta ? 'ABERTO' : 'FECHADO', icon: <Award size={24} color="#FFC000" /> },
                  ].map((m) => (
                    <div key={m.label} style={S.metricCard}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#7D7D7D', marginBottom: 8 }}>
                          {m.label}
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                          {m.value}
                        </div>
                      </div>
                      <div style={{ background: '#202020', border: '1px solid #313131', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {m.icon}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════ TAB: RESULTADOS ══════ */}
            {activeTab === 'resultados' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
                  Classificação por Votação Popular
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 2 }}>
                  {categorias.filter((c) => c.tipo === 'popular' && !c.oculta).map((cat) => {
                    const votosCat = resultados[cat.id] || [];
                    const totalVotosCat = votosCat.reduce((sum, item) => sum + item.votosCount, 0);

                    return (
                      <div key={cat.id} style={{ background: '#181818', border: '1px solid #202020', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #202020', paddingBottom: 12, marginBottom: 16 }}>
                          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFC000', margin: 0 }}>
                            {cat.nome}
                          </h4>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#7D7D7D', background: '#202020', border: '1px solid #313131', padding: '4px 10px' }}>
                            {totalVotosCat} votos
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {votosCat.length === 0 ? (
                            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7D7D7D', textAlign: 'center', padding: '24px 0' }}>
                              Nenhum voto registrado.
                            </div>
                          ) : (
                            votosCat.slice(0, 3).map((item, index) => {
                              const carro = carros.find((c) => c.id === item.carroId);
                              const percent = totalVotosCat > 0 ? (item.votosCount / totalVotosCat) * 100 : 0;
                              const medalColors = [
                                { bg: '#FFC000', text: '#000000', label: '1º' },
                                { bg: '#969696', text: '#000000', label: '2º' },
                                { bg: '#5a3e00', text: '#FFCE3E', label: '3º' },
                              ];
                              const medal = medalColors[index];

                              return (
                                <div key={item.carroId} style={{ background: '#000000', border: '1px solid #202020', padding: '12px 14px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <span style={{
                                        background: medal.bg,
                                        color: medal.text,
                                        padding: '2px 8px',
                                        fontFamily: "'Barlow Condensed', sans-serif",
                                        fontWeight: 700,
                                        fontSize: 11,
                                        letterSpacing: '0.1em',
                                      }}>
                                        {medal.label}
                                      </span>
                                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>
                                        {carro ? `${carro.modelo} (${carro.numero_inscricao})` : `ID: ${item.carroId}`}
                                      </span>
                                    </div>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#FFC000' }}>
                                      {item.votosCount} ({percent.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div style={{ width: '100%', height: 3, background: '#202020', overflow: 'hidden' }}>
                                    <div style={{ width: `${percent}%`, height: '100%', background: '#FFC000', transition: 'width 0.5s ease' }} />
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
            )}

            {/* ══════ TAB: GERENCIAR CARROS ══════ */}
            {activeTab === 'carros' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {/* Form Cadastro */}
                <div style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #FFC000', padding: '20px' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 16, borderBottom: '1px solid #202020' }}>
                    <Plus size={16} color="#FFC000" />
                    Novo Veículo Inscrito
                  </h3>

                  <form onSubmit={handleCadastrarCarro} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <label style={S.label}>Inscrição (opcional)</label>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#FFC000', letterSpacing: '0.1em' }}>
                          {isManualInscricao ? 'MANUAL' : 'AUTO'}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="#024 (opcional)"
                        value={numeroInscricao}
                        onChange={(e) => { setNumeroInscricao(e.target.value); setIsManualInscricao(true); }}
                        style={S.input}
                        onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                        onBlur={e => { e.target.style.borderColor = '#313131'; }}
                      />
                    </div>

                    {[
                      { label: 'Modelo (opcional)', value: modelo, setter: setModelo, placeholder: 'Ex: VW Gol 1.8 (opcional)', type: 'text' },
                      { label: 'Nome do Dono(a) (opcional)', value: nomeDono, setter: setNomeDono, placeholder: 'Ex: Rodrigo Silva (opcional)', type: 'text' },
                    ].map((field) => (
                      <div key={field.label}>
                        <label style={S.label}>{field.label}</label>
                        <input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          style={S.input}
                          onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                          onBlur={e => { e.target.style.borderColor = '#313131'; }}
                        />
                      </div>
                    ))}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Ano (opcional)', value: ano, setter: setAno, placeholder: 'Ex: 1994 (opcional)' },
                        { label: 'Altura mm (opcional)', value: alturaMm, setter: setAlturaMm, placeholder: 'Ex: 50 (opcional)' },
                        { label: 'Equipe (opcional)', value: equipe, setter: setEquipe, placeholder: 'Ex: Flow Club (opcional)' },
                        { label: 'Km Rodados (opcional)', value: kmRodado, setter: setKmRodado, placeholder: 'Ex: 150 (opcional)' },
                      ].map((field) => (
                        <div key={field.label}>
                          <label style={S.label}>{field.label}</label>
                          <input
                            type="text"
                            placeholder={field.placeholder}
                            value={field.value}
                            onChange={(e) => field.setter(e.target.value)}
                            style={{ ...S.input, height: 36 }}
                            onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                            onBlur={e => { e.target.style.borderColor = '#313131'; }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Foto */}
                    <div>
                      <label style={S.label}>Foto do Veículo</label>
                      {urlFoto && (
                        <div style={{ position: 'relative', width: '100%', height: 100, overflow: 'hidden', marginBottom: 8, background: '#000000' }}>
                          <img src={urlFoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <button
                            type="button"
                            onClick={() => setUrlFoto('')}
                            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.85)', border: '1px solid #313131', color: '#FFFFFF', padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif" }}
                          >
                            Remover
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => document.getElementById('camera-file-input')?.click()}
                        style={{ ...S.input, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: '#202020', borderColor: '#313131', marginBottom: 6 }}
                      >
                        <Camera size={14} color="#FFC000" />
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Capturar Foto
                        </span>
                      </button>
                      <input id="camera-file-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleCameraCapture} />
                      <input
                        type="text"
                        placeholder="Ou cole uma URL..."
                        value={urlFoto.startsWith('data:image') ? '' : urlFoto}
                        onChange={(e) => setUrlFoto(e.target.value)}
                        style={{ ...S.input, height: 36 }}
                        onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                        onBlur={e => { e.target.style.borderColor = '#313131'; }}
                      />
                    </div>

                    {cadastroMsg && (
                      <div style={{
                        background: cadastroMsg.type === 'success' ? 'rgba(0,120,60,0.15)' : 'rgba(180,0,0,0.15)',
                        border: `1px solid ${cadastroMsg.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(220,50,50,0.3)'}`,
                        borderLeft: `3px solid ${cadastroMsg.type === 'success' ? '#4ade80' : '#ef4444'}`,
                        padding: '10px 14px',
                      }}>
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: cadastroMsg.type === 'success' ? '#86efac' : '#fca5a5' }}>
                          {cadastroMsg.text}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-gold"
                      style={{ width: '100%', height: 44, fontSize: 14, marginTop: 4 }}
                    >
                      {submitting ? 'Adicionando...' : 'Cadastrar Veículo'}
                    </button>
                  </form>
                </div>

                {/* Lista */}
                <div style={{ background: '#181818', border: '1px solid #202020', padding: '20px' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 16px 0', paddingBottom: 14, borderBottom: '1px solid #202020' }}>
                    Veículos Cadastrados({carros.length})
                  </h3>

                  <div style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }} className="no-scrollbar">
                    {carros.length === 0 ? (
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7D7D7D', textAlign: 'center', padding: '32px 0', margin: 0 }}>
                        Nenhum veículo cadastrado ainda.
                      </p>
                    ) : (
                      carros.map((carro) => (
                        <div
                          key={carro.id}
                          style={{ background: '#000000', border: '1px solid #202020', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <img
                              src={carro.url_foto}
                              alt={carro.modelo}
                              style={{ width: 52, height: 52, objectFit: 'cover', flexShrink: 0, display: 'block', border: '1px solid #202020' }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {carro.modelo}
                              </div>
                              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D', marginTop: 3 }}>
                                {carro.nome_dono}{carro.equipe ? ` · ${carro.equipe}` : ''}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <span style={{ background: '#FFC000', color: '#000000', padding: '2px 8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700 }}>
                                  {carro.numero_inscricao}
                                </span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#7D7D7D' }}>
                                  {carro.ano} {carro.altura_mm && carro.altura_mm > 0 ? `· ${carro.altura_mm}mm` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={async () => {
                              if (confirm(`Excluir "${carro.modelo}" (${carro.numero_inscricao})?`)) {
                                await deletarCarro(carro.id);
                              }
                            }}
                            style={{ background: 'rgba(180,0,0,0.1)', border: '1px solid rgba(200,50,50,0.3)', color: '#ef4444', padding: 8, cursor: 'pointer', flexShrink: 0, display: 'flex', transition: 'background 0.12s' }}
                            title="Excluir"
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.25)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.1)'; }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════ TAB: GERENCIAR CATEGORIAS ══════ */}
            {activeTab === 'categorias' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {/* Form Adicionar Categoria */}
                <div style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #FFC000', padding: '20px', height: 'fit-content' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 16, borderBottom: '1px solid #202020' }}>
                    <Tag size={16} color="#FFC000" />
                    Nova Categoria
                  </h3>

                  <form onSubmit={handleAddCategoria} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={S.label}>Nome da Categoria (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Melhor Som, Destaque da Noite..."
                        value={novaCatNome}
                        onChange={(e) => setNovaCatNome(e.target.value)}
                        style={S.input}
                        onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                        onBlur={e => { e.target.style.borderColor = '#313131'; }}
                      />
                    </div>

                    <div>
                      <label style={S.label}>Tipo de Votação</label>
                      <select
                        value={novaCatTipo}
                        onChange={(e) => setNovaCatTipo(e.target.value as 'popular' | 'interna')}
                        style={{ ...S.input, colorScheme: 'dark' }}
                      >
                        <option value="popular">Popular (Público vota no site)</option>
                        <option value="interna">Interna / Técnica (Pódio da Organização)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!novaCatNome.trim()}
                      className="btn-gold"
                      style={{ width: '100%', height: 44, fontSize: 14, marginTop: 4 }}
                    >
                      Cadastrar Categoria
                    </button>
                  </form>
                </div>

                {/* Lista de Categorias */}
                <div style={{ background: '#181818', border: '1px solid #202020', padding: '20px' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 16px 0', paddingBottom: 14, borderBottom: '1px solid #202020' }}>
                    Categorias Cadastradas ({categorias.length})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categorias.length === 0 ? (
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7D7D7D', textAlign: 'center', padding: '32px 0', margin: 0 }}>
                        Nenhuma categoria cadastrada.
                      </p>
                    ) : (
                      categorias.map((cat) => {
                        const isEditing = catEditingId === cat.id;

                        return (
                          <div
                            key={cat.id}
                            style={{
                              background: '#000000',
                              border: `1px solid ${cat.oculta ? '#313131' : '#202020'}`,
                              padding: '14px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 12,
                              opacity: cat.oculta ? 0.6 : 1,
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input
                                    type="text"
                                    value={catTempName}
                                    onChange={(e) => setCatTempName(e.target.value)}
                                    style={{ ...S.input, height: 32, fontSize: 14 }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSaveCategoriaName(cat.id)}
                                    style={{ background: '#FFC000', color: '#000000', border: 'none', padding: '6px 10px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12 }}
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setCatEditingId(null)}
                                    style={{ background: '#202020', color: '#FFFFFF', border: '1px solid #313131', padding: '6px 10px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12 }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: cat.oculta ? '#7D7D7D' : '#FFFFFF' }}>
                                      {cat.nome}
                                    </span>
                                    {editarCategoria && (
                                      <button
                                        onClick={() => {
                                          setCatEditingId(cat.id);
                                          setCatTempName(cat.nome);
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#7D7D7D', cursor: 'pointer', padding: 2, display: 'flex' }}
                                        title="Renomear Categoria"
                                        onMouseEnter={e => e.currentTarget.style.color = '#FFC000'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#7D7D7D'}
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <span style={{
                                      fontFamily: "'Barlow Condensed', sans-serif",
                                      fontSize: 10,
                                      fontWeight: 600,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.1em',
                                      color: cat.tipo === 'popular' ? '#FFC000' : '#29ABE2',
                                      background: cat.tipo === 'popular' ? 'rgba(255,192,0,0.08)' : 'rgba(41,171,226,0.08)',
                                      padding: '2px 6px',
                                      border: `1px solid ${cat.tipo === 'popular' ? 'rgba(255,192,0,0.2)' : 'rgba(41,171,226,0.2)'}`,
                                    }}>
                                      {cat.tipo === 'popular' ? 'Votação Popular' : 'Interna / Técnica'}
                                    </span>
                                    {cat.oculta && (
                                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        (Oculta no Público)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Ações: Ocultar/Exibir e Remover */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {toggleOcultarCategoria && (
                                <button
                                  onClick={() => toggleOcultarCategoria(cat.id)}
                                  style={{
                                    background: cat.oculta ? 'rgba(255,192,0,0.1)' : '#202020',
                                    border: `1px solid ${cat.oculta ? 'rgba(255,192,0,0.3)' : '#313131'}`,
                                    color: cat.oculta ? '#FFC000' : '#7D7D7D',
                                    padding: '6px 10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontFamily: "'Barlow Condensed', sans-serif",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                  }}
                                  title={cat.oculta ? 'Exibir para o Público' : 'Ocultar do Público'}
                                >
                                  {cat.oculta ? <EyeOff size={14} /> : <Eye size={14} />}
                                  <span>{cat.oculta ? 'Oculta' : 'Visível'}</span>
                                </button>
                              )}

                              {deletarCategoria && (
                                <button
                                  onClick={async () => {
                                    if (confirm(`Tem certeza que deseja remover a categoria "${cat.nome}"?`)) {
                                      await deletarCategoria(cat.id);
                                    }
                                  }}
                                  style={{ background: 'rgba(180,0,0,0.1)', border: '1px solid rgba(200,50,50,0.3)', color: '#ef4444', padding: '6px 8px', cursor: 'pointer', display: 'flex' }}
                                  title="Remover Categoria"
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.25)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.1)'; }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ══════ TAB: VALIDAÇÃO ══════ */}
            {activeTab === 'validacao' && (
              <div style={{ background: '#181818', border: '1px solid #202020', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 6px 0' }}>
                    Validação Interna da Frota
                  </h3>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7D7D7D', margin: 0 }}>
                    Apurador automático para troféus de veículos antigos, maior rodagem e maiores equipes.
                  </p>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #202020', gap: 0 }}>
                  {[
                    { id: 'ano' as const, label: 'Mais Antigos' },
                    { id: 'rodagem' as const, label: 'Maior Rodagem' },
                    { id: 'equipes' as const, label: 'Maior Equipe' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setValTab(t.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: valTab === t.id ? '2px solid #FFC000' : '2px solid transparent',
                        color: valTab === t.id ? '#FFC000' : '#7D7D7D',
                        padding: '10px 18px',
                        cursor: 'pointer',
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        transition: 'color 0.12s, border-color 0.12s',
                      }}
                      onMouseEnter={e => { if (valTab !== t.id) e.currentTarget.style.color = '#FFFFFF'; }}
                      onMouseLeave={e => { if (valTab !== t.id) e.currentTarget.style.color = '#7D7D7D'; }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tabelas */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #202020' }}>
                        {['Posição', 'Inscrição', 'Modelo', 'Dono(a)',
                          valTab === 'ano' ? 'Ano' : valTab === 'rodagem' ? 'KM Rodado' : 'Carros'].map((h) => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7D7D7D', fontSize: 11 }}>
                              {h}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {valTab === 'ano' && carrosValidadosAntigos.map((carro, index) => (
                        <tr key={carro.id} style={{ borderBottom: '1px solid #181818', background: index === 0 ? 'rgba(255,192,0,0.06)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', color: index === 0 ? '#FFC000' : '#7D7D7D', fontWeight: 700 }}>
                            {index === 0 ? '🏆 1º' : `${index + 1}º`}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#FFC000', fontWeight: 700 }}>{carro.numero_inscricao}</td>
                          <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{carro.modelo}</td>
                          <td style={{ padding: '12px 16px', color: '#969696' }}>{carro.nome_dono}</td>
                          <td style={{ padding: '12px 16px', color: index === 0 ? '#FFC000' : '#FFFFFF', fontWeight: 700 }}>{carro.ano}</td>
                        </tr>
                      ))}

                      {valTab === 'rodagem' && [...carros].sort((a, b) => (b.km_rodado || 0) - (a.km_rodado || 0)).map((carro, index) => {
                        const isFirst = index === 0 && (carro.km_rodado || 0) > 0;
                        return (
                          <tr key={carro.id} style={{ borderBottom: '1px solid #181818', background: isFirst ? 'rgba(255,192,0,0.06)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', color: isFirst ? '#FFC000' : '#7D7D7D', fontWeight: 700 }}>
                              {isFirst ? '🏆 1º' : `${index + 1}º`}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#FFC000', fontWeight: 700 }}>{carro.numero_inscricao}</td>
                            <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{carro.modelo}</td>
                            <td style={{ padding: '12px 16px', color: '#969696' }}>{carro.nome_dono}</td>
                            <td style={{ padding: '12px 16px', color: isFirst ? '#FFC000' : '#FFFFFF', fontWeight: 700 }}>{carro.km_rodado || 0} km</td>
                          </tr>
                        );
                      })}

                      {valTab === 'equipes' && (() => {
                        const teamCounts: Record<string, number> = {};
                        carros.forEach((c) => { if (c.equipe?.trim()) { const t = c.equipe.trim(); teamCounts[t] = (teamCounts[t] || 0) + 1; } });
                        return Object.entries(teamCounts).sort(([, a], [, b]) => b - a).map(([teamName, count], index) => (
                          <tr key={teamName} style={{ borderBottom: '1px solid #181818', background: index === 0 ? 'rgba(255,192,0,0.06)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', color: index === 0 ? '#FFC000' : '#7D7D7D', fontWeight: 700 }}>
                              {index === 0 ? '🏆 1ª' : `${index + 1}ª`}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#FFC000', fontWeight: 700 }}>—</td>
                            <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{teamName}</td>
                            <td style={{ padding: '12px 16px', color: '#969696' }}>—</td>
                            <td style={{ padding: '12px 16px', color: index === 0 ? '#FFC000' : '#FFFFFF', fontWeight: 700 }}>{count} carros</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
