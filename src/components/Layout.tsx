import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  isMobileView?: boolean;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col relative overflow-x-hidden" style={{ background: '#000000', color: '#FFFFFF' }}>
      {/* Conteúdo Principal */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col z-10 relative">
        {children}
      </div>
    </div>
  );
}
