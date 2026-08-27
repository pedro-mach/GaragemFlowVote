import React, { useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import {
  ToggleLeft, ToggleRight, Car, BarChart3, ShieldCheck,
  Plus, LogOut, RefreshCw, Layers, Camera, Image as ImageIcon, Trash2, Trophy, Award,
  Edit2, Eye, EyeOff, Check, Tag, X, Menu, Users, UserPlus, Calendar, Ruler,
  Share2, Download, Copy, Sparkles
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
  fetchFotoCarro?: (id: string) => Promise<string | null>;
  logout: () => void;
}

type TabType = 'status' | 'resultados' | 'instagrammable' | 'carros' | 'validacao' | 'categorias';

// ─── Style helpers BMW Motorsport ─────────────────────────────────
const S = {
  label: {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.16em',
    color: '#94A3B8',
    display: 'block',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    background: '#0D1117',
    border: '1px solid #1E293B',
    borderRadius: 0,
    color: '#FFFFFF',
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 15,
    letterSpacing: '0.04em',
    padding: '0 12px',
    height: 40,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  metricCard: {
    background: '#0D1117',
    border: '1px solid #1E293B',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: (active: boolean) => ({
    background: active ? '#0099FF' : 'transparent',
    color: active ? '#FFFFFF' : '#94A3B8',
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
  fetchFotoCarro,
  logout,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [valTab, setValTab] = useState<'ano' | 'altura'>('ano');
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

  // States para a aba Resultados Instagram
  const [selectedInstaCatId, setSelectedInstaCatId] = useState<string>('all');
  const [instaFormat, setInstaFormat] = useState<'story' | 'feed'>('story');
  const [instaTheme, setInstaTheme] = useState<'gold' | 'dark' | 'red'>('gold');
  const [copiedCaptionToast, setCopiedCaptionToast] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const cardPreviewRef = useRef<HTMLDivElement>(null);

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
    if (activeTab === 'resultados' || activeTab === 'instagrammable') fetchResultados();
  }, [activeTab]);

  // Helper para obter dados do vencedor de cada categoria ou destaque técnico
  const getWinnerData = (catId: string) => {
    if (catId === 'tech_antigo') {
      const winner = carros.filter(c => c.ano && Number(c.ano) > 1900).sort((a, b) => Number(a.ano) - Number(b.ano))[0];
      return {
        tituloCategoria: 'CARRO MAIS ANTIGO',
        tipoBadge: 'DESTAQUE TÉCNICO',
        carro: winner || null,
        metricaLabel: winner ? `Fabricado em ${winner.ano}` : 'Sem dados',
        totalVotos: undefined,
      };
    }
    if (catId === 'tech_jeep') {
      const winner = carros
        .filter(c => c && c.altura_mm !== undefined && c.altura_mm !== null && Number(c.altura_mm) > 0)
        .sort((a, b) => Number(b.altura_mm) - Number(a.altura_mm))[0];
      return {
        tituloCategoria: 'DESTAQUE JEEP (ALTURA)',
        tipoBadge: 'DESTAQUE TÉCNICO',
        carro: winner || null,
        metricaLabel: winner ? `📏 ${winner.altura_mm} mm ALTURA` : 'Sem dados',
        totalVotos: undefined,
      };
    }

    const cat = categorias.find(c => c.id === catId);
    const votosCat = resultados[catId] || [];
    const topItem = votosCat[0];
    const winnerCar = topItem ? carros.find(c => c.id === topItem.carroId) : null;
    const totalVotosCat = votosCat.reduce((sum, item) => sum + item.votosCount, 0);
    const percent = totalVotosCat > 0 && topItem ? ((topItem.votosCount / totalVotosCat) * 100).toFixed(0) : '0';

    return {
      tituloCategoria: cat ? cat.nome.toUpperCase() : 'CATEGORIA POPULAR',
      tipoBadge: 'VOTAÇÃO POPULAR',
      carro: winnerCar || null,
      metricaLabel: topItem ? `${topItem.votosCount} VOTOS (${percent}%)` : 'Nenhum voto registrado',
      totalVotos: totalVotosCat,
    };
  };

  // Helper para formatar a data no padrão brasileiro (DD/MM/YYYY)
  const formatarDataBR = (strData?: string) => {
    if (!strData) return '';
    const trimmed = strData.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, ano, mes, dia] = match;
      return `${dia}/${mes}/${ano}`;
    }
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      }
    } catch {
      // fallback
    }
    return trimmed;
  };

  // Helper para obter a lista com TODOS os vencedores
  const getAllCategoryWinners = () => {
    const list: { id: string; tituloCategoria: string; carro: Carro | null; metricaLabel: string; icone?: string }[] = [];

    // Categorias populares
    categorias.filter(c => c.tipo === 'popular' && !c.oculta).forEach((cat) => {
      const data = getWinnerData(cat.id);
      list.push({
        id: cat.id,
        tituloCategoria: data.tituloCategoria,
        carro: data.carro,
        metricaLabel: data.metricaLabel,
        icone: '🥇',
      });
    });

    // Destaques técnicos
    const antigo = getWinnerData('tech_antigo');
    if (antigo.carro) {
      list.push({
        id: 'tech_antigo',
        tituloCategoria: antigo.tituloCategoria,
        carro: antigo.carro,
        metricaLabel: antigo.metricaLabel,
        icone: '👴',
      });
    }

    const jeep = getWinnerData('tech_jeep');
    if (jeep.carro) {
      list.push({
        id: 'tech_jeep',
        tituloCategoria: jeep.tituloCategoria,
        carro: jeep.carro,
        metricaLabel: jeep.metricaLabel,
        icone: '🚙',
      });
    }

    return list;
  };

  const handleCopyCaption = () => {
    const eventName = evento?.nome || 'Encontro Los Felas';
    let caption = `🏆 RESULTADO OFICIAL - ${eventName.toUpperCase()} 🏆\n\n`;

    if (selectedInstaCatId === 'all') {
      caption += `Confira os grandes campeões do nosso encontro automotivo!\n\n`;
      getAllCategoryWinners().forEach(item => {
        if (item.carro) {
          caption += `${item.icone || '🥇'} ${item.tituloCategoria}: ${item.carro.modelo} (${item.carro.numero_inscricao || `#${item.carro.ano}`}) - ${item.metricaLabel}\n`;
        } else {
          caption += `${item.icone || '🥇'} ${item.tituloCategoria}: Sem vencedor registrado\n`;
        }
      });
    } else {
      const data = getWinnerData(selectedInstaCatId);
      caption += `📍 CATEGORIA: ${data.tituloCategoria}\n`;
      if (data.carro) {
        caption += `🥇 1º LUGAR: ${data.carro.modelo} (${data.carro.numero_inscricao})\n`;
        if (data.carro.nome_dono && data.carro.nome_dono !== 'Não informado') {
          caption += `👤 Proprietário: ${data.carro.nome_dono}\n`;
        }
        if (data.carro.equipe) {
          caption += `🛡️ Equipe: ${data.carro.equipe}\n`;
        }
        caption += `🔥 Resultado: ${data.metricaLabel}\n`;
      } else {
        caption += `Vencedores em apuração.\n`;
      }
    }

    caption += `\nParabéns aos vencedores e obrigado a todos pela presença! 🎉🚗💨\n\n#LosFelas #EncontroLosFelas #BMW #CarrosRebaixados #CarrosAntigos #Automotivo #Vencedores`;

    navigator.clipboard.writeText(caption);
    setCopiedCaptionToast(true);
    setTimeout(() => setCopiedCaptionToast(false), 3000);
  };

  const handleDownloadInstaCard = async () => {
    if (!cardPreviewRef.current) return;
    setIsExportingPng(true);
    try {
      const dataUrl = await toPng(cardPreviewRef.current, {
        pixelRatio: 3,
        cacheBust: true,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      const catSlug = selectedInstaCatId === 'all' ? 'quadro_geral' : selectedInstaCatId;
      a.download = `resultado_instagram_${catSlug}_${instaFormat}.png`;
      a.click();
    } catch (err) {
      console.error('Erro ao gerar PNG:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

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
          const maxDim = 900;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
          } else {
            if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const webpUrl = canvas.toDataURL('image/webp', 0.78);
            const finalUrl = webpUrl.startsWith('data:image/webp') ? webpUrl : canvas.toDataURL('image/jpeg', 0.78);
            setUrlFoto(finalUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCadastrarCarro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setCadastroMsg(null);

    try {
      const anoNum = ano.trim() ? parseInt(ano, 10) : 2000;
      const alturaNum = alturaMm.trim() ? parseInt(alturaMm, 10) : undefined;
      const kmNum = kmRodado.trim() ? parseFloat(kmRodado.replace(',', '.')) : undefined;
      const pessoasNum = pessoasEquipe.trim() ? parseInt(pessoasEquipe, 10) : undefined;
      const equipeSelected = equipes.find((eq) => eq.id === equipeId);
      const equipeName = equipeSelected?.nome || undefined;

      await cadastrarCarro(
        numeroInscricao.trim() || getNextSuggestedInscricao(),
        modelo.trim() || 'Veículo Inscrito',
        anoNum,
        alturaNum,
        nomeDono.trim() || 'Participante',
        telefoneDono || undefined,
        urlFoto || undefined,
        equipeName,
        kmNum,
        genero,
        categoriasIds,
        pessoasNum
      );

      setCadastroMsg({ type: 'success', text: 'Veículo cadastrado com sucesso!' });
      setIsManualInscricao(false);
      setModelo('');
      setAno('');
      setAlturaMm('');
      setNomeDono('');
      setGenero('M');
      setTelefoneDono('');
      setUrlFoto('');
      setEquipeId('');
      setKmRodado('');
      setPessoasEquipe('');
      setCategoriasIds([]);
      setTimeout(() => setCadastroMsg(null), 3000);
    } catch (err: any) {
      setCadastroMsg({ type: 'error', text: err.message || 'Erro ao cadastrar veículo.' });
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
    setEditUrlFoto('');
    if (fetchFotoCarro) {
      fetchFotoCarro(carro.id).then((foto) => setEditUrlFoto(foto || ''));
    }
    setEditKmRodado(carro.km_rodado ? String(carro.km_rodado) : '');
    setEditPessoasEquipe(carro.pessoas_equipe ? String(carro.pessoas_equipe) : '');
    setEditCategoriasIds(carro.categorias_ids || []);
    setEditMsg(null);
    setShowNovaEquipeEdit(false);
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
          const maxDim = 900;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) { height = Math.round((height * maxDim) / width); width = maxDim; }
          } else {
            if (height > maxDim) { width = Math.round((width * maxDim) / height); height = maxDim; }
          }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const webpUrl = canvas.toDataURL('image/webp', 0.78);
            const finalUrl = webpUrl.startsWith('data:image/webp') ? webpUrl : canvas.toDataURL('image/jpeg', 0.78);
            setEditUrlFoto(finalUrl);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
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
    { id: 'instagrammable', icon: <Share2 size={16} />, label: 'Resultados Instagram' },
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
          background: '#0D1117',
          borderRight: isSidebarOpen ? '1px solid #1E293B' : 'none',
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
          <div style={{ padding: '16px 16px', borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: '#141A24', border: '1px solid rgba(0,153,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                <img src="/Logo-evento.jpeg?v=2" alt="Los Felas" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#0099FF', lineHeight: 1.1 }}>
                  Painel
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Organizador
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
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
                onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.color = '#94A3B8'; }}
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
            borderTop: '1px solid #1E293B',
            padding: '14px 16px',
            color: '#94A3B8',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(180,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-16" style={{ background: '#0D1117', borderBottom: '1px solid #1E293B', padding: '16px 24px' }}>

            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-16 w-full md:w-auto">

              <div className="flex items-center justify-between w-full md:w-auto">
                {/* Botão Sandwich Menu */}
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  style={{
                    background: isSidebarOpen ? 'rgba(0,153,255,0.15)' : '#141A24',
                    border: '1px solid rgba(0,153,255,0.4)',
                    color: '#0099FF',
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
                    style={{ background: '#141A24', border: '1px solid #1E293B', padding: '6px', cursor: 'pointer', display: 'flex', color: '#0099FF', flexShrink: 0 }}
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
                    color: '#0099FF',
                    background: 'rgba(0,153,255,0.1)',
                    border: '1px solid rgba(0,153,255,0.3)',
                    padding: '3px 10px',
                    whiteSpace: 'nowrap',
                  }}>
                    Evento Ativo
                  </span>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>
                    {formatarDataBR(evento?.data)}
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
                      className="btn-bmw"
                      style={{ height: 36, padding: '0 12px', fontSize: 13 }}
                    >
                      <Check size={14} /> Salvar
                    </button>
                    <button
                      onClick={() => setIsEditingEventName(false)}
                      style={{ background: '#141A24', color: '#FFFFFF', border: '1px solid #1E293B', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif" }}
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
                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 4, display: 'flex', transition: 'color 0.12s', flexShrink: 0 }}
                        title="Editar Nome do Evento"
                        onMouseEnter={e => e.currentTarget.style.color = '#0099FF'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
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
                style={{ background: '#141A24', border: '1px solid #1E293B', padding: '6px', cursor: 'pointer', display: 'flex', color: '#0099FF', flexShrink: 0 }}
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
                <div style={{ background: '#0D1117', border: '1px solid #1E293B', borderLeft: '3px solid #0099FF', padding: '24px' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 8px 0' }}>
                    Controle Geral da Votação
                  </h3>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#94A3B8', margin: '0 0 20px 0', lineHeight: 1.6, maxWidth: 520 }}>
                    Alterne o status em tempo real. Fechar a votação bloqueia instantaneamente novas interações pelo celular dos visitantes.
                  </p>
                  <button
                    onClick={toggleStatusVotacao}
                    style={{
                      background: votacaoAberta ? '#b91c1c' : '#0099FF',
                      color: '#FFFFFF',
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
                    onMouseEnter={e => { e.currentTarget.style.background = votacaoAberta ? '#991b1b' : '#007acc'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = votacaoAberta ? '#b91c1c' : '#0099FF'; }}
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
                    { label: 'Frota Inscrita', value: carros.length, icon: <Car size={24} color="#0099FF" /> },
                    { label: 'Categorias', value: categorias.length, icon: <Trophy size={24} color="#0099FF" /> },
                    { label: 'Usuários Cadastrados', value: totalUsuarios, icon: <Users size={24} color="#0099FF" /> },
                    { label: 'Votos Computados', value: totalVotos, icon: <BarChart3 size={24} color="#0099FF" /> },
                    { label: 'Status da Votação', value: votacaoAberta ? 'ABERTO' : 'FECHADO', icon: <Award size={24} color="#0099FF" /> },
                  ].map((m) => (
                    <div key={m.label} style={S.metricCard}>
                      <div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#94A3B8', marginBottom: 8 }}>
                          {m.label}
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                          {m.value}
                        </div>
                      </div>
                      <div style={{ background: '#141A24', border: '1px solid #1E293B', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                  {categorias.filter((c) => c.tipo === 'popular' && !c.oculta).map((cat) => {
                    const votosCat = resultados[cat.id] || [];
                    const totalVotosCat = votosCat.reduce((sum, item) => sum + item.votosCount, 0);

                    return (
                      <div key={cat.id} style={{ background: '#0D1117', border: '1px solid #1E293B', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E293B', paddingBottom: 12, marginBottom: 16 }}>
                          <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0099FF', margin: 0 }}>
                            {cat.nome}
                          </h4>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#94A3B8', background: '#141A24', border: '1px solid #1E293B', padding: '4px 10px' }}>
                            {totalVotosCat} votos
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {votosCat.length === 0 ? (
                            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '24px 0' }}>
                              Nenhum voto registrado.
                            </div>
                          ) : (
                            votosCat.slice(0, 3).map((item, index) => {
                              const carro = carros.find((c) => c.id === item.carroId);
                              const percent = totalVotosCat > 0 ? (item.votosCount / totalVotosCat) * 100 : 0;
                              const medalColors = [
                                { bg: '#0099FF', text: '#FFFFFF', label: '1º' },
                                { bg: '#64748B', text: '#FFFFFF', label: '2º' },
                                { bg: '#E51937', text: '#FFFFFF', label: '3º' },
                              ];
                              const medal = medalColors[index];

                              return (
                                <div key={item.carroId} style={{ background: '#000000', border: '1px solid #1E293B', padding: '12px 14px' }}>
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
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#0099FF' }}>
                                      {item.votosCount} ({percent.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <div style={{ width: '100%', height: 3, background: '#141A24', overflow: 'hidden' }}>
                                    <div style={{ width: `${percent}%`, height: '100%', background: '#0099FF', transition: 'width 0.5s ease' }} />
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

                {/* Seção 2: Destaques Técnicos (Avaliação Interna) */}
                <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '24px 0 0 0' }}>
                  Destaques Técnicos (Avaliação Interna)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                  {/* Carro Mais Antigo */}
                  {(() => {
                    const antigo = carros.filter(c => c.ano && Number(c.ano) > 1900).sort((a, b) => Number(a.ano) - Number(b.ano))[0];
                    return (
                      <div style={{ background: '#0D1117', border: '1px solid #1E293B', borderTop: '2px solid #0099FF', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={16} color="#0099FF" />
                            <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: '#0099FF', margin: 0 }}>
                              Carro Mais Antigo
                            </h4>
                          </div>
                          <span style={{ background: '#0099FF', color: '#FFFFFF', padding: '2px 8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                            1º LUGAR
                          </span>
                        </div>
                        {antigo ? (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 56, height: 56, background: '#000000', border: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                              {antigo.url_foto ? (
                                <img src={antigo.url_foto} alt={antigo.modelo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Car size={24} color="#94A3B8" />
                              )}
                            </div>
                            <div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#FFFFFF' }}>
                                {antigo.modelo} ({antigo.numero_inscricao})
                              </div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#38BDF8', fontWeight: 700 }}>
                                Fabricado em {antigo.ano}
                              </div>
                              {antigo.nome_dono && antigo.nome_dono !== 'Não informado' && (
                                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                  Dono: {antigo.nome_dono}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#94A3B8' }}>Sem dados suficientes</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Destaque Jeep (Altura) */}
                  {(() => {
                    const jeepLider = carros
                      .filter(c => c && c.altura_mm !== undefined && c.altura_mm !== null && Number(c.altura_mm) > 0)
                      .sort((a, b) => Number(b.altura_mm) - Number(a.altura_mm))[0];
                    return (
                      <div style={{ background: '#0D1117', border: '1px solid #1E293B', borderTop: '2px solid #0099FF', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Ruler size={16} color="#0099FF" />
                            <h4 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: '#0099FF', margin: 0 }}>
                              Destaque Jeep (Altura)
                            </h4>
                          </div>
                          <span style={{ background: '#0099FF', color: '#FFFFFF', padding: '2px 8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                            1º LUGAR
                          </span>
                        </div>
                        {jeepLider ? (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ width: 56, height: 56, background: '#000000', border: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                              {jeepLider.url_foto ? (
                                <img src={jeepLider.url_foto} alt={jeepLider.modelo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <Car size={24} color="#94A3B8" />
                              )}
                            </div>
                            <div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, color: '#FFFFFF' }}>
                                {jeepLider.modelo} ({jeepLider.numero_inscricao})
                              </div>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, color: '#38BDF8', fontWeight: 700 }}>
                                📏 {jeepLider.altura_mm} mm ALTURA
                              </div>
                              {jeepLider.nome_dono && jeepLider.nome_dono !== 'Não informado' && (
                                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                                  Dono: {jeepLider.nome_dono}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#94A3B8' }}>Sem dados suficientes</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* ══════ TAB: RESULTADOS INSTAGRAMMÁVEIS ══════ */}
            {activeTab === 'instagrammable' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Cabeçalho e Controles */}
                <div style={{ background: '#0D1117', border: '1px solid #1E293B', borderLeft: '3px solid #0099FF', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                    <div>
                      <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Share2 size={22} color="#0099FF" />
                        Gerador de Cards Instagramáveis
                      </h3>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#94A3B8', margin: '4px 0 0 0' }}>
                        Gere layouts visuais dos campeões em alta resolução prontos para divulgar no Feed ou Stories.
                      </p>
                    </div>

                    {/* Botões de Ação Principais */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        onClick={handleCopyCaption}
                        style={{
                          background: '#141A24',
                          color: '#FFFFFF',
                          border: '1px solid #1E293B',
                          padding: '0 16px',
                          height: 44,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontFamily: "'Barlow Condensed', sans-serif",
                          fontWeight: 700,
                          fontSize: 13,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          transition: 'border-color 0.15s ease, color 0.15s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#0099FF'; e.currentTarget.style.color = '#0099FF'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#1E293B'; e.currentTarget.style.color = '#FFFFFF'; }}
                      >
                        <Copy size={16} />
                        <span>Copiar Legenda Pronta</span>
                      </button>

                      <button
                        onClick={handleDownloadInstaCard}
                        disabled={isExportingPng}
                        className="btn-bmw"
                        style={{
                          height: 44,
                          padding: '0 20px',
                          fontSize: 14,
                          opacity: isExportingPng ? 0.7 : 1,
                        }}
                      >
                        <Download size={16} />
                        <span>{isExportingPng ? 'Gerando PNG...' : 'Baixar Imagem PNG'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Toast Feedback Copiado */}
                  {copiedCaptionToast && (
                    <div style={{ background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.4)', padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Check size={16} color="#4ade80" />
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#4ade80', fontWeight: 600 }}>
                        Legenda formatada para o Instagram copiada para a área de transferência!
                      </span>
                    </div>
                  )}

                  {/* Barra de Seleção de Formato, Tema e Categoria */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, borderTop: '1px solid #1E293B', paddingTop: 16 }}>

                    {/* Seleção de Categoria */}
                    <div>
                      <label style={S.label}>Categoria Selecionada</label>
                      <select
                        value={selectedInstaCatId}
                        onChange={(e) => setSelectedInstaCatId(e.target.value)}
                        style={{ ...S.input, cursor: 'pointer' }}
                      >
                        <option value="all">🏆 QUADRO GERAL (TODOS OS CAMPEÕES)</option>
                        <optgroup label="Votação Popular">
                          {categorias.filter(c => c.tipo === 'popular' && !c.oculta).map(cat => (
                            <option key={cat.id} value={cat.id}>🥇 {cat.nome.toUpperCase()}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Destaques Técnicos">
                          <option value="tech_antigo">👴 CARRO MAIS ANTIGO</option>
                          <option value="tech_jeep">🚙 DESTAQUE JEEP (ALTURA)</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Formato do Card */}
                    <div>
                      <label style={S.label}>Formato de Exibição</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setInstaFormat('story')}
                          style={{
                            flex: 1,
                            height: 40,
                            background: instaFormat === 'story' ? '#0099FF' : '#000000',
                            color: instaFormat === 'story' ? '#FFFFFF' : '#94A3B8',
                            border: '1px solid #1E293B',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700,
                            fontSize: 13,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          📱 Story (9:16)
                        </button>
                        <button
                          onClick={() => setInstaFormat('feed')}
                          style={{
                            flex: 1,
                            height: 40,
                            background: instaFormat === 'feed' ? '#0099FF' : '#000000',
                            color: instaFormat === 'feed' ? '#FFFFFF' : '#94A3B8',
                            border: '1px solid #1E293B',
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontWeight: 700,
                            fontSize: 13,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          🖼️ Feed (1:1)
                        </button>
                      </div>
                    </div>

                    {/* Estilo / Tema Visual */}
                    <div>
                      <label style={S.label}>Tema Visual</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { id: 'gold', label: '🔵 Yas Marina', color: '#0099FF' },
                          { id: 'dark', label: '⬛ Carbon', color: '#FFFFFF' },
                          { id: 'red', label: '🔴 M Crimson', color: '#E51937' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setInstaTheme(t.id as any)}
                            style={{
                              flex: 1,
                              height: 40,
                              background: instaTheme === t.id ? t.color : '#000000',
                              color: instaTheme === t.id ? (t.id === 'dark' ? '#000000' : '#FFFFFF') : '#94A3B8',
                              border: `1px solid ${instaTheme === t.id ? t.color : '#1E293B'}`,
                              fontFamily: "'Barlow Condensed', sans-serif",
                              fontWeight: 700,
                              fontSize: 12,
                              textTransform: 'uppercase',
                              cursor: 'pointer',
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {/* ===== PRÉ-VISUALIZAÇÃO DO CARD INSTAGRAMÁVEL ===== */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color="#0099FF" />
                    <span>Pré-Visualização em Tempo Real ({instaFormat === 'story' ? 'Story 9:16' : 'Feed 1:1'})</span>
                  </div>

                  {/* Card Container Preview */}
                  <div
                    ref={cardPreviewRef}
                    style={{
                      width: '100%',
                      maxWidth: instaFormat === 'story' ? 380 : 460,
                      aspectRatio: instaFormat === 'story' ? '9/16' : '1/1',
                      background: instaTheme === 'gold'
                        ? 'linear-gradient(180deg, #0C2340 0%, #050505 100%)'
                        : instaTheme === 'dark'
                          ? 'linear-gradient(180deg, #262626 0%, #090909 100%)'
                          : 'linear-gradient(180deg, #3b0a0a 0%, #050505 100%)',
                      border: `2px solid ${instaTheme === 'gold' ? '#0099FF' : instaTheme === 'red' ? '#E51937' : '#FFFFFF'}`,
                      borderRadius: 4,
                      boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                      padding: instaFormat === 'story' ? '24px 20px' : '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Moldura Interna */}
                    <div style={{
                      position: 'absolute',
                      inset: 8,
                      border: `1px solid ${instaTheme === 'gold' ? 'rgba(0,153,255,0.3)' : instaTheme === 'red' ? 'rgba(229,25,55,0.3)' : 'rgba(255,255,255,0.2)'}`,
                      pointerEvents: 'none',
                    }} />

                    {/* Topo do Card */}
                    <div style={{ textAlign: 'center', zIndex: 2 }}>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        color: instaTheme === 'gold' ? '#0099FF' : instaTheme === 'red' ? '#E51937' : '#FFFFFF',
                        marginBottom: 4,
                      }}>
                        🏆 RESULTADO OFICIAL 🏆
                      </div>

                      <h2 style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontWeight: 900,
                        fontSize: instaFormat === 'story' ? 22 : 18,
                        textTransform: 'uppercase',
                        color: '#FFFFFF',
                        margin: 0,
                        lineHeight: 1.1,
                      }}>
                        {evento?.nome || 'ENCONTRO LOS FELAS'}
                      </h2>

                      {evento?.data && (
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#94A3B8', letterSpacing: '0.12em', marginTop: 4 }}>
                          {formatarDataBR(evento.data)}
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 }}>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#0099FF', letterSpacing: '0.08em', background: 'rgba(0,153,255,0.12)', border: '1px solid rgba(0,153,255,0.3)', padding: '2px 8px', borderRadius: 2, whiteSpace: 'nowrap' }}>
                          🚗 {carros.length} VEÍCULOS
                        </span>
                        {totalUsuarios > 0 && (
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, color: '#4ade80', letterSpacing: '0.08em', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', padding: '2px 8px', borderRadius: 2, whiteSpace: 'nowrap' }}>
                            👥 {totalUsuarios} PARTICIPANTES
                          </span>
                        )}
                      </div>

                      <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.15)', margin: '10px auto' }} />
                    </div>

                    {/* Conteúdo Central */}
                    {selectedInstaCatId === 'all' ? (
                      (() => {
                        const winners = getAllCategoryWinners();
                        const isFew = winners.length <= 4;
                        return (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: isFew ? 12 : 8,
                            zIndex: 2,
                            flex: 1,
                            justifyContent: 'center',
                            overflowY: 'hidden',
                          }}>
                            {winners.map((item) => (
                              <div
                                key={item.id}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  padding: isFew ? '8px 12px' : '6px 10px',
                                  borderRadius: 2,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                }}
                              >
                                <div style={{
                                  width: isFew ? 44 : 36,
                                  height: isFew ? 44 : 36,
                                  background: '#000000',
                                  border: `1px solid ${instaTheme === 'gold' ? '#0099FF' : '#475569'}`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  overflow: 'hidden',
                                }}>
                                  {item.carro?.url_foto ? (
                                    <img
                                      src={item.carro.url_foto}
                                      alt={item.carro.modelo}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: isFew ? 20 : 16 }}>{item.icone || '🥇'}</span>
                                  )}
                                </div>

                                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#0099FF', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.icone || '🥇'} {item.tituloCategoria}
                                  </div>
                                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#FFFFFF', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {item.carro ? `${item.carro.modelo} (${item.carro.numero_inscricao || `#${item.carro.ano}`})` : 'Sem vencedor registrado'}
                                  </div>
                                  {item.carro?.nome_dono && item.carro.nome_dono !== 'Não informado' && (
                                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      Dono: {item.carro.nome_dono} {item.carro.equipe ? `• ${item.carro.equipe}` : ''}
                                    </div>
                                  )}
                                </div>

                                <div style={{
                                  background: 'rgba(0,153,255,0.12)',
                                  border: '1px solid rgba(0,153,255,0.3)',
                                  padding: '3px 8px',
                                  borderRadius: 2,
                                  fontFamily: "'Barlow Condensed', sans-serif",
                                  fontSize: 11,
                                  color: '#0099FF',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                }}>
                                  {item.metricaLabel}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      (() => {
                        const data = getWinnerData(selectedInstaCatId);
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: instaFormat === 'story' ? 12 : 8, zIndex: 2, flex: 1, justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: instaTheme === 'gold' ? '#0099FF' : '#CCCCCC', letterSpacing: '0.14em', fontWeight: 700 }}>
                                [{data.tipoBadge}]
                              </span>
                              <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: instaFormat === 'story' ? 24 : 20, color: '#FFFFFF', textTransform: 'uppercase', margin: '2px 0 0 0', lineHeight: 1.1 }}>
                                {data.tituloCategoria}
                              </h3>
                            </div>

                            <div style={{
                              width: '100%',
                              height: instaFormat === 'story' ? 200 : 130,
                              background: '#0D1117',
                              border: `2px solid ${instaTheme === 'gold' ? '#0099FF' : instaTheme === 'red' ? '#E51937' : '#FFFFFF'}`,
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                              {data.carro?.url_foto ? (
                                <img
                                  src={data.carro.url_foto}
                                  alt={data.carro.modelo}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: '#94A3B8' }}>
                                  <Car size={36} color="#0099FF" />
                                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: '0.1em' }}>FOTO DO VEÍCULO</span>
                                </div>
                              )}

                              <div style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                background: '#0099FF',
                                color: '#FFFFFF',
                                padding: '3px 8px',
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 900,
                                fontSize: 10,
                                letterSpacing: '0.1em',
                              }}>
                                🥇 1º LUGAR
                              </div>
                            </div>

                            <div style={{ textAlign: 'center', width: '100%' }}>
                              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: instaFormat === 'story' ? 20 : 17, color: '#FFFFFF', textTransform: 'uppercase', lineHeight: 1.1 }}>
                                {data.carro ? `${data.carro.modelo} (${data.carro.numero_inscricao})` : 'Sem vencedor registrado'}
                              </div>

                              {data.carro?.nome_dono && data.carro.nome_dono !== 'Não informado' && (
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#CCCCCC', marginTop: 2 }}>
                                  Piloto: {data.carro.nome_dono}
                                </div>
                              )}

                              {data.carro?.equipe && (
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, color: '#94A3B8' }}>
                                  Equipe: {data.carro.equipe}
                                </div>
                              )}

                              <div style={{
                                marginTop: 6,
                                background: 'rgba(0,153,255,0.1)',
                                border: '1px solid rgba(0,153,255,0.3)',
                                padding: '4px 10px',
                                display: 'inline-block',
                                fontFamily: "'Barlow Condensed', sans-serif",
                                fontWeight: 800,
                                fontSize: 13,
                                color: '#0099FF',
                                letterSpacing: '0.06em',
                              }}>
                                ⚡ {data.metricaLabel}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {/* Rodapé do Card */}
                    <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, zIndex: 2 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#94A3B8', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span>Desenvolvido por</span>
                        <span style={{ color: '#0099FF', fontWeight: 700 }}>pedromachado.dev</span>
                      </span>
                    </div>

                  </div>
                </div>

              </div>
            )}

            {/* ══════ TAB: GERENCIAR VEÍCULOS ══════ */}
            {activeTab === 'carros' && (() => {
              const camposNecessarios = new Set<CampoRequerido>();
              categoriasIds.forEach((id) => {
                const cat = categorias.find((c) => c.id === id);
                if (cat) {
                  if (cat.campos_requeridos && cat.campos_requeridos.length > 0) {
                    cat.campos_requeridos.forEach((c) => camposNecessarios.add(c));
                  }
                  const nomeLower = cat.nome.toLowerCase();
                  if (nomeLower.includes('equipe')) camposNecessarios.add('equipe');
                  if (nomeLower.includes('rodagem') || nomeLower.includes('km')) camposNecessarios.add('km_rodado');
                  if (nomeLower.includes('masculino') || nomeLower.includes('feminino')) {
                    camposNecessarios.add('genero');
                    camposNecessarios.add('foto');
                  }
                }
              });
              const temCamposComplementares = camposNecessarios.size > 0;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                  {/* Form Cadastro */}
                  <div style={{ background: '#0D1117', border: '1px solid #1E293B', borderTop: '2px solid #0099FF', padding: '20px' }}>
                    <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 16, borderBottom: '1px solid #1E293B' }}>
                      <Plus size={16} color="#0099FF" />
                      Novo Veículo Inscrito
                    </h3>

                    <form onSubmit={handleCadastrarCarro} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                      {/* Inscrição */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <label style={S.label}>Inscrição (opcional)</label>
                          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, color: '#0099FF', letterSpacing: '0.1em' }}>
                            {isManualInscricao ? 'MANUAL' : 'AUTO'}
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="#024 (opcional)"
                          value={numeroInscricao}
                          onChange={(e) => { setNumeroInscricao(e.target.value); setIsManualInscricao(true); }}
                          style={S.input}
                          onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                          onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                        />
                      </div>

                      <div>
                        <label style={S.label}>Modelo (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: BMW 320i M Sport (opcional)"
                          value={modelo}
                          onChange={(e) => setModelo(e.target.value)}
                          style={S.input}
                          onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                          onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                        />
                      </div>

                      <div>
                        <label style={S.label}>Ano do Carro (opcional)</label>
                        <input
                          type="text"
                          placeholder="Ex: 2015 (opcional)"
                          value={ano}
                          onChange={(e) => setAno(e.target.value)}
                          style={S.input}
                          onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                          onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
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
                          onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                          onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                        />
                      </div>

                      {/* Foto */}
                      <div>
                        <label style={S.label}>Foto do Veículo (opcional)</label>
                        {urlFoto && (
                          <div style={{ position: 'relative', width: '100%', height: 100, overflow: 'hidden', marginBottom: 8, background: '#000000' }}>
                            <img src={urlFoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <button
                              type="button"
                              onClick={() => setUrlFoto('')}
                              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.85)', border: '1px solid #1E293B', color: '#FFFFFF', padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif" }}
                            >
                              Remover
                            </button>
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                          <button
                            type="button"
                            onClick={() => document.getElementById('camera-file-input')?.click()}
                            style={{ ...S.input, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', background: '#141A24', borderColor: '#1E293B' }}
                          >
                            <Camera size={15} color="#0099FF" />
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Tirar Foto
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => document.getElementById('gallery-file-input')?.click()}
                            style={{ ...S.input, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', background: '#141A24', borderColor: '#1E293B' }}
                          >
                            <ImageIcon size={15} color="#0099FF" />
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Galeria
                            </span>
                          </button>
                        </div>
                        <input id="camera-file-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleCameraCapture} />
                        <input id="gallery-file-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCameraCapture} />
                        <input
                          type="text"
                          placeholder="Ou cole uma URL..."
                          value={urlFoto.startsWith('data:image') ? '' : urlFoto}
                          onChange={(e) => setUrlFoto(e.target.value)}
                          style={{ ...S.input, height: 36 }}
                          onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                          onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                        />
                      </div>

                      {/* Categorias */}
                      <div>
                        <label style={{ ...S.label, marginBottom: 10 }}>Categorias que este veículo concorre</label>
                        {categorias.length === 0 ? (
                          <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#94A3B8' }}>Nenhuma categoria cadastrada.</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {categorias.map((cat) => (
                              <label
                                key={cat.id}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: categoriasIds.includes(cat.id) ? 'rgba(0,153,255,0.08)' : '#000000', border: `1px solid ${categoriasIds.includes(cat.id) ? 'rgba(0,153,255,0.4)' : '#1E293B'}`, transition: 'background 0.12s, border-color 0.12s' }}
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
                                  style={{ accentColor: '#0099FF', width: 15, height: 15, flexShrink: 0 }}
                                />
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: categoriasIds.includes(cat.id) ? '#0099FF' : '#FFFFFF', flex: 1 }}>
                                  {cat.nome}
                                </span>
                                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: cat.tipo === 'popular' ? '#0099FF' : '#38BDF8', background: cat.tipo === 'popular' ? 'rgba(0,153,255,0.1)' : 'rgba(56,189,248,0.1)', padding: '2px 6px', border: `1px solid ${cat.tipo === 'popular' ? 'rgba(0,153,255,0.3)' : 'rgba(56,189,248,0.3)'}`, flexShrink: 0 }}>
                                  {cat.tipo === 'popular' ? 'Popular' : 'Interna'}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Campos Complementares */}
                      {temCamposComplementares && (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 14,
                            borderTop: '1px solid rgba(0,153,255,0.25)',
                            paddingTop: 16,
                            animation: 'fadeSlideIn 0.3s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(0,153,255,0.2)' }} />
                            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#0099FF' }}>Dados Complementares</span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(0,153,255,0.2)' }} />
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
                                      style={{ accentColor: '#0099FF', width: '16px', height: '16px' }}
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
                                onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                                onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
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
                                    onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                                    onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
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
                                    onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                                    onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
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
                                    style={{ background: 'transparent', border: 'none', color: '#0099FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                                  >
                                    <UserPlus size={13} />
                                    {showNovaEquipe ? 'Cancelar' : 'Nova Equipe'}
                                  </button>
                                )}
                              </div>

                              {showNovaEquipe && (
                                <div style={{ background: '#000000', border: '1px solid rgba(0,153,255,0.3)', padding: '10px 12px', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    placeholder="Nome da equipe..."
                                    value={novaEquipeNome}
                                    onChange={(e) => setNovaEquipeNome(e.target.value)}
                                    style={{ ...S.input, height: 34, fontSize: 13, flex: 1 }}
                                    onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                                    onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCadastrarEquipe(); } }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCadastrarEquipe}
                                    disabled={submittingEquipe || !novaEquipeNome.trim()}
                                    className="btn-bmw"
                                    style={{ padding: '0 12px', height: 34, fontSize: 12, flexShrink: 0, opacity: submittingEquipe || !novaEquipeNome.trim() ? 0.5 : 1 }}
                                  >
                                    {submittingEquipe ? '...' : 'Salvar'}
                                  </button>
                                </div>
                              )}

                              <select
                                value={equipeId}
                                onChange={(e) => setEquipeId(e.target.value)}
                                style={{ ...S.input, colorScheme: 'dark' }}
                                onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                                onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                              >
                                <option value="">— Sem equipe —</option>
                                {equipes.map((eq) => (
                                  <option key={eq.id} value={eq.id}>{eq.nome}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Pessoas na equipe */}
                          {camposNecessarios.has('equipe') && (
                            <div>
                              <label style={S.label}>Pessoas uniformizadas na equipe (neste carro)</label>
                              <input
                                type="number"
                                min="0"
                                placeholder="Ex: 5"
                                value={pessoasEquipe}
                                onChange={(e) => setPessoasEquipe(e.target.value)}
                                style={{ ...S.input, height: 36 }}
                                onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                                onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                              />
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
                        className="btn-bmw"
                        style={{ width: '100%', height: 44, fontSize: 14, marginTop: 4 }}
                      >
                        {submitting ? 'Adicionando...' : 'Cadastrar Veículo'}
                      </button>
                    </form>
                  </div>

                  {/* Lista / Contador */}
                  <div style={{ background: '#0D1117', border: '1px solid #1E293B', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid #1E293B' }}>
                      <div>
                        <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: 0 }}>
                          Veículos Cadastrados
                        </h3>
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#94A3B8' }}>
                          Imagens desativadas para economizar dados
                        </span>
                      </div>
                      <div style={{ background: '#0099FF', color: '#FFFFFF', padding: '6px 14px', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 18, borderRadius: 0 }}>
                        {carros.length} {carros.length === 1 ? 'Inscrito' : 'Inscritos'}
                      </div>
                    </div>

                    <div style={{ maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }} className="no-scrollbar">
                      {carros.length === 0 ? (
                        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '32px 0', margin: 0 }}>
                          Nenhum veículo cadastrado ainda.
                        </p>
                      ) : (
                        carros.map((carro) => (
                          <div
                            key={carro.id}
                            style={{ background: '#000000', border: '1px solid #1E293B', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                              <span style={{ background: '#0099FF', color: '#FFFFFF', padding: '2px 8px', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {carro.numero_inscricao}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {carro.modelo || 'Sem modelo informado'}
                                </div>
                                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#94A3B8' }}>
                                  {carro.nome_dono}{carro.equipe ? ` · ${carro.equipe}` : ''}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              {editarCarro && (
                                <button
                                  onClick={() => openEditModal(carro)}
                                  style={{ background: 'rgba(0,153,255,0.1)', border: '1px solid rgba(0,153,255,0.3)', color: '#0099FF', padding: '6px 8px', cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                                  title="Editar"
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,153,255,0.25)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,153,255,0.1)'; }}
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (confirm(`Excluir "${carro.modelo}" (${carro.numero_inscricao})?`)) {
                                    await deletarCarro(carro.id);
                                  }
                                }}
                                style={{ background: 'rgba(180,0,0,0.1)', border: '1px solid rgba(200,50,50,0.3)', color: '#ef4444', padding: '6px 8px', cursor: 'pointer', display: 'flex', transition: 'background 0.12s' }}
                                title="Excluir"
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.25)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(180,0,0,0.1)'; }}
                              >
                                <Trash2 size={14} />
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
                <div style={{ background: '#0D1117', border: '1px solid #1E293B', borderTop: '2px solid #0099FF', padding: '20px', height: 'fit-content' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 16, borderBottom: '1px solid #1E293B' }}>
                    <Tag size={16} color="#0099FF" />
                    Nova Categoria
                  </h3>

                  <form onSubmit={handleAddCategoria} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={S.label}>Nome da Categoria</label>
                      <input
                        type="text"
                        placeholder="Ex: Melhor Som, Destaque da Noite..."
                        value={novaCatNome}
                        onChange={(e) => setNovaCatNome(e.target.value)}
                        style={S.input}
                        onFocus={e => { e.target.style.borderColor = '#0099FF'; }}
                        onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
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

                    {/* Campos que esta categoria exige */}
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
                              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '7px 10px', background: ativo ? 'rgba(0,153,255,0.08)' : '#000000', border: `1px solid ${ativo ? 'rgba(0,153,255,0.35)' : '#1E293B'}`, transition: 'background 0.12s, border-color 0.12s' }}
                            >
                              <input
                                type="checkbox"
                                checked={ativo}
                                onChange={(e) => {
                                  if (e.target.checked) setNovaCatCampos((p) => [...p, opt.value]);
                                  else setNovaCatCampos((p) => p.filter((c) => c !== opt.value));
                                }}
                                style={{ accentColor: '#0099FF', width: 14, height: 14, flexShrink: 0 }}
                              />
                              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: ativo ? '#0099FF' : '#FFFFFF' }}>
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
                      className="btn-bmw"
                      style={{ width: '100%', height: 44, fontSize: 14, marginTop: 4 }}
                    >
                      Cadastrar Categoria
                    </button>
                  </form>
                </div>

                {/* Lista de Categorias */}
                <div style={{ background: '#0D1117', border: '1px solid #1E293B', padding: '20px' }}>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 16px 0', paddingBottom: 14, borderBottom: '1px solid #1E293B' }}>
                    Categorias Cadastradas ({categorias.length})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {categorias.length === 0 ? (
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: '32px 0', margin: 0 }}>
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
                              border: `1px solid ${cat.oculta ? '#334155' : '#1E293B'}`,
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
                                    className="btn-bmw"
                                    style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={() => setCatEditingId(null)}
                                    style={{ background: '#141A24', color: '#FFFFFF', border: '1px solid #1E293B', padding: '6px 10px', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12 }}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', color: cat.oculta ? '#94A3B8' : '#FFFFFF' }}>
                                      {cat.nome}
                                    </span>
                                    {editarCategoria && (
                                      <button
                                        onClick={() => {
                                          setCatEditingId(cat.id);
                                          setCatTempName(cat.nome);
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2, display: 'flex' }}
                                        title="Renomear Categoria"
                                        onMouseEnter={e => e.currentTarget.style.color = '#0099FF'}
                                        onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
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
                                      color: cat.tipo === 'popular' ? '#0099FF' : '#38BDF8',
                                      background: cat.tipo === 'popular' ? 'rgba(0,153,255,0.1)' : 'rgba(56,189,248,0.1)',
                                      padding: '2px 6px',
                                      border: `1px solid ${cat.tipo === 'popular' ? 'rgba(0,153,255,0.3)' : 'rgba(56,189,248,0.3)'}`,
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

                            {/* Ações */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              {toggleOcultarCategoria && (
                                <button
                                  onClick={() => toggleOcultarCategoria(cat.id)}
                                  style={{
                                    background: cat.oculta ? 'rgba(0,153,255,0.1)' : '#141A24',
                                    border: `1px solid ${cat.oculta ? 'rgba(0,153,255,0.3)' : '#1E293B'}`,
                                    color: cat.oculta ? '#0099FF' : '#94A3B8',
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
              <div style={{ background: '#0D1117', border: '1px solid #1E293B', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h3 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 20, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF', margin: '0 0 6px 0' }}>
                    Validação Interna da Frota
                  </h3>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#94A3B8', margin: 0 }}>
                    Apurador automático para troféus de Carro mais antigo e Destaque Jeep (Altura).
                  </p>
                </div>

                {/* Sub-tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #1E293B', gap: 0 }}>
                  {[
                    { id: 'ano' as const, label: 'Carro mais antigo' },
                    { id: 'altura' as const, label: 'Destaque Jeep (Altura)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setValTab(t.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: valTab === t.id ? '2px solid #0099FF' : '2px solid transparent',
                        color: valTab === t.id ? '#0099FF' : '#94A3B8',
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
                      onMouseLeave={e => { if (valTab !== t.id) e.currentTarget.style.color = '#94A3B8'; }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tabelas */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #1E293B' }}>
                        {['Posição', 'Inscrição', 'Modelo', 'Dono(a)',
                          valTab === 'ano' ? 'Ano' : 'Altura (mm)'].map((h) => (
                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8', fontSize: 11 }}>
                              {h}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      {valTab === 'ano' && carrosValidadosAntigos.map((carro, index) => (
                        <tr key={carro.id} style={{ borderBottom: '1px solid #141A24', background: index === 0 ? 'rgba(0,153,255,0.08)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', color: index === 0 ? '#0099FF' : '#94A3B8', fontWeight: 700 }}>
                            {index === 0 ? '🏆 1º' : `${index + 1}º`}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#0099FF', fontWeight: 700 }}>{carro.numero_inscricao}</td>
                          <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{carro.modelo}</td>
                          <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{carro.nome_dono}</td>
                          <td style={{ padding: '12px 16px', color: index === 0 ? '#0099FF' : '#FFFFFF', fontWeight: 700 }}>{carro.ano}</td>
                        </tr>
                      ))}

                      {valTab === 'altura' && [...carros].sort((a, b) => (Number(b.altura_mm) || 0) - (Number(a.altura_mm) || 0)).map((carro, index) => {
                        const isFirst = index === 0 && (carro.altura_mm || 0) > 0;
                        return (
                          <tr key={carro.id} style={{ borderBottom: '1px solid #141A24', background: isFirst ? 'rgba(0,153,255,0.08)' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', color: isFirst ? '#0099FF' : '#94A3B8', fontWeight: 700 }}>
                              {isFirst ? '🏆 1º' : `${index + 1}º`}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#0099FF', fontWeight: 700 }}>{carro.numero_inscricao}</td>
                            <td style={{ padding: '12px 16px', color: '#FFFFFF' }}>{carro.modelo}</td>
                            <td style={{ padding: '12px 16px', color: '#94A3B8' }}>{carro.nome_dono}</td>
                            <td style={{ padding: '12px 16px', color: isFirst ? '#0099FF' : '#FFFFFF', fontWeight: 700 }}>{carro.altura_mm || 0} mm</td>
                          </tr>
                        );
                      })}
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
          <div style={{ position: 'relative', zIndex: 1, background: '#0D1117', borderLeft: '1px solid #1E293B', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ background: '#0D1117', borderBottom: '2px solid #0099FF', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Edit2 size={16} color="#0099FF" />
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#FFFFFF' }}>
                  Editar Veículo
                </span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, color: '#0099FF', background: 'rgba(0,153,255,0.1)', border: '1px solid rgba(0,153,255,0.3)', padding: '2px 10px' }}>
                  {editingCarro.numero_inscricao}
                </span>
              </div>
              <button onClick={closeEditModal} style={{ background: '#141A24', border: '1px solid #1E293B', color: '#94A3B8', padding: 6, cursor: 'pointer', display: 'flex' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'} onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                <X size={18} />
              </button>
            </div>

            {/* Foto preview */}
            {editUrlFoto && (
              <div style={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                <img src={editUrlFoto} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,17,23,0.8) 0%, transparent 60%)' }} />
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleEditarCarro} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 20, flex: 1 }}>

              {/* Inscrição */}
              <div>
                <label style={S.label}>Inscrição</label>
                <input type="text" value={editNumeroInscricao} onChange={e => setEditNumeroInscricao(e.target.value)}
                  style={S.input} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
              </div>

              {/* Modelo + Ano */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={S.label}>Modelo</label>
                  <input type="text" value={editModelo} onChange={e => setEditModelo(e.target.value)}
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
                </div>
                <div>
                  <label style={S.label}>Ano</label>
                  <input type="text" value={editAno} onChange={e => setEditAno(e.target.value)}
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
                </div>
              </div>

              {/* Nome dono + Gênero */}
              <div>
                <label style={S.label}>Nome do Dono(a)</label>
                <input type="text" value={editNomeDono} onChange={e => setEditNomeDono(e.target.value)}
                  style={S.input} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
              </div>
              <div>
                <label style={S.label}>Gênero do Dono(a)</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                  {[{ label: 'Masculino', value: 'M' }, { label: 'Feminino', value: 'F' }].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FFF', fontSize: 14, cursor: 'pointer' }}>
                      <input type="radio" name="editGenero" value={opt.value} checked={editGenero === opt.value}
                        onChange={e => setEditGenero(e.target.value as 'M' | 'F')} style={{ accentColor: '#0099FF', width: 16, height: 16 }} />
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
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
                </div>
                <div>
                  <label style={S.label}>Altura mm</label>
                  <input type="text" value={editAlturaMm} onChange={e => setEditAlturaMm(e.target.value)} placeholder="Ex: 50"
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
                </div>
                <div>
                  <label style={S.label}>Km Rodados</label>
                  <input type="text" value={editKmRodado} onChange={e => setEditKmRodado(e.target.value)} placeholder="Ex: 150"
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
                </div>
              </div>

              {/* Equipe */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={S.label}>Equipe</label>
                  {cadastrarEquipe && (
                    <button type="button" onClick={() => setShowNovaEquipeEdit(!showNovaEquipeEdit)}
                      style={{ background: 'transparent', border: 'none', color: '#0099FF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      <UserPlus size={13} />{showNovaEquipeEdit ? 'Cancelar' : 'Nova Equipe'}
                    </button>
                  )}
                </div>
                {showNovaEquipeEdit && (
                  <div style={{ background: '#000000', border: '1px solid rgba(0,153,255,0.3)', padding: '10px 12px', marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input type="text" placeholder="Nome da equipe..." value={novaEquipeNomeEdit} onChange={e => setNovaEquipeNomeEdit(e.target.value)}
                      style={{ ...S.input, height: 34, fontSize: 13, flex: 1 }}
                      onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCadastrarEquipeEdit(); } }} />
                    <button type="button" onClick={handleCadastrarEquipeEdit} disabled={submittingEquipeEdit || !novaEquipeNomeEdit.trim()}
                      className="btn-bmw"
                      style={{ padding: '0 12px', height: 34, fontSize: 12, flexShrink: 0, opacity: submittingEquipeEdit || !novaEquipeNomeEdit.trim() ? 0.5 : 1 }}>
                      {submittingEquipeEdit ? '...' : 'Salvar'}
                    </button>
                  </div>
                )}
                <select value={editEquipeId} onChange={e => setEditEquipeId(e.target.value)}
                  style={{ ...S.input, colorScheme: 'dark' }}
                  onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }}>
                  <option value="">— Sem equipe —</option>
                  {equipes.map(eq => <option key={eq.id} value={eq.id}>{eq.nome}</option>)}
                </select>
              </div>

              {/* Pessoas na equipe */}
              {editEquipeId && (
                <div>
                  <label style={S.label}>Pessoas uniformizadas na equipe (neste carro)</label>
                  <input type="number" min="0" placeholder="Ex: 5" value={editPessoasEquipe} onChange={e => setEditPessoasEquipe(e.target.value)}
                    style={{ ...S.input, height: 36 }} onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
                </div>
              )}

              {/* Foto */}
              <div>
                <label style={S.label}>Foto do Veículo</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                  <button type="button" onClick={() => document.getElementById('camera-edit-input')?.click()}
                    style={{ ...S.input, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', background: '#141A24', borderColor: '#1E293B' }}>
                    <Camera size={15} color="#0099FF" />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tirar Foto</span>
                  </button>
                  <button type="button" onClick={() => document.getElementById('gallery-edit-input')?.click()}
                    style={{ ...S.input, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', background: '#141A24', borderColor: '#1E293B' }}>
                    <ImageIcon size={15} color="#0099FF" />
                    <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Galeria</span>
                  </button>
                </div>
                <input id="camera-edit-input" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleCameraEditCapture} />
                <input id="gallery-edit-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCameraEditCapture} />
                <input type="text" placeholder="Ou cole uma URL..." value={editUrlFoto.startsWith('data:image') ? '' : editUrlFoto}
                  onChange={e => setEditUrlFoto(e.target.value)} style={{ ...S.input, height: 36 }}
                  onFocus={e => { e.target.style.borderColor = '#0099FF'; }} onBlur={e => { e.target.style.borderColor = '#1E293B'; }} />
              </div>

              {/* Categorias */}
              <div>
                <label style={{ ...S.label, marginBottom: 10 }}>Categorias que este veículo concorre</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categorias.map(cat => (
                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', background: editCategoriasIds.includes(cat.id) ? 'rgba(0,153,255,0.08)' : '#000000', border: `1px solid ${editCategoriasIds.includes(cat.id) ? 'rgba(0,153,255,0.4)' : '#1E293B'}`, transition: 'background 0.12s, border-color 0.12s' }}>
                      <input type="checkbox" checked={editCategoriasIds.includes(cat.id)}
                        onChange={e => {
                          if (e.target.checked) setEditCategoriasIds(prev => [...prev, cat.id]);
                          else setEditCategoriasIds(prev => prev.filter(id => id !== cat.id));
                        }}
                        style={{ accentColor: '#0099FF', width: 15, height: 15, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 600, color: editCategoriasIds.includes(cat.id) ? '#0099FF' : '#FFFFFF', flex: 1 }}>{cat.nome}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: cat.tipo === 'popular' ? '#0099FF' : '#38BDF8', background: cat.tipo === 'popular' ? 'rgba(0,153,255,0.1)' : 'rgba(56,189,248,0.1)', padding: '2px 6px', border: `1px solid ${cat.tipo === 'popular' ? 'rgba(0,153,255,0.3)' : 'rgba(56,189,248,0.3)'}`, flexShrink: 0 }}>
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
                <button type="submit" disabled={submittingEdit} className="btn-bmw" style={{ flex: 1, height: 44, fontSize: 14 }}>
                  {submittingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button type="button" onClick={closeEditModal}
                  style={{ background: '#141A24', border: '1px solid #1E293B', color: '#FFFFFF', padding: '0 16px', height: 44, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase' }}>
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
