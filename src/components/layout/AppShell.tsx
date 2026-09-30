import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { X } from 'lucide-react';

export const AppShell: React.FC = () => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F8FA] dark:bg-[#0B0F17] text-[#111827] dark:text-[#F3F4F6]">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-white dark:bg-[#131926] shadow-2xl flex flex-col">
            <div className="p-3 flex justify-end border-b border-[#E5E7EB] dark:border-[#1F2937]">
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header onToggleMobileDrawer={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)} />

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            <ErrorBoundary fallbackTitle="Section Error" fallbackMessage="An error occurred rendering this section. Your recorded ledger data remains intact.">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};
