import { useState } from 'react';
import { Wrench, ShieldAlert, RefreshCw, Lock, ArrowRight } from 'lucide-react';
import { Layout } from './Layout';

interface MaintenanceViewProps {
  loginAsOrganizer?: (pass: string) => Promise<boolean>;
}

export function MaintenanceView({ loginAsOrganizer }: MaintenanceViewProps) {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleReload = () => {
    window.location.reload();
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAsOrganizer) return;

    setIsLoggingIn(true);
    setAdminError('');

    try {
      const success = await loginAsOrganizer(adminPassword);
      if (!success) {
        setAdminError('Senha do organizador incorreta.');
      }
    } catch {
      setAdminError('Erro ao tentar autenticar organizador.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8 text-center max-w-3xl mx-auto">
        {/* Badge de Aviso Pulsante */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 border border-[#0099FF]/40 bg-[#0099FF]/10 text-[#0099FF] text-xs uppercase tracking-widest font-bold animate-pulse">
          <Wrench className="w-4 h-4 text-[#0099FF]" />
          <span>SISTEMA EM MANUTENÇÃO PROGRAMADA</span>
        </div>

        {/* Ícone Principal Central */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-[#0099FF]/20 blur-xl rounded-full" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-[#0D1117] border-2 border-[#0099FF] flex items-center justify-center">
            <ShieldAlert className="w-12 h-12 sm:w-14 sm:h-14 text-[#0099FF]" />
          </div>
        </div>

        {/* Título Principal */}
        <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight mb-4 leading-none">
          ACESSO TEMPORARIAMENTE <span className="text-[#0099FF]">SUSPENSO</span>
        </h1>

        {/* Descrição */}
        <p className="text-[#94A3B8] text-base sm:text-lg max-w-xl mb-8 leading-relaxed font-sans">
          Estamos realizando atualizações técnicas e melhorias na infraestrutura do sistema de votação do Los Felas.
          Todo o acesso público em produção foi temporariamente desativado.
        </p>

        {/* Grid de Status da Manutenção */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
          <div className="bg-[#0D1117] border border-[#1E293B] p-4">
            <div className="text-[#64748B] text-xs uppercase tracking-wider mb-1 font-bold">Status do Servidor</div>
            <div className="text-white font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0099FF] animate-ping" />
              EM MANUTENÇÃO
            </div>
          </div>

          <div className="bg-[#0D1117] border border-[#1E293B] p-4">
            <div className="text-[#64748B] text-xs uppercase tracking-wider mb-1 font-bold">Motivo</div>
            <div className="text-white font-bold text-sm truncate">
              Atualização do Sistema
            </div>
          </div>

          <div className="bg-[#0D1117] border border-[#1E293B] p-4">
            <div className="text-[#64748B] text-xs uppercase tracking-wider mb-1 font-bold">Previsão de Retorno</div>
            <div className="text-[#0099FF] font-bold text-sm">
              Em Breve
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center mb-10">
          <button
            onClick={handleReload}
            className="btn-bmw flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 text-white font-bold uppercase tracking-wider transition-transform active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Verificar Novamente</span>
          </button>
        </div>

        {/* Rodapé Oculto/Discreto para Acesso de Organizador */}
        {loginAsOrganizer && (
          <div className="mt-4 pt-6 border-t border-[#1E293B] w-full flex flex-col items-center">
            <button
              onClick={() => setShowAdminModal(true)}
              className="text-[#64748B] hover:text-[#0099FF] text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Acesso Restrito Organização</span>
            </button>
          </div>
        )}

        {/* Modal de Login de Emergência do Organizador */}
        {showAdminModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0D1117] border border-[#0099FF] p-6 max-w-md w-full text-left relative">
              <div className="flex items-center justify-between mb-4 border-b border-[#1E293B] pb-3">
                <div className="flex items-center gap-2 text-[#0099FF] font-bold uppercase text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Autenticação de Organizador</span>
                </div>
                <button
                  onClick={() => setShowAdminModal(false)}
                  className="text-[#64748B] hover:text-white text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#94A3B8] mb-4">
                Digite a senha administrativa para acessar o painel mesmo durante a manutenção.
              </p>

              {adminError && (
                <div className="mb-4 bg-red-950/50 border border-red-800 text-red-300 text-xs p-3 font-mono">
                  {adminError}
                </div>
              )}

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-[#64748B] mb-1">
                    Senha do Organizador
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Digite a senha..."
                    required
                    className="w-full bg-[#000000] border border-[#1E293B] text-white px-3 py-2 text-sm focus:border-[#0099FF] focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdminModal(false)}
                    className="px-4 py-2 bg-[#141A24] text-white text-xs uppercase font-bold hover:bg-[#1E293B]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="btn-bmw px-4 py-2 text-xs uppercase font-bold flex items-center gap-2"
                  >
                    {isLoggingIn ? 'Entrando...' : 'Entrar'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
