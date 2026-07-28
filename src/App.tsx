import { useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useCarros } from './hooks/useCarros';
import { useVotos } from './hooks/useVotos';
import { Layout } from './components/Layout';
import { AuthView } from './components/AuthView';
import { GalleryView } from './components/GalleryView';
import { DashboardView } from './components/DashboardView';
import { MaintenanceView } from './components/MaintenanceView';
import { IS_MAINTENANCE_MODE } from './config/maintenance';

function App() {

  const {
    user,
    isOrganizer,
    isLoading: authLoading,
    error: authError,
    login,
    loginAsOrganizer,
    logout,
  } = useAuth();

  const {
    evento,
    carros,
    categorias,
    equipes,
    isLoading: dataLoading,
    error: dataError,
    atualizarNomeEvento,
    cadastrarCarro,
    editarCarro,
    deletarCarro,
    cadastrarEquipe,
    deletarEquipe,
    cadastrarCategoria,
    editarCategoria,
    toggleOcultarCategoria,
    deletarCategoria,
    toggleStatusVotacao,
    fetchFotoCarro,
    fetchFotosParaCarros,
  } = useCarros();

  const {
    userVotos,
    resultados,
    totalUsuarios,
    totalVotos,
    isLoading: votingLoading,
    error: votingError,
    votar,
    fetchResultados,
  } = useVotos(user?.id, evento?.id);

  const globalLoading = authLoading || dataLoading;
  const globalError = authError || dataError || votingError;

  useEffect(() => {
    const nomeEvento = evento?.nome || 'Regional das Equipes em Valinhos';
    document.title = `${nomeEvento} | GaragemFlow, Los Felas & Low Mafia`;
  }, [evento?.nome]);

  // Carregamento da sessão inicial

  if (authLoading) {
    return (
      <Layout>
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFC000', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, letterSpacing: '0.1em' }}>
          CARREGANDO SESSÃO...
        </div>
      </Layout>
    );
  }

  // 1. Tela do Organizador (Painel Administrativo - permite acesso mesmo se em manutenção)
  if (isOrganizer) {
    return (
      <DashboardView
        evento={evento}
        carros={carros}
        categorias={categorias}
        equipes={equipes}
        resultados={resultados}
        totalUsuarios={totalUsuarios}
        totalVotos={totalVotos}
        isLoading={globalLoading || votingLoading}
        error={globalError}
        atualizarNomeEvento={atualizarNomeEvento}
        cadastrarCarro={cadastrarCarro}
        editarCarro={editarCarro}
        deletarCarro={deletarCarro}
        cadastrarEquipe={cadastrarEquipe}
        deletarEquipe={deletarEquipe}
        cadastrarCategoria={cadastrarCategoria}
        editarCategoria={editarCategoria}
        toggleOcultarCategoria={toggleOcultarCategoria}
        deletarCategoria={deletarCategoria}
        toggleStatusVotacao={toggleStatusVotacao}
        fetchResultados={fetchResultados}
        fetchFotoCarro={fetchFotoCarro}
        logout={logout}
      />
    );
  }

  // 2. Tela de Manutenção (Bloqueia todo acesso público/votantes se ativado)
  if (IS_MAINTENANCE_MODE) {
    return <MaintenanceView loginAsOrganizer={loginAsOrganizer} />;
  }

  // 2. Tela de Votação (Galeria de Carros)
  if (user) {
    return (
      <Layout>
        <GalleryView
          user={user}
          evento={evento}
          carros={carros}
          categorias={categorias}
          equipes={equipes}
          userVotos={userVotos}
          resultados={resultados}
          totalVotos={totalVotos}
          fetchResultados={fetchResultados}
          fetchFotosParaCarros={fetchFotosParaCarros}
          votar={votar}
          cadastrarEquipe={cadastrarEquipe}
          logout={logout}
          isLoading={globalLoading || votingLoading}
          error={globalError}
        />
      </Layout>
    );
  }

  // 3. Tela de Autenticação / Login (Padrão)
  return (
    <Layout>
      <AuthView
        evento={evento}
        login={login}
        loginAsOrganizer={loginAsOrganizer}
        isLoading={globalLoading}
        error={globalError}
      />
    </Layout>
  );
}

export default App;
