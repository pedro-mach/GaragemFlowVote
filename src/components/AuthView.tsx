import React, { useState } from 'react';
import { Shield, KeyRound, AlertTriangle, Car } from 'lucide-react';

interface AuthViewProps {
  login: (cpf: string, birthdate: string) => Promise<void>;
  loginAsOrganizer: () => void;
  isLoading: boolean;
  error: string | null;
}

export function AuthView({ login, loginAsOrganizer, isLoading, error }: AuthViewProps) {
  const [cpf, setCpf] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Formata o CPF no formato 999.999.999-99 à medida que digita
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Apenas números
    if (value.length > 11) value = value.slice(0, 11);

    // Aplica a máscara
    if (value.length > 9) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
    } else if (value.length > 6) {
      value = `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6)}`;
    } else if (value.length > 3) {
      value = `${value.slice(0, 3)}.${value.slice(3)}`;
    }
    
    setCpf(value);
    setFormError(null);
  };

  const handleBirthdateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBirthdate(e.target.value);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setFormError('Por favor, informe um CPF válido (11 dígitos).');
      return;
    }

    if (!birthdate) {
      setFormError('Por favor, informe sua data de nascimento.');
      return;
    }

    if (!lgpdConsent) {
      setFormError('Você precisa aceitar os termos de consentimento para prosseguir.');
      return;
    }

    await login(cpf, birthdate);
  };

  return (
    <div className="flex-1 flex flex-col justify-between py-4">
      {/* Header Centralizado */}
      <div className="text-center my-6 flex flex-col items-center">
        <div className="w-16 h-16 rounded-full bg-surface border border-secondary flex items-center justify-center mb-3 shadow-md animate-pulse">
          <Car className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
          Garagem<span className="text-primary font-black">Flow</span>Vote
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          Votação de Eventos Automotivos em Tempo Real
        </p>
      </div>

      {/* Formulário Principal */}
      <div className="bg-surface rounded-xl p-5 border border-[#2b2b2b] shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cpf" className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              CPF do Eleitor
            </label>
            <input
              id="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
              disabled={isLoading}
              className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2.5 px-3.5 text-white placeholder-gray-600 outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label htmlFor="birthdate" className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
              Data de Nascimento
            </label>
            <input
              id="birthdate"
              type="date"
              value={birthdate}
              onChange={handleBirthdateChange}
              disabled={isLoading}
              className="w-full bg-[#121212] border border-[#333] focus:border-secondary focus:ring-1 focus:ring-secondary rounded-lg py-2.5 px-3.5 text-white placeholder-gray-600 outline-none text-sm transition-all"
            />
          </div>

          {/* Consentimento LGPD */}
          <div className="flex items-start space-x-2 pt-2">
            <input
              id="lgpd"
              type="checkbox"
              checked={lgpdConsent}
              onChange={(e) => {
                setLgpdConsent(e.target.checked);
                setFormError(null);
              }}
              disabled={isLoading}
              className="mt-1 h-4 w-4 rounded bg-[#121212] border-[#333] text-primary focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="lgpd" className="text-[11px] leading-4 text-gray-400 select-none">
              Consinto com o tratamento dos dados informados exclusivamente para validação e auditoria desta votação, conforme a LGPD.
            </label>
          </div>

          {/* Mensagens de Erro */}
          {(error || formError) && (
            <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="text-xs text-red-200 leading-tight">
                {formError || error}
              </span>
            </div>
          )}

          {/* Ação Principal */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-[#c9922f] active:scale-[0.98] text-white font-bold py-3 rounded-full shadow-lg shadow-primary/20 flex items-center justify-center space-x-2 text-sm transition-all"
          >
            <span>{isLoading ? 'Verificando...' : 'Entrar para Votar'}</span>
          </button>
        </form>
      </div>

      {/* Footer / Acesso Organizador */}
      <div className="mt-8 text-center flex flex-col items-center space-y-2">
        <button
          onClick={loginAsOrganizer}
          className="text-xs text-secondary hover:text-[#5e95b9] flex items-center space-x-1.5 transition-colors focus:outline-none"
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Painel do Organizador (Painel Privado)</span>
        </button>
        <div className="flex items-center space-x-1.5 text-[10px] text-gray-500">
          <Shield className="w-3 h-3" />
          <span>Votação Segura & Criptografada</span>
        </div>
      </div>
    </div>
  );
}
