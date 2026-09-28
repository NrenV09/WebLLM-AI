import React, { useState } from 'react';
import { Download, Share, X, Monitor, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  // If already running as an installed standalone PWA, suppress
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        title="Install app to your device for 100% offline access"
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-xl text-white/90 bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 ${className}`}
      >
        {isIOS ? (
          <Share className="w-3.5 h-3.5 text-white/80" />
        ) : (
          <Download className="w-3.5 h-3.5 text-white/90" />
        )}
        <span className="hidden sm:inline">Install App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-150">
          <div className="w-full max-w-sm glass-panel rounded-3xl p-6 border border-white/[0.15] shadow-2xl relative space-y-4">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 p-1 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Install Local Browser AI</h3>
                <p className="text-[11px] text-white/50">Run 100% offline with zero web traffic</p>
              </div>
            </div>

            {isIOS ? (
              <div className="text-xs text-white/70 space-y-2.5 leading-relaxed bg-white/[0.04] p-3.5 rounded-2xl border border-white/[0.08]">
                <p className="text-white font-medium">To install on iPhone or iPad:</p>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong>Share</strong> button in the Safari bottom bar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Scroll down and select <strong>"Add to Home Screen"</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>Launch from your home screen — models and inferencing run completely offline!</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/70 space-y-2.5 leading-relaxed bg-white/[0.04] p-3.5 rounded-2xl border border-white/[0.08]">
                <p className="text-white font-medium">To install on Desktop or Android:</p>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                  <span>Look for the <strong>Install</strong> icon (<Monitor className="w-3 h-3 inline text-white/90" /> or ⊕) on the right side of your browser's address bar.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                  <span>Or click the browser menu (⋮) and select <strong>"Install Local Browser AI"</strong>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                  <span>The app opens in its own window and caches all assets for offline use.</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 text-xs font-semibold rounded-2xl bg-white/15 text-white hover:bg-white/25 border border-white/25 transition cursor-pointer active:scale-98"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
