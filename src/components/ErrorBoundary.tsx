import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught Error in React Component Tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Barlow', sans-serif",
          textAlign: 'center',
        }}>
          <div style={{
            background: '#181818',
            border: '1px solid #313131',
            borderTop: '3px solid #ef4444',
            padding: '32px',
            maxWidth: 500,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, color: '#ef4444', margin: 0, textTransform: 'uppercase' }}>
              Ocorreu um erro ao carregar a tela
            </h2>
            <p style={{ fontSize: 13, color: '#a3a3a3', margin: 0 }}>
              {this.state.error?.message || 'Ocorreu um erro inesperado.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                style={{
                  background: '#FFC000',
                  color: '#000000',
                  border: 'none',
                  padding: '10px 20px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Recarregar Aplicação
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                style={{
                  background: '#202020',
                  color: '#ffffff',
                  border: '1px solid #313131',
                  padding: '10px 20px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Limpar Cache Local
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
