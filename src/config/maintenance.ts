/**
 * Configuração do Modo de Manutenção
 *
 * Quando `IS_MAINTENANCE_MODE` for true:
 * - O aplicativo bloqueia todas as páginas públicas (login e votação).
 * - Exibe a tela de manutenção personalizada em toda a aplicação.
 *
 * Para desativar a manutenção:
 * - Mude `DEFAULT_MAINTENANCE` para `false` OU
 * - Defina a variável de ambiente `VITE_MAINTENANCE_MODE=false`.
 */

const DEFAULT_MAINTENANCE = true;

const envMaintenance = import.meta.env.VITE_MAINTENANCE_MODE;

export const IS_MAINTENANCE_MODE: boolean =
  envMaintenance !== undefined
    ? envMaintenance === 'true' || envMaintenance === '1'
    : DEFAULT_MAINTENANCE;
