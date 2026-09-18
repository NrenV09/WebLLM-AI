import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Check, Sliders, ExternalLink } from 'lucide-react';

interface CookieConsentBannerProps {
  onOpenLegalModal: (tab: 'privacy' | 'terms' | 'cookies' | 'refund' | 'business') => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenLegalModal }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem('user_cookie_consent_v1');
      if (!storedConsent) {
        // Show after a brief delay for smooth entrance
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('user_cookie_consent_v1', JSON.stringify({
        essential: true,
        localModelCache: true,
        analytics: false, // 100% telemetry-free by policy
        timestamp: new Date().toISOString()
      }));
    } catch {}
    setIsVisible(false);
  };

  const handleAcceptEssentialOnly = () => {
    try {
      localStorage.setItem('user_cookie_consent_v1', JSON.stringify({
        essential: true,
        localModelCache: true,
        analytics: false,
        timestamp: new Date().toISOString()
      }));
    } catch {}
    setIsVisible(false);
  };

  const handleSaveCustom = () => {
    try {
      localStorage.setItem('user_cookie_consent_v1', JSON.stringify({
        essential: true,
        localModelCache: true,
        analytics: analyticsAllowed,
        timestamp: new Date().toISOString()
      }));
    } catch {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Privacy & Cookie Consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#12141a]/95 border border-white/[0.15] rounded-3xl p-5 shadow-2xl backdrop-blur-2xl text-white space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white tracking-tight">
                100% Private & On-Device Storage
              </h4>
              <p className="text-[11px] text-white/50">GDPR, CCPA & ePrivacy Compliant</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAcceptEssentialOnly}
            aria-label="Dismiss cookie consent with essential settings"
            className="text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-white/70 leading-relaxed">
          We respect your privacy: this application runs models <strong>entirely inside your browser's WebGPU engine</strong>.
          We use browser storage (IndexedDB & CacheStorage) strictly to store your model weights and chat history locally.
          We do not sell data, use tracking cookies, or transmit prompts to external servers.
        </p>

        {showPreferences && (
          <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5 text-xs animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-white block">Essential Storage & WebGPU Weights</span>
                <span className="text-[10px] text-white/50">Required to store model shards and chat sessions locally</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">
                Always Required
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
              <div>
                <span className="font-medium text-white block">Telemetry & Analytics</span>
                <span className="text-[10px] text-white/50">Disabled by default (zero analytics active)</span>
              </div>
              <span className="text-[10px] text-white/40 font-mono">
                0% Trackers
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="cookie-consent-accept-all"
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept & Continue</span>
            </button>
            <button
              type="button"
              id="cookie-consent-essential"
              onClick={handleAcceptEssentialOnly}
              className="flex-1 py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-medium text-xs border border-white/[0.1] transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            >
              <span>Essential Only</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/50 px-1 pt-1">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{showPreferences ? 'Hide preferences' : 'Customize preferences'}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenLegalModal('cookies')}
              className="inline-flex items-center gap-1 text-emerald-400 hover:underline cursor-pointer"
            >
              <span>Cookie Policy</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
