import React, { useState } from 'react';
import { Shield, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Evento } from '../data/mockData';

interface AuthViewProps {
  evento?: Evento | null;
  login: (cpf: string, birthdate: string) => Promise<void>;
  loginAsOrganizer: () => void;
  isLoading: boolean;
  error: string | null;
}

export function AuthView({ evento, login, loginAsOrganizer, isLoading, error }: AuthViewProps) {
  const [cpf, setCpf] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);

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
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);

    if (value.length > 4) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length > 2) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    setBirthdate(value);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setFormError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }

    if (birthdate.length !== 10) {
      setFormError('Por favor, informe uma data de nascimento válida (DD/MM/AAAA).');
      return;
    }

    const [day, month, year] = birthdate.split('/');
    const formattedDate = `${year}-${month}-${day}`;

    if (!lgpdConsent) {
      setFormError('Você precisa concordar com os termos da LGPD para votar.');
      return;
    }

    await login(cpf, formattedDate);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center py-6 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-10 lg:gap-x-16 lg:gap-y-8 items-start">

        {/* ===== A: BRANDING ===== */}
        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1 flex flex-col justify-center order-1 lg:mt-8" style={{ gap: '32px' }}>

          {/* Logo + Event Name */}
          <div className="flex items-center gap-4">
            <div
              className="overflow-hidden shrink-0"
              style={{
                width: 64,
                height: 64,
                border: '1px solid rgba(255,192,0,0.3)',
                background: '#181818',
              }}
            >
              <img
                src="/Logo-evento.jpeg"
                alt="Logo Garagem Flow"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#FFC000',
              }}>
                {evento?.nome || 'GARAGEM FLOW VOTE'}
              </span>
            </div>
          </div>

          {/* Headline */}

        </div>

        {/* ===== B: CARD DE LOGIN ===== */}
        <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 w-full order-2">
          <div
            style={{
              background: '#181818',
              border: '1px solid #313131',
              borderTop: '2px solid #FFC000',
              padding: '32px',
              position: 'relative',
            }}
          >
            {/* Header do Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 28,
                paddingBottom: 20,
                borderBottom: '1px solid #202020',
              }}
            >
              <div>
                <h2 style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#FFFFFF',
                  margin: 0,
                }}>
                  Identificação do Eleitor
                </h2>
                <p style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 13,
                  color: '#7D7D7D',
                  margin: '6px 0 0 0',
                }}>
                  Informe seus dados para liberar o voto
                </p>
              </div>
              <Shield size={20} color="#FFC000" />
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* CPF */}
              <div>
                <label
                  htmlFor="cpf"
                  className="label-ds"
                  style={{ display: 'block', marginBottom: 8 }}
                >
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
                  className="input-ds"
                />
              </div>

              {/* Data de Nascimento */}
              <div>
                <label
                  htmlFor="birthdate"
                  className="label-ds"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  Data de Nascimento
                </label>
                <input
                  id="birthdate"
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  value={birthdate}
                  onChange={handleBirthdateChange}
                  disabled={isLoading}
                  className="w-full h-12 bg-[#16161A] border border-white/10 focus:border-[#F5A623] focus:ring-1 focus:ring-[#F5A623] rounded-xl px-4 text-white placeholder-gray-500 outline-none text-sm transition-all font-mono tracking-wider"
                />
              </div>

              {/* Checkbox LGPD */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <input
                  id="lgpd"
                  type="checkbox"
                  checked={lgpdConsent}
                  onChange={(e) => {
                    setLgpdConsent(e.target.checked);
                    setFormError(null);
                  }}
                  disabled={isLoading}
                  style={{
                    marginTop: 2,
                    accentColor: '#FFC000',
                    width: 16,
                    height: 16,
                    flexShrink: 0,
                    cursor: 'pointer',
                  }}
                />
                <label
                  htmlFor="lgpd"
                  style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: 12,
                    color: '#7D7D7D',
                    lineHeight: 1.5,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  Consinto com o tratamento dos dados exclusivamente para validação e auditoria desta votação (LGPD).
                </label>
              </div>

              {/* Erro */}
              {(error || formError) && (
                <div
                  style={{
                    background: 'rgba(180,0,0,0.15)',
                    border: '1px solid rgba(220,50,50,0.4)',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <AlertTriangle size={16} color="#FFC000" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#ffaaaa' }}>
                    {formError || error}
                  </span>
                </div>
              )}

              {/* Botão CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-gold"
                style={{ width: '100%', height: 52, fontSize: 15, gap: 10, marginTop: 4 }}
              >
                {isLoading ? (
                  'Verificando...'
                ) : (
                  <>
                    <span>ENTRAR PARA VOTAR</span>
                    <CheckCircle2 size={18} color="#000000" />
                  </>
                )}
              </button>
            </form>

            {/* Acesso Organizador */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #202020',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                onClick={loginAsOrganizer}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#29ABE2',
                  transition: 'color 0.15s',
                  padding: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#3860BE')}
                onMouseLeave={e => (e.currentTarget.style.color = '#29ABE2')}
              >
                <KeyRound size={14} />
                <span>Painel do Organizador (Privado)</span>
              </button>

              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: '#313131',
              }}>
                Votação Auditada
              </span>
            </div>
          </div>
        </div>

        {/* ===== C: FEATURE PILLS ===== */}

        <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2 order-3 w-full">
          <p style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: 15,
            color: '#7D7D7D',
            marginTop: 16,
            lineHeight: 1.6,
            maxWidth: 480,
            fontWeight: 400,
          }}>
            Plataforma oficial de votação em tempo real para eventos de carros.
          </p>
          <br />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: '#202020' }}>
            {[
              { label: 'Apuração ao Vivo', sub: 'Resultados imediatos' },
              { label: 'Categorias Troféu', sub: 'Populares & técnicas' },
              { label: 'Voto Auditado', sub: 'Por CPF' },
            ].map((f) => (
              <div
                key={f.label}
                style={{
                  background: '#000000',
                  padding: '16px 20px',
                  borderTop: '2px solid #202020',
                }}
              >
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#FFFFFF',
                }}>
                  {f.label}
                </div>
                <div style={{
                  fontFamily: "'Barlow', sans-serif",
                  fontSize: 12,
                  color: '#7D7D7D',
                  marginTop: 4,
                }}>
                  {f.sub}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
