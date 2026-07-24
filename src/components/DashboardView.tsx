import React, { useState, useEffect } from 'react';
import {
  ToggleLeft, ToggleRight, Car, BarChart3, ShieldCheck,
  Plus, LogOut, RefreshCw, Layers, Camera, Trash2, Trophy, Award,
  Edit2, Eye, EyeOff, Check, Tag, X, Menu, Users, UserPlus
} from 'lucide-react';
import type { Carro, Categoria, CampoRequerido, Equipe, Evento } from '../data/mockData';
import { validateTeamName } from '../utils/teamValidation';


interface DashboardViewProps {
  evento: Evento | null;
  carros: Carro[];
  categorias: Categoria[];
  equipes: Equipe[];
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
    kmRodado?: number,
    genero?: 'M' | 'F',
    categoriasIds?: string[],
    pessoasEquipe?: number
  ) => Promise<void>;
  editarCarro?: (
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
  ) => Promise<void>;
  deletarCarro: (id: string) => Promise<void>;
  cadastrarCategoria?: (nome: string, tipo: 'popular' | 'interna', camposRequeridos: CampoRequerido[]) => Promise<void>;

  editarCategoria?: (id: string, novoNome: string) => Promise<void>;
  toggleOcultarCategoria?: (id: string) => Promise<void>;
  deletarCategoria?: (id: string) => Promise<void>;
  cadastrarEquipe?: (nome: string) => Promise<void>;
  deletarEquipe?: (id: string) => Promise<void>;
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
  equipes,
  resultados,
  totalUsuarios = 0,
  totalVotos = 0,
  isLoading: _isLoading,
  error,
  atualizarNomeEvento,
  cadastrarCarro,
  editarCarro,
  deletarCarro,
  cadastrarCategoria,
  editarCategoria,
  toggleOcultarCategoria,
  deletarCategoria,
  cadastrarEquipe,
  deletarEquipe: _deletarEquipe,
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
  const [genero, setGenero] = useState<'M' | 'F'>('M');
  const [telefoneDono, setTelefoneDono] = useState('');
  const [urlFoto, setUrlFoto] = useState('');
  const [equipeId, setEquipeId] = useState('');
  const [kmRodado, setKmRodado] = useState('');
  const [pessoasEquipe, setPessoasEquipe] = useState('');
  const [categoriasIds, setCategoriasIds] = useState<string[]>([]);
  const [cadastroMsg, setCadastroMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // States de cadastro rápido de equipe
  const [showNovaEquipe, setShowNovaEquipe] = useState(false);
  const [novaEquipeNome, setNovaEquipeNome] = useState('');
  const [submittingEquipe, setSubmittingEquipe] = useState(false);

  // States do modal de edição de carro
  const [editingCarro, setEditingCarro] = useState<Carro | null>(null);
  const [editNumeroInscricao, setEditNumeroInscricao] = useState('');
  const [editModelo, setEditModelo] = useState('');
  const [editAno, setEditAno] = useState('');
  const [editAlturaMm, setEditAlturaMm] = useState('');
  const [editNomeDono, setEditNomeDono] = useState('');
  const [editGenero, setEditGenero] = useState<'M' | 'F'>('M');
  const [editTelefoneDono, setEditTelefoneDono] = useState('');
  const [editUrlFoto, setEditUrlFoto] = useState('');
  const [editEquipeId, setEditEquipeId] = useState('');
  const [editKmRodado, setEditKmRodado] = useState('');
  const [editPessoasEquipe, setEditPessoasEquipe] = useState('');
  const [editCategoriasIds, setEditCategoriasIds] = useState<string[]>([]);
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [showNovaEquipeEdit, setShowNovaEquipeEdit] = useState(false);
  const [novaEquipeNomeEdit, setNovaEquipeNomeEdit] = useState('');
  const [submittingEquipeEdit, setSubmittingEquipeEdit] = useState(false);

  // States gerenciamento de categorias
  const [novaCatNome, setNovaCatNome] = useState('');
  const [novaCatTipo, setNovaCatTipo] = useState<'popular' | 'interna'>('popular');
  const [novaCatCampos, setNovaCatCampos] = useState<CampoRequerido[]>([]);
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
          const maxDim = 1600;
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
            setUrlFoto(canvas.toDataURL('image/jpeg', 0.92));
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

      // Resolver nome da equipe a partir do ID selecionado
      const equipeSelected = equipes.find((eq) => eq.id === equipeId);
      const equipeName = equipeSelected?.nome || undefined;

      await cadastrarCarro(
        finalInscricao,
        finalModelo,
        finalAno,
        alturaMm ? parseInt(alturaMm, 10) : undefined,
        finalNomeDono,
        telefoneDono || undefined,
        urlFoto || undefined,
        equipeName,
        kmRodado ? parseFloat(kmRodado.replace(',', '.')) : undefined,
        genero,
        categoriasIds.length > 0 ? categoriasIds : undefined,
        pessoasEquipe ? parseInt(pessoasEquipe, 10) : undefined
      );
      setCadastroMsg({ type: 'success', text: 'Carro cadastrado com sucesso!' });
      setModelo(''); setAno(''); setAlturaMm(''); setNomeDono(''); setGenero('M');
      setTelefoneDono(''); setUrlFoto(''); setEquipeId(''); setKmRodado('');
      setPessoasEquipe(''); setCategoriasIds([]);
      setIsManualInscricao(false);
    } catch (err: any) {
      setCadastroMsg({ type: 'error', text: err.message || 'Erro ao cadastrar carro.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCadastrarEquipe = async () => {
    if (!novaEquipeNome.trim() || !cadastrarEquipe) return;

    const valRes = validateTeamName(novaEquipeNome, equipes);
    if (valRes.status === 'profanity') {
      alert(valRes.message);
      return;
    }
    if (valRes.status === 'exact') {
      alert(valRes.message);
      return;
    }
    if (valRes.status === 'similar') {
      const confirmCont = confirm(`${valRes.message}\n\nDeseja cadastrar "${novaEquipeNome.trim()}" mesmo assim?`);
      if (!confirmCont) return;
    }

    setSubmittingEquipe(true);
    try {
      await cadastrarEquipe(novaEquipeNome.trim());
      setNovaEquipeNome('');
      setShowNovaEquipe(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar equipe:', err);
    } finally {
      setSubmittingEquipe(false);
    }
  };

  const openEditModal = (carro: Carro) => {
    setEditingCarro(carro);
    setEditNumeroInscricao(carro.numero_inscricao);
    setEditModelo(carro.modelo);
    setEditAno(String(carro.ano));
    setEditAlturaMm(carro.altura_mm && carro.altura_mm > 0 ? String(carro.altura_mm) : '');
    setEditNomeDono(carro.nome_dono);
    setEditGenero(carro.genero || 'M');
    setEditTelefoneDono(carro.telefone_dono || '');
    setEditUrlFoto(carro.url_foto || '');
    setEditKmRodado(carro.km_rodado ? String(carro.km_rodado) : '');
    setEditPessoasEquipe(carro.pessoas_equipe ? String(carro.pessoas_equipe) : '');
    setEditCategoriasIds(carro.categorias_ids || []);
    setEditMsg(null);
    setShowNovaEquipeEdit(false);
    // Resolver equipe_id a partir do nome da equipe salvo
    if (carro.equipe) {
      const eq = equipes.find((e) => e.nome.toLowerCase() === carro.equipe!.toLowerCase());
      setEditEquipeId(eq?.id || '');
    } else {
      setEditEquipeId('');
    }
  };

  const closeEditModal = () => {
    setEditingCarro(null);
    setEditMsg(null);
  };

  const handleEditarCarro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCarro || !editarCarro) return;
    setSubmittingEdit(true);
    setEditMsg(null);
    try {
      const equipeSelected = equipes.find((eq) => eq.id === editEquipeId);
      const equipeName = equipeSelected?.nome || undefined;
      await editarCarro(editingCarro.id, {
        numeroInscricao: editNumeroInscricao.trim() || editingCarro.numero_inscricao,
        modelo: editModelo.trim() || editingCarro.modelo,
        ano: editAno.trim() ? parseInt(editAno, 10) : editingCarro.ano,
        alturaMm: editAlturaMm.trim() ? parseInt(editAlturaMm, 10) : undefined,
        nomeDono: editNomeDono.trim() || editingCarro.nome_dono,
        telefoneDono: editTelefoneDono || undefined,
        urlFoto: editUrlFoto || undefined,
        equipe: equipeName,
        kmRodado: editKmRodado.trim() ? parseFloat(editKmRodado.replace(',', '.')) : undefined,
        genero: editGenero,
        categoriasIds: editCategoriasIds,
        pessoasEquipe: editPessoasEquipe.trim() ? parseInt(editPessoasEquipe, 10) : undefined,
      });
      setEditMsg({ type: 'success', text: 'Veículo atualizado com sucesso!' });
      setTimeout(() => closeEditModal(), 1200);
    } catch (err: any) {
      setEditMsg({ type: 'error', text: err.message || 'Erro ao editar veículo.' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleCameraEditCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) { height = (height * maxDim) / width; width = maxDim; }
          } else {
            if (height > maxDim) { width = (width * maxDim) / height; height = maxDim; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.drawImage(img, 0, 0, width, height); setEditUrlFoto(canvas.toDataURL('image/jpeg', 0.92)); }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCadastrarEquipeEdit = async () => {
    if (!novaEquipeNomeEdit.trim() || !cadastrarEquipe) return;

    const valRes = validateTeamName(novaEquipeNomeEdit, equipes);
    if (valRes.status === 'profanity') {
      alert(valRes.message);
      return;
    }
    if (valRes.status === 'exact') {
      alert(valRes.message);
      return;
    }
    if (valRes.status === 'similar') {
      const confirmCont = confirm(`${valRes.message}\n\nDeseja cadastrar "${novaEquipeNomeEdit.trim()}" mesmo assim?`);
      if (!confirmCont) return;
    }

    setSubmittingEquipeEdit(true);
    try {
      await cadastrarEquipe(novaEquipeNomeEdit.trim());
      setNovaEquipeNomeEdit('');
      setShowNovaEquipeEdit(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar equipe:', err);
    } finally {
      setSubmittingEquipeEdit(false);
    }
  };

  const handleAddCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCatNome.trim() || !cadastrarCategoria) return;
    await cadastrarCategoria(novaCatNome.trim(), novaCatTipo, novaCatCampos);
    setNovaCatNome('');
    setNovaCatCampos([]);
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-16" style={{ background: '#181818', borderBottom: '1px solid #202020', padding: '16px 24px' }}>

            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-16 w-full md:w-auto">

              <div className="flex items-center justify-between w-full md:w-auto">
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

                {/* Status on mobile - right side of row 1 */}
                <div className="flex md:hidden items-center gap-2">
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: votacaoAberta ? '#4ade80' : '#ef4444',
                    border: `1px solid ${votacaoAberta ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    padding: '5px 12px',
                    whiteSpace: 'nowrap',
                  }}>
                    {votacaoAberta ? '● EM ANDAMENTO' : '○ ENCERRADA'}
                  </span>
                  <button
                    onClick={() => fetchResultados()}
                    style={{ background: '#202020', border: '1px solid #313131', padding: '6px', cursor: 'pointer', display: 'flex', color: '#FFC000', flexShrink: 0 }}
                    title="Atualizar Dados"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
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
                    whiteSpace: 'nowrap',
                  }}>
                    Evento Ativo
                  </span>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7D7D7D', whiteSpace: 'nowrap' }}>
                    {evento?.data}
                  </span>
                </div>

                {/* Nome do Evento (Visualizar ou Editar) */}
                {isEditingEventName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={eventTempName}
                      onChange={(e) => setEventTempName(e.target.value)}
                      style={{ ...S.input, height: 36, fontSize: 18, width: '100%', maxWidth: 280 }}
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
                    <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#FFFFFF', margin: 0, lineHeight: 1, wordBreak: 'break-word' }}>
                      {evento?.nome || 'Carregando...'}
                    </h1>
                    {atualizarNomeEvento && (
                      <button
                        onClick={() => {
                          setEventTempName(evento?.nome || '');
                          setIsEditingEventName(true);
                        }}
                        style={{ background: 'none', border: 'none', color: '#7D7D7D', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.12s', flexShrink: 0 }}
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

            {/* Status on desktop - right side */}
            <div className="hidden md:flex items-center gap-2">
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: votacaoAberta ? '#4ade80' : '#ef4444',
                border: `1px solid ${votacaoAberta ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                padding: '5px 12px',
                whiteSpace: 'nowrap',
              }}>
                {votacaoAberta ? '● EM ANDAMENTO' : '○ ENCERRADA'}
              </span>
              <button
                onClick={() => fetchResultados()}
                style={{ background: '#202020', border: '1px solid #313131', padding: '6px', cursor: 'pointer', display: 'flex', color: '#FFC000', flexShrink: 0 }}
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
            {activeTab === 'carros' && (() => {
              // Computar quais campos extras são exigidos pelas categorias atualmente marcadas
              const camposNecessarios = new Set<CampoRequerido>();
              categoriasIds.forEach((id) => {
                const cat = categorias.find((c) => c.id === id);
                if (cat?.campos_requeridos) {
                  cat.campos_requeridos.forEach((c) => camposNecessarios.add(c));
                }
              });
              const temCamposComplementares = camposNecessarios.size > 0;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  {/* Form Cadastro */}
                  <div style={{ background: '#181818', border: '1px solid #202020', borderTop: '2px solid #FFC000', padding: '20px' }}>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 16, borderBottom: '1px solid #202020' }}>
                      <Plus size={16} color="#FFC000" />
                      Novo Veículo Inscrito
                    </h3>

                    <form onSubmit={handleCadastrarCarro} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                      {/* ── ETAPA 1: campos essenciais (sempre visíveis) ── */}
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

                      <div>
                        <label style={S.label}>Modelo (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: VW Gol 1.8 (opcional)"
                          value={modelo}
                          onChange={(e) => setModelo(e.target.value)}
                          style={S.input}
                          onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                          onBlur={e => { e.target.style.borderColor = '#313131'; }}
                        />
                      </div>

                      <div>
                        <label style={S.label}>Ano (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: 1994 (opcional)"
                          value={ano}
                          onChange={(e) => setAno(e.target.value)}
                          style={S.input}
                          onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                          onBlur={e => { e.target.style.borderColor = '#313131'; }}
                        />
                      </div>

                      <div>
                        <label style={S.label}>Nome do Dono(a) (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: Rodrigo Silva (opcional)"
                          value={nomeDono}
                          onChange={(e) => setNomeDono(e.target.value)}
                          style={S.input}
                          onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                          onBlur={e => { e.target.style.borderColor = '#313131'; }}
                        />
                      </div>

                      {/* Foto - Sempre visível */}
                      <div>
                        <label style={S.label}>Foto do Veículo (opcional)</label>
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

                      {/* Categorias — parte do passo 1, desbloqueiam o passo 2 */}
                      <div>
                        <label style={{ ...S.label, marginBottom: 10 }}>Categorias que este veículo concorre</label>
                        {categorias.length === 0 ? (
                          <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7D7D7D' }}>Nenhuma categoria cadastrada.</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {categorias.map((cat) => (
                              <label
                                key={cat.id}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: categoriasIds.includes(cat.id) ? 'rgba(255,192,0,0.07)' : '#000000', border: `1px solid ${categoriasIds.includes(cat.id) ? 'rgba(255,192,0,0.4)' : '#202020'}`, transition: 'background 0.12s, border-color 0.12s' }}
                              >
                                <input
                                  type="checkbox"
                                  checked={categoriasIds.includes(cat.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCategoriasIds((prev) => [...prev, cat.id]);
                                    } else {
                                      setCategoriasIds((prev) => prev.filter((id) => id !== cat.id));
                                    }
                                  }}
                                  style={{ accentColor: '#FFC000', width: 15, height: 15, flexShrink: 0 }}
                                />
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: categoriasIds.includes(cat.id) ? '#FFC000' : '#FFFFFF', flex: 1 }}>
                                  {cat.nome}
                                </span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: cat.tipo === 'popular' ? '#FFC000' : '#29ABE2', background: cat.tipo === 'popular' ? 'rgba(255,192,0,0.08)' : 'rgba(41,171,226,0.08)', padding: '2px 6px', border: `1px solid ${cat.tipo === 'popular' ? 'rgba(255,192,0,0.2)' : 'rgba(41,171,226,0.2)'}`, flexShrink: 0 }}>
                                  {cat.tipo === 'popular' ? 'Popular' : 'Interna'}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* ── ETAPA 2: campos complementares (liberados dinamicamente baseados na categoria) ── */}
                      {temCamposComplementares && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            borderTop: '1px solid rgba(255,192,0,0.25)',
                            paddingTop: 16,
                            animation: 'fadeSlideIn 0.3s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,192,0,0.15)' }} />
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#FFC000' }}>Dados Complementares</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,192,0,0.15)' }} />
                          </div>

                          {/* Gênero */}
                          {camposNecessarios.has('genero') && (
                            <div>
                              <label style={S.label}>Gênero do Dono(a)</label>
                              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                {[{ label: 'Masculino', value: 'M' }, { label: 'Feminino', value: 'F' }].map((opt) => (
                                  <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF', fontSize: '14px', cursor: 'pointer' }}>
                                    <input
                                      type="radio"
                                      name="genero"
                                      value={opt.value}
                                      checked={genero === opt.value}
                                      onChange={(e) => setGenero(e.target.value as 'M' | 'F')}
                                      style={{ accentColor: '#FFC000', width: '16px', height: '16px' }}
                                    />
                                    {opt.label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Telefone */}
                          {camposNecessarios.has('telefone') && (
                            <div>
                              <label style={S.label}>Telefone (opcional)</label>
                              <input
                                type="text"
                                placeholder="Ex: (11) 99999-9999"
                                value={telefoneDono}
                                onChange={(e) => setTelefoneDono(e.target.value)}
                                style={S.input}
                                onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                                onBlur={e => { e.target.style.borderColor = '#313131'; }}
                              />
                            </div>
                          )}

                          {/* Altura e Km */}
                          {(camposNecessarios.has('altura_mm') || camposNecessarios.has('km_rodado')) && (
                            <div style={{ display: 'grid', gridTemplateColumns: camposNecessarios.has('altura_mm') && camposNecessarios.has('km_rodado') ? '1fr 1fr' : '1fr', gap: 8 }}>
                              {camposNecessarios.has('altura_mm') && (
                                <div>
                                  <label style={S.label}>Altura mm (opcional)</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: 50 (opcional)"
                                    value={alturaMm}
                                    onChange={(e) => setAlturaMm(e.target.value)}
                                    style={{ ...S.input, height: 36 }}
                                    onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                                    onBlur={e => { e.target.style.borderColor = '#313131'; }}
                                  />
                                </div>
                              )}
                              {camposNecessarios.has('km_rodado') && (
                                <div>
                                  <label style={S.label}>Km Rodados (opcional)</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: 150 (opcional)"
                                    value={kmRodado}
                                    onChange={(e) => setKmRodado(e.target.value)}
                                    style={{ ...S.input, height: 36 }}
                                    onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                                    onBlur={e => { e.target.style.borderColor = '#313131'; }}
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {/* Equipe */}
                          {camposNecessarios.has('equipe') && (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                <label style={S.label}>Equipe (opcional)</label>
                                {cadastrarEquipe && (
                                  <button
                                    type="button"
                                    onClick={() => setShowNovaEquipe(!showNovaEquipe)}
                                    style={{ background: 'transparent', border: 'none', color: '#FFC000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                                  >
                                    <UserPlus size={13} />
                                    {showNovaEquipe ? 'Cancelar' : 'Nova Equipe'}
                                  </button>
                                )}
                              </div>

                              {showNovaEquipe && (
                                <div style={{ background: '#000000', border: '1px solid rgba(255,192,0,0.25)', padding: '10px 12px', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    placeholder="Nome da equipe..."
                                    value={novaEquipeNome}
                                    onChange={(e) => setNovaEquipeNome(e.target.value)}
                                    style={{ ...S.input, height: 34, fontSize: 13, flex: 1 }}
                                    onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                                    onBlur={e => { e.target.style.borderColor = '#313131'; }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCadastrarEquipe(); } }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCadastrarEquipe}
                                    disabled={submittingEquipe || !novaEquipeNome.trim()}
                                    style={{ background: '#FFC000', color: '#000000', border: 'none', padding: '0 12px', height: 34, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', flexShrink: 0, opacity: submittingEquipe || !novaEquipeNome.trim() ? 0.5 : 1 }}
                                  >
                                    {submittingEquipe ? '...' : 'Salvar'}
                                  </button>
                                </div>
                              )}

                              <select
                                value={equipeId}
                                onChange={(e) => setEquipeId(e.target.value)}
                                style={{ ...S.input, colorScheme: 'dark' }}
                                onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                                onBlur={e => { e.target.style.borderColor = '#313131'; }}
                              >
                                <option value="">— Sem equipe —</option>
                                {equipes.map((eq) => (
                                  <option key={eq.id} value={eq.id}>{eq.nome}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Pessoas na equipe */}
                          {camposNecessarios.has('equipe') && equipeId && (
                            <div>
                              <label style={S.label}>Pessoas uniformizadas na equipe (neste carro)</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Ex: 5"
                                value={pessoasEquipe}
                                onChange={(e) => setPessoasEquipe(e.target.value)}
                                style={{ ...S.input, height: 36 }}
                                onFocus={e => { e.target.style.borderColor = '#FFC000'; }}
                                onBlur={e => { e.target.style.borderColor = '#313131'; }}
                              />
                              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D', marginTop: 4, display: 'block' }}>
                                Quantas pessoas uniformizadas da equipe vieram com este veículo
                              </span>
                            </div>
                          )}

                        </div>
                      )}

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
                              {carro.url_foto ? (
                                <img
                                  src={carro.url_foto}
                                  alt={carro.modelo}
                                  style={{ width: 52, height: 52, objectFit: 'cover', flexShrink: 0, display: 'block', border: '1px solid #202020' }}
                                />
                              ) : (
                                <div style={{ width: 52, height: 52, flexShrink: 0, background: '#181818', border: '1px solid #202020', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Camera size={18} color="#313131" />
                                </div>
                              )}
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {carro.modelo}
                                </div>
                                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7D7D7D', marginTop: 3 }}>
                                  {carro.nome_dono}{carro.equipe ? ` · ${carro.equipe}` : ''}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                  <span style={{ background: '#FFC000', color: '#000000', padding: '2px 8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700 }}>
                                    {carro.numero_inscricao}
                                  </span>
                                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#7D7D7D' }}>
                                    {carro.ano} {carro.altura_mm && carro.altura_mm > 0 ? `· ${carro.altura_mm}mm` : ''}
                                  </span>
                                  {carro.categorias_ids && carro.categorias_ids.length > 0 && (
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#FFC000', background: 'rgba(255,192,0,0.08)', border: '1px solid rgba(255,192,0,0.2)', padding: '1px 6px' }}>
                                      {carro.categorias_ids.length} cat.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {editarCarro && (
                                <button
                                  onClick={() => openEditModal(carro)}
                                  style={{ background: 'rgba(255,192,0,0.1)', border: '1px solid rgba(255,192,0,0.3)', color: '#FFC000', padding: 8, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                                  title="Editar"
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,192,0,0.25)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,192,0,0.1)'; }}
                                >
                                  <Edit2 size={15} />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (confirm(`Excluir "${carro.modelo}" (${carro.numero_inscricao})?`)) {
                                    await deletarCarro(carro.id);
                                  }
                                }}
                                style={{ background: 'rgba(180,0,0,0.1)', border: '1px solid rgba(200,50,50,0.3)', color: '#ef4444', padding: 8, cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                                title="Excluir"
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.25)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.1)'; }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

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

                    {/* Campos que esta categoria exige ao inscrever um carro */}
                    <div>
                      <label style={{ ...S.label, marginBottom: 10 }}>Dados que esta categoria exige</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(
                          [
                            { value: 'genero', label: 'Gênero do dono' },
                            { value: 'foto', label: 'Foto do veículo' },
                            { value: 'altura_mm', label: 'Altura (mm)' },
                            { value: 'km_rodado', label: 'Km rodados' },
                            { value: 'equipe', label: 'Equipe + Pessoas' },
                            { value: 'telefone', label: 'Telefone do dono' },
                          ] as { value: CampoRequerido; label: string }[]
                        ).map((opt) => {
                          const ativo = novaCatCampos.includes(opt.value);
                          return (
                            <label
                              key={opt.value}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '7px 10px', background: ativo ? 'rgba(255,192,0,0.07)' : '#000000', border: `1px solid ${ativo ? 'rgba(255,192,0,0.35)' : '#202020'}`, transition: 'background 0.12s, border-color 0.12s' }}
                            >
                              <input
                                type="checkbox"
                                checked={ativo}
                                onChange={(e) => {
                                  if (e.target.checked) setNovaCatCampos((p) => [...p, opt.value]);
                                  else setNovaCatCampos((p) => p.filter((c) => c !== opt.value));
                                }}
                                style={{ accentColor: '#FFC000', width: 14, height: 14, flexShrink: 0 }}
                              />
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: ativo ? '#FFC000' : '#FFFFFF' }}>
                                {opt.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
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
                          valTab === 'ano' ? 'Ano' : valTab === 'rodagem' ? 'KM Rodado' : 'Pessoas'].map((h) => (
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
                        // Agrupa por equipe e SOMA o número de pessoas (não conta carros)
                        const teamPeople: Record<string, number> = {};
                        const teamCarros: Record<string, number> = {};
                        carros.forEach((c) => {
                          if (c.equipe?.trim()) {
                            const t = c.equipe.trim();
                            teamPeople[t] = (teamPeople[t] || 0) + (c.pessoas_equipe || 0);
                            teamCarros[t] = (teamCarros[t] || 0) + 1;
                          }
                        });
                        return Object.entries(teamPeople).sort(([, a], [, b]) => b - a).map(([teamName, pessoasTotal], index) => (
                          <tr key={teamName} style={{ borderBottom: '1px solid #181818', background: index === 0 ? 'rgba(255,192,0,0.06)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', color: index === 0 ? '#FFC000' : '#7D7D7D', fontWeight: 700 }}>
                              {index === 0 ? '🏆 1ª' : `${index + 1}ª`}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#FFC000', fontWeight: 700 }}>—</td>
                            <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{teamName}</td>
                            <td style={{ padding: '12px 16px', color: '#969696' }}>{teamCarros[teamName]} carro(s)</td>
                            <td style={{ padding: '12px 16px', color: index === 0 ? '#FFC000' : '#FFFFFF', fontWeight: 700 }}>{pessoasTotal} pessoas</td>
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

      {/* ══════ MODAL EDIÇÃO DE CARRO ══════ */}
      {editingCarro && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}
        >
          {/* Backdrop */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }} onClick={closeEditModal} />

          {/* Painel lateral */}
          <div style={{ position: 'relative', zIndex: 1, background: '#0a0a0a', borderLeft: '1px solid #202020', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ background: '#181818', borderBottom: '2px solid #FFC000', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit2 size={16} color="#FFC000" />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF' }}>
                  Editar Veículo
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#FFC000', background: 'rgba(255,192,0,0.1)', border: '1px solid rgba(255,192,0,0.3)', padding: '2px 10px' }}>
                  {editingCarro.numero_inscricao}
                </span>
              </div>
              <button onClick={closeEditModal} style={{ background: '#202020', border: '1px solid #313131', color: '#7D7D7D', padding: 6, cursor: 'pointer', display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={e => e.currentTarget.style.color = '#7D7D7D'}>
                <X size={18} />
              </button>
            </div>

            {/* Foto preview no topo */}
            {editUrlFoto && (
              <div style={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                <img src={editUrlFoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,0.8) 0%, transparent 60%)' }} />
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleEditarCarro} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, flex: 1 }}>

              {/* Inscrição */}
              <div>
                <label style={S.label}>Inscrição</label>
                <input type="text" value={editNumeroInscricao} onChange={e => setEditNumeroInscricao(e.target.value)}
                  style={S.input} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
              </div>

              {/* Modelo + Ano */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={S.label}>Modelo</label>
                  <input type="text" value={editModelo} onChange={e => setEditModelo(e.target.value)}
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
                </div>
                <div>
                  <label style={S.label}>Ano</label>
                  <input type="text" value={editAno} onChange={e => setEditAno(e.target.value)}
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
                </div>
              </div>

              {/* Nome dono + Gênero */}
              <div>
                <label style={S.label}>Nome do Dono(a)</label>
                <input type="text" value={editNomeDono} onChange={e => setEditNomeDono(e.target.value)}
                  style={S.input} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
              </div>
              <div>
                <label style={S.label}>Gênero do Dono(a)</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  {[{ label: 'Masculino', value: 'M' }, { label: 'Feminino', value: 'F' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFF', fontSize: 14, cursor: 'pointer' }}>
                      <input type="radio" name="editGenero" value={opt.value} checked={editGenero === opt.value}
                        onChange={e => setEditGenero(e.target.value as 'M' | 'F')} style={{ accentColor: '#FFC000', width: 16, height: 16 }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Telefone + Altura + KM */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={S.label}>Telefone</label>
                  <input type="text" value={editTelefoneDono} onChange={e => setEditTelefoneDono(e.target.value)} placeholder="(11) 99999-9999"
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
                </div>
                <div>
                  <label style={S.label}>Altura mm</label>
                  <input type="text" value={editAlturaMm} onChange={e => setEditAlturaMm(e.target.value)} placeholder="Ex: 50"
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
                </div>
                <div>
                  <label style={S.label}>Km Rodados</label>
                  <input type="text" value={editKmRodado} onChange={e => setEditKmRodado(e.target.value)} placeholder="Ex: 150"
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
                </div>
              </div>

              {/* Equipe */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={S.label}>Equipe</label>
                  {cadastrarEquipe && (
                    <button type="button" onClick={() => setShowNovaEquipeEdit(!showNovaEquipeEdit)}
                      style={{ background: 'transparent', border: 'none', color: '#FFC000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <UserPlus size={13} />{showNovaEquipeEdit ? 'Cancelar' : 'Nova Equipe'}
                    </button>
                  )}
                </div>
                {showNovaEquipeEdit && (
                  <div style={{ background: '#000000', border: '1px solid rgba(255,192,0,0.25)', padding: '10px 12px', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="text" placeholder="Nome da equipe..." value={novaEquipeNomeEdit} onChange={e => setNovaEquipeNomeEdit(e.target.value)}
                      style={{ ...S.input, height: 34, fontSize: 13, flex: 1 }}
                      onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCadastrarEquipeEdit(); } }} />
                    <button type="button" onClick={handleCadastrarEquipeEdit} disabled={submittingEquipeEdit || !novaEquipeNomeEdit.trim()}
                      style={{ background: '#FFC000', color: '#000', border: 'none', padding: '0 12px', height: 34, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, textTransform: 'uppercase', flexShrink: 0, opacity: submittingEquipeEdit || !novaEquipeNomeEdit.trim() ? 0.5 : 1 }}>
                      {submittingEquipeEdit ? '...' : 'Salvar'}
                    </button>
                  </div>
                )}
                <select value={editEquipeId} onChange={e => setEditEquipeId(e.target.value)}
                  style={{ ...S.input, colorScheme: 'dark' }}
                  onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }}>
                  <option value="">— Sem equipe —</option>
                  {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                </select>
              </div>

              {/* Pessoas na equipe */}
              {editEquipeId && (
                <div>
                  <label style={S.label}>Pessoas uniformizadas na equipe (neste carro)</label>
                  <input type="number" min="0" placeholder="Ex: 5" value={editPessoasEquipe} onChange={e => setEditPessoasEquipe(e.target.value)}
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
                </div>
              )}

              {/* Foto */}
              <div>
                <label style={S.label}>Foto do Veículo</label>
                <button type="button" onClick={() => document.getElementById('camera-edit-input')?.click()}
                  style={{ ...S.input, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', background: '#202020', borderColor: '#313131', marginBottom: 6 }}>
                  <Camera size={14} color="#FFC000" />
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Capturar / Trocar Foto</span>
                </button>
                <input id="camera-edit-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleCameraEditCapture} />
                <input type="text" placeholder="Ou cole uma URL..." value={editUrlFoto.startsWith('data:image') ? '' : editUrlFoto}
                  onChange={e => setEditUrlFoto(e.target.value)} style={{ ...S.input, height: 36 }}
                  onFocus={e => { e.target.style.borderColor = '#FFC000'; }} onBlur={e => { e.target.style.borderColor = '#313131'; }} />
              </div>

              {/* Categorias */}
              <div>
                <label style={{ ...S.label, marginBottom: 10 }}>Categorias que este veículo concorre</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categorias.map(cat => (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: editCategoriasIds.includes(cat.id) ? 'rgba(255,192,0,0.07)' : '#000000', border: `1px solid ${editCategoriasIds.includes(cat.id) ? 'rgba(255,192,0,0.4)' : '#202020'}`, transition: 'background 0.12s, border-color 0.12s' }}>
                      <input type="checkbox" checked={editCategoriasIds.includes(cat.id)}
                        onChange={e => {
                          if (e.target.checked) setEditCategoriasIds(prev => [...prev, cat.id]);
                          else setEditCategoriasIds(prev => prev.filter(id => id !== cat.id));
                        }}
                        style={{ accentColor: '#FFC000', width: 15, height: 15, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: editCategoriasIds.includes(cat.id) ? '#FFC000' : '#FFFFFF', flex: 1 }}>{cat.nome}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: cat.tipo === 'popular' ? '#FFC000' : '#29ABE2', background: cat.tipo === 'popular' ? 'rgba(255,192,0,0.08)' : 'rgba(41,171,226,0.08)', padding: '2px 6px', border: `1px solid ${cat.tipo === 'popular' ? 'rgba(255,192,0,0.2)' : 'rgba(41,171,226,0.2)'}`, flexShrink: 0 }}>
                        {cat.tipo === 'popular' ? 'Popular' : 'Interna'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Mensagem */}
              {editMsg && (
                <div style={{ background: editMsg.type === 'success' ? 'rgba(0,120,60,0.15)' : 'rgba(180,0,0,0.15)', border: `1px solid ${editMsg.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(220,50,50,0.3)'}`, borderLeft: `3px solid ${editMsg.type === 'success' ? '#4ade80' : '#ef4444'}`, padding: '10px 14px' }}>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: editMsg.type === 'success' ? '#86efac' : '#fca5a5' }}>{editMsg.text}</span>
                </div>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button type="submit" disabled={submittingEdit} className="btn-gold" style={{ flex: 1, height: 44, fontSize: 14 }}>
                  {submittingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button type="button" onClick={closeEditModal}
                  style={{ background: '#202020', border: '1px solid #313131', color: '#FFFFFF', padding: '0 16px', height: 44, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crédito do Desenvolvedor */}
      <div
        className="dev-credit-footer"
        style={{
          position: 'fixed',
          bottom: 0,
          right: 0,
          left: 'auto',
          width: 'auto',
          padding: '10px 20px',
          zIndex: 9999,
          background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.9) 40%)',
          pointerEvents: 'none',
        }}
      >
        <span>Desenvolvido por</span>
        <span className="dev-dot" />
        <a
          href="https://pedromachado.dev.br/votacao"
          target="_blank"
          rel="noopener noreferrer"
          style={{ pointerEvents: 'auto' }}
        >
          PedroMachado.Dev
        </a>
      </div>
    </div>
  );
}
