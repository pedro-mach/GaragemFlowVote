import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import type { Eleitor } from '../data/mockData';

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
    const storedUser = localStorage.getItem('garagemflow_user');
    const storedRole = localStorage.getItem('garagemflow_role');

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
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
            localStorage.setItem('garagemflow_user', JSON.stringify(existing));
            localStorage.setItem('garagemflow_role', 'voter');
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
          localStorage.setItem('garagemflow_user', JSON.stringify(created));
          localStorage.setItem('garagemflow_role', 'voter');
        }
      } else {
        // Fluxo offline / Mock
        // Usar banco simulado local no LocalStorage
        const localDb: Eleitor[] = JSON.parse(
          localStorage.getItem('garagemflow_db_eleitores') || '[]'
        );
        
        const existing = localDb.find((e) => e.cpf_hash === cpfHash);

        if (existing) {
          if (existing.data_nascimento === dataNascimento) {
            setUser(existing);
            setIsOrganizer(false);
            localStorage.setItem('garagemflow_user', JSON.stringify(existing));
            localStorage.setItem('garagemflow_role', 'voter');
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
          localStorage.setItem('garagemflow_db_eleitores', JSON.stringify(localDb));
          
          setUser(newEleitor);
          setIsOrganizer(false);
          localStorage.setItem('garagemflow_user', JSON.stringify(newEleitor));
          localStorage.setItem('garagemflow_role', 'voter');
        }
      }
    } catch (err: any) {
      console.error('Erro no login:', err);
      setError(err.message || 'Erro ao realizar login.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsOrganizer = () => {
    setIsLoading(true);
    setIsOrganizer(true);
    setUser(null);
    localStorage.setItem('garagemflow_role', 'organizer');
    localStorage.removeItem('garagemflow_user');
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    setIsOrganizer(false);
    localStorage.removeItem('garagemflow_user');
    localStorage.removeItem('garagemflow_role');
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
