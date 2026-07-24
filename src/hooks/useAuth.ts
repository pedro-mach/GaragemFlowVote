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

  const login = async (cpf: string, dataNascimento: string) => {
    setIsLoading(true);
    setError(null);

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
          // Supabase pode salvar 'YYYY-MM-DD', garantimos formatação equivalente
          if (existing.data_nascimento === dataNascimento) {
            setUser(existing);
            setIsOrganizer(false);
            localStorage.setItem('regional_user', JSON.stringify(existing));
            localStorage.setItem('regional_role', 'voter');
          } else {
            throw new Error('Data de nascimento incorreta para este CPF.');
          }
        } else {
          // Cria novo eleitor (cadastro silencioso)
          const { data: created, error: insertError } = await supabase
            .from('eleitores')
            .insert({ cpf_hash: cpfHash, data_nascimento: dataNascimento })
            .select()
            .single();

          if (insertError) throw insertError;

          setUser(created);
          setIsOrganizer(false);
          localStorage.setItem('regional_user', JSON.stringify(created));
          localStorage.setItem('regional_role', 'voter');
        }
      } else {
        // Fluxo offline / Mock
        // Usar banco simulado local no LocalStorage
        const localDb: Eleitor[] = JSON.parse(
          localStorage.getItem('regional_db_eleitores') || localStorage.getItem('garagemflow_db_eleitores') || '[]'
        );

        const existing = localDb.find((e) => e.cpf_hash === cpfHash);

        if (existing) {
          if (existing.data_nascimento === dataNascimento) {
            setUser(existing);
            setIsOrganizer(false);
            localStorage.setItem('regional_user', JSON.stringify(existing));
            localStorage.setItem('regional_role', 'voter');
          } else {
            throw new Error('Data de nascimento incorreta para este CPF.');
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

          setUser(newEleitor);
          setIsOrganizer(false);
          localStorage.setItem('regional_user', JSON.stringify(newEleitor));
          localStorage.setItem('regional_role', 'voter');
        }
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsOrganizer = (cpf: string, password: string): { success: boolean; error?: string } => {
    setIsLoading(true);
    setError(null);

    if (!validateCPF(cpf)) {
      const msg = 'CPF de organizador inválido.';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }

    const validPasswords = [
      import.meta.env.VITE_ORGANIZER_PASSWORD,
    ].filter(Boolean);

    const cleanCpf = cpf.replace(/\D/g, '');

    // Se houver lista de CPFs autorizados configurada no ambiente:
    const envCpfs = import.meta.env.VITE_ORGANIZER_CPFS;
    if (envCpfs) {
      const allowedCpfs = envCpfs.split(',').map((c: string) => c.replace(/\D/g, '').trim());
      if (!allowedCpfs.includes(cleanCpf)) {
        const msg = 'Este CPF não possui permissão de acesso ao painel de organizadores.';
        setError(msg);
        setIsLoading(false);
        return { success: false, error: msg };
      }
    }

    if (validPasswords.includes(password.trim())) {
      setIsOrganizer(true);
      setUser(null);
      localStorage.setItem('regional_role', 'organizer');
      localStorage.setItem('regional_organizer_cpf', cleanCpf);
      localStorage.removeItem('regional_user');
      localStorage.removeItem('garagemflow_user');
      setIsLoading(false);
      return { success: true };
    } else {
      const msg = 'Senha de acesso do organizador incorreta.';
      setError(msg);
      setIsLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    setUser(null);
    setIsOrganizer(false);
    localStorage.removeItem('regional_user');
    localStorage.removeItem('garagemflow_user');
    localStorage.removeItem('regional_role');
    localStorage.removeItem('garagemflow_role');
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


