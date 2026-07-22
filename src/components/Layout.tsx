import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  isMobileView?: boolean;
}

export function Layout({ children, isMobileView = true }: LayoutProps) {
  if (isMobileView) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-0 sm:p-4">
        {/* Simulação de container mobile no desktop */}
        <div className="w-full sm:max-w-md min-h-screen sm:min-h-[85vh] sm:rounded-2xl bg-background border border-[#1e1e1e] sm:shadow-2xl overflow-hidden flex flex-col relative">
          
          {/* Luz de fundo Neon Blue para sensação 3D */}
          <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-secondary/15 rounded-full blur-[100px] pointer-events-none" />
          
          {/* Conteúdo Principal */}
          <div className="flex-1 flex flex-col z-10 p-5 relative overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Visual Desktop para Dashboard
  return (
    <div className="min-h-screen bg-background text-text-primary flex">
      {/* Luz neon de fundo */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[180px] pointer-events-none" />
      
      <div className="w-full z-10 flex flex-col md:flex-row">
        {children}
      </div>
    </div>
  );
}
