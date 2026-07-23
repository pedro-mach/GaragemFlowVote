import { useAuth } from './hooks/useAuth';
import { useCarros } from './hooks/useCarros';
import { useVotos } from './hooks/useVotos';
import { Layout } from './components/Layout';
import { AuthView } from './components/AuthView';
import { GalleryView } from './components/GalleryView';
import { DashboardView } from './components/DashboardView';

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

  // 1. Tela do Organizador (Painel Administrativo)
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
        logout={logout}
      />
    );
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
