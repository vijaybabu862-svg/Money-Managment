import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'banner' | 'settings' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('cashflow_pwa_dismissed') === 'true';
    setBannerDismissed(dismissed);
  }, []);

  const handleDismiss = () => {
    setBannerDismissed(true);
    localStorage.setItem('cashflow_pwa_dismissed', 'true');
  };

  // If already installed in standalone mode, do not show install CTA
  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <Smartphone className="w-4 h-4" />
          <span>App is installed and running in Standalone mode</span>
        </div>
      );
    }
    return null;
  }

  // Header quick install button
  if (variant === 'header') {
    if (!isInstallable && !isIOS) return null;

    return (
      <>
        <button
          onClick={isIOS ? () => setShowIOSGuide(true) : install}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition shadow-xs"
          title="Install Cash Flow app"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Install on iPhone / iPad</h3>
                <button onClick={() => setShowIOSGuide(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 font-bold text-slate-900 dark:text-white">1.</span>
                  <span>Tap the <strong>Share</strong> button at the bottom of Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 font-bold text-slate-900 dark:text-white">2.</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex-shrink-0 font-bold text-slate-900 dark:text-white">3.</span>
                  <span>Tap <strong>Add</strong> in the top-right corner.</span>
                </p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold hover:opacity-95"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Subtle banner prompt
  if (variant === 'banner') {
    if (bannerDismissed || (!isInstallable && !isIOS)) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-900 dark:text-white flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Install Cash Flow</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add Cash Flow to your home screen for instant access and full offline availability.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Later
          </button>
          <button
            onClick={isIOS ? () => setShowIOSGuide(true) : install}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
          >
            Install
          </button>
        </div>
      </div>
    );
  }

  // Settings page action
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white">Progressive Web App</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Install on mobile or desktop for full offline-first personal financial control.
        </div>
      </div>
      {isInstallable || isIOS ? (
        <button
          onClick={isIOS ? () => setShowIOSGuide(true) : install}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          <Download className="w-3.5 h-3.5" />
          Install Cash Flow
        </button>
      ) : (
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
          Web browser mode active
        </div>
      )}
    </div>
  );
};
