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
    isLoading: dataLoading,
    error: dataError,
    cadastrarCarro,
    deletarCarro,
    toggleStatusVotacao,
  } = useCarros();

  // O hook useVotos precisa do ID do eleitor logado e do ID do evento ativo
  const {
    userVotos,
    resultados,
    isLoading: votingLoading,
    error: votingError,
    votar,
    fetchResultados,
  } = useVotos(user?.id, evento?.id);

  const globalLoading = authLoading || dataLoading;
  const globalError = authError || dataError || votingError;

  // 1. Tela do Organizador (Painel Administrativo)
  if (isOrganizer) {
    return (
      <Layout isMobileView={false}>
        <DashboardView
          evento={evento}
          carros={carros}
          categorias={categorias}
          resultados={resultados}
          isLoading={globalLoading || votingLoading}
          error={globalError}
          cadastrarCarro={cadastrarCarro}
          deletarCarro={deletarCarro}
          toggleStatusVotacao={toggleStatusVotacao}
          fetchResultados={fetchResultados}
          logout={logout}
        />
      </Layout>
    );
  }

  // 2. Tela de Votação (Galeria de Carros - Mobile)
  if (user) {
    return (
      <Layout isMobileView={true}>
        <GalleryView
          user={user}
          evento={evento}
          carros={carros}
          categorias={categorias}
          userVotos={userVotos}
          votar={votar}
          logout={logout}
          isLoading={globalLoading || votingLoading}
          error={globalError}
        />
      </Layout>
    );
  }

  // 3. Tela de Autenticação / Login (Padrão - Mobile)
  return (
    <Layout isMobileView={true}>
      <AuthView
        login={login}
        loginAsOrganizer={loginAsOrganizer}
        isLoading={globalLoading}
        error={globalError}
      />
    </Layout>
  );
}

export default App;
