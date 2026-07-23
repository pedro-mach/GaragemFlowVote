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
    atualizarNomeEvento,
    cadastrarCarro,
    deletarCarro,
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

  // 1. Tela do Organizador (Painel Administrativo)
  if (isOrganizer) {
    return (
      <DashboardView
        evento={evento}
        carros={carros}
        categorias={categorias}
        resultados={resultados}
        totalUsuarios={totalUsuarios}
        totalVotos={totalVotos}
        isLoading={globalLoading || votingLoading}
        error={globalError}
        atualizarNomeEvento={atualizarNomeEvento}
        cadastrarCarro={cadastrarCarro}
        deletarCarro={deletarCarro}
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
          userVotos={userVotos}
          votar={votar}
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
