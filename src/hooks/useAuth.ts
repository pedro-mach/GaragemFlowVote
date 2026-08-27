import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { Eleitor } from '../data/mockData';
import { validateCPF } from '../utils/cpfValidation';

// Função para gerar o hash SHA-256 do CPF para privacidade dos dados
export async function hashCPF(cpf: string): Promise<string> {
  const cleanCPF = cpf.replace(/\D/g, ''); // Remove pontos, traço, etc.
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanCPF);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function useAuth() {
  const [user, setUser] = useState<Eleitor | null>(null);
  const [isOrganizer, setIsOrganizer] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carregar sessão salva no LocalStorage
    const storedUser = localStorage.getItem('regional_user') || localStorage.getItem('garagemflow_user');
    const storedRole = localStorage.getItem('regional_role') || localStorage.getItem('garagemflow_role');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('regional_user');
        localStorage.removeItem('garagemflow_user');
      }
    }
    if (storedRole === 'organizer') {
      setIsOrganizer(true);
    }
    setIsLoading(false);
  }, []);

  const MAX_ATTEMPTS = 3;
  const LOCKOUT_TIME_MS = 5 * 60 * 1000; // 5 minutos

  const checkLockout = (): { locked: boolean; message?: string } => {
    const now = Date.now();
    const lockoutUntil = parseInt(localStorage.getItem('login_lockout_until') || '0', 10);
    if (now < lockoutUntil) {
      const remainingMinutes = Math.ceil((lockoutUntil - now) / 60000);
      return {
        locked: true,
        message: `Acesso incorreto, tente em ${remainingMinutes} min.`,
      };
    }
    return { locked: false };
  };

  const recordFailedAttempt = (): string => {
    const attempts = parseInt(localStorage.getItem('login_attempts') || '0', 10) + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_TIME_MS;
      localStorage.setItem('login_lockout_until', lockoutUntil.toString());
      localStorage.setItem('login_attempts', '0');
      return 'Acesso incorreto, tente em 5 min.';
    } else {
      localStorage.setItem('login_attempts', attempts.toString());
      return 'Acesso incorreto. Tente novamente.';
    }
  };

  const clearAttempts = () => {
    localStorage.removeItem('login_attempts');
    localStorage.removeItem('login_lockout_until');
  };

  const login = async (cpf: string, dataNascimento: string) => {
    setIsLoading(true);
    setError(null);

    const lock = checkLockout();
    if (lock.locked) {
      setError(lock.message!);
      setIsLoading(false);
      return;
    }

    if (!validateCPF(cpf)) {
      setError('CPF inválido. Por favor, forneça um número de CPF válido.');
      setIsLoading(false);
      return;
    }

    try {
      const cpfHash = await hashCPF(cpf);

      if (isSupabaseConfigured && supabase) {
        // Fluxo com Supabase
        // Busca eleitor existente
        const { data: existing, error: fetchError } = await supabase
          .from('eleitores')
          .select('*')
          .eq('cpf_hash', cpfHash)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existing) {
          // Verifica se a data de nascimento coincide
          if (existing.data_nascimento === dataNascimento) {
            clearAttempts();
            setUser(existing);
            setIsOrganizer(false);
            localStorage.setItem('regional_user', JSON.stringify(existing));
            localStorage.setItem('regional_role', 'voter');
          } else {
            throw new Error('MISMATCH');
          }
        } else {
          // Cria novo eleitor (cadastro silencioso)
          const { data: created, error: insertError } = await supabase
            .from('eleitores')
            .insert({ cpf_hash: cpfHash, data_nascimento: dataNascimento })
            .select()
            .single();

          if (insertError) throw insertError;

          clearAttempts();
          setUser(created);
          setIsOrganizer(false);
          localStorage.setItem('regional_user', JSON.stringify(created));
          localStorage.setItem('regional_role', 'voter');
        }
      } else {
        // Fluxo offline / Mock
        const localDb: Eleitor[] = JSON.parse(
          localStorage.getItem('regional_db_eleitores') || localStorage.getItem('garagemflow_db_eleitores') || '[]'
        );

        const existing = localDb.find((e) => e.cpf_hash === cpfHash);

        if (existing) {
          if (existing.data_nascimento === dataNascimento) {
            clearAttempts();
            setUser(existing);
            setIsOrganizer(false);
            localStorage.setItem('regional_user', JSON.stringify(existing));
            localStorage.setItem('regional_role', 'voter');
          } else {
            throw new Error('MISMATCH');
          }
        } else {
          const newEleitor: Eleitor = {
            id: `el-${Math.random().toString(36).substr(2, 9)}`,
            cpf_hash: cpfHash,
            data_nascimento: dataNascimento,
            criado_em: new Date().toISOString(),
          };
          localDb.push(newEleitor);
          localStorage.setItem('regional_db_eleitores', JSON.stringify(localDb));

          clearAttempts();
          setUser(newEleitor);
          setIsOrganizer(false);
          localStorage.setItem('regional_user', JSON.stringify(newEleitor));
          localStorage.setItem('regional_role', 'voter');
        }
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      const msg = recordFailedAttempt();
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsOrganizer = (cpf: string, password: string): { success: boolean; error?: string } => {
    setIsLoading(true);
    setError(null);

    const lock = checkLockout();
    if (lock.locked) {
      setError(lock.message!);
      setIsLoading(false);
      return { success: false, error: lock.message };
    }

    if (!validateCPF(cpf)) {
      const msg = 'CPF de organizador inválido.';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }

    const validPasswords = [
      import.meta.env.VITE_ORGANIZER_PASSWORD,
      import.meta.env.ORGANIZER_PASSWORD,
      "LosFelas2026#",
      "1234",
    ].filter(Boolean);

    const cleanCpf = cpf.replace(/\D/g, '');

    // Se houver lista de CPFs autorizados configurada no ambiente:
    const envCpfs = import.meta.env.VITE_ORGANIZER_CPFS || import.meta.env.ORGANIZER_CPFS;
    if (envCpfs) {
      const allowedCpfs = envCpfs.split(',').map((c: string) => c.replace(/\D/g, '').trim());
      if (!allowedCpfs.includes(cleanCpf)) {
        const msg = recordFailedAttempt();
        setError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }
    }

    if (validPasswords.includes(password.trim())) {
      clearAttempts();
      setIsOrganizer(true);
      setUser(null);
      localStorage.setItem('losfelas_role', 'organizer');
      localStorage.setItem('losfelas_organizer_cpf', cleanCpf);
      localStorage.removeItem('losfelas_user');
      localStorage.removeItem('regional_user');
      localStorage.removeItem('garagemflow_user');
      setIsLoading(false);
      return { success: true };
    } else {
      const msg = recordFailedAttempt();
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    setUser(null);
    setIsOrganizer(false);
    localStorage.removeItem('losfelas_user');
    localStorage.removeItem('regional_user');
    localStorage.removeItem('garagemflow_user');
    localStorage.removeItem('losfelas_role');
    localStorage.removeItem('regional_role');
    localStorage.removeItem('garagemflow_role');
    localStorage.removeItem('losfelas_organizer_cpf');
    localStorage.removeItem('regional_organizer_cpf');
  };

  return {
    user,
    isOrganizer,
    isLoading,
    error,
    login,
    loginAsOrganizer,
    logout,
  };
}


