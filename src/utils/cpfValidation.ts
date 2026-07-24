/**
 * Valida se uma string é um CPF brasileiro matematicamente válido.
 * Utiliza o algoritmo oficial dos dígitos verificadores (módulo 11).
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;

  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');

  // Deve possuir exatamente 11 dígitos
  if (cleanCPF.length !== 11) return false;

  // Rejeita sequências de dígitos iguais repetidos (ex: 00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  // Validação do 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i);
  }
  let rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(9), 10)) return false;

  // Validação do 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i);
  }
  rev = (sum * 10) % 11;
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCPF.charAt(10), 10)) return false;

  return true;
}
