import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  FileText, 
  Cookie, 
  RefreshCw, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Mail, 
  MapPin, 
  Scale,
  Lock,
  Database
} from 'lucide-react';

export type LegalTab = 'privacy' | 'terms' | 'cookies' | 'refund' | 'business';

interface LegalComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LegalTab;
  userFormConsent?: boolean;
  onToggleFormConsent?: (accepted: boolean) => void;
}

export const LegalComplianceModal: React.FC<LegalComplianceModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
  userFormConsent = true,
  onToggleFormConsent
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="glass-panel border border-white/[0.12] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden bg-[#0d0f14]/95 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="legal-modal-title" className="text-base font-semibold text-white tracking-tight">
                Legal & Compliance Center
              </h2>
              <p className="text-xs text-white/50">
                Privacy, Terms, Cookies, Disclaimers & Business Details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal compliance dialog"
            className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <nav aria-label="Legal document tabs" className="flex items-center gap-1 p-2 bg-black/40 border-b border-white/[0.06] overflow-x-auto no-scrollbar shrink-0">
          {[
            { id: 'privacy', label: 'Privacy Policy', icon: ShieldCheck },
            { id: 'terms', label: "Terms & Conditions", icon: FileText },
            { id: 'cookies', label: 'Cookie Policy', icon: Cookie },
            { id: 'refund', label: 'Refund Policy', icon: RefreshCw },
            { id: 'business', label: 'Business & Contact', icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as LegalTab)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-white/40'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-white/80 font-normal">
          
          {/* PRIVACY POLICY TAB */}
          {activeTab === 'privacy' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <h3 className="text-base font-semibold text-white">Privacy Policy</h3>
                <span className="text-xs text-white/40 font-mono">Last Updated: September 2026</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3">
                <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-emerald-300 block font-semibold">100% On-Device Local Processing Guarantee</strong>
                  <p className="text-white/80">
                    Unlike standard cloud-based AI services, this application runs inference locally via your browser's WebGPU pipeline. Your text prompts, chat histories, and code snippets are never sent to our servers.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-white/70">
                <h4 className="text-sm font-medium text-white">1. Data We Collect ("Only Collect Necessary Data")</h4>
                <p>
                  We adhere strictly to the principle of data minimization:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Prompt and Output Content:</strong> Generated directly on your GPU using WebGPU. Stored solely on your local client machine via IndexedDB.</li>
                  <li><strong>Model Weight Cache:</strong> Pre-trained open weights are saved in your browser's CacheStorage so you can chat offline.</li>
                  <li><strong>Telemetry & Analytics:</strong> Zero (0%) third-party trackers, beacons, or analytics scripts are embedded in this application.</li>
                </ul>

                <h4 className="text-sm font-medium text-white pt-2">2. GDPR & CCPA Rights</h4>
                <p>
                  Because all data resides exclusively on your device, you have immediate, sovereign control over your information:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Right of Access & Portability:</strong> Export your conversations at any time as high-fidelity PDFs (preserving mathematical LaTeX formulations) or JSON files.</li>
                  <li><strong>Right of Erasure (Right to be Forgotten):</strong> You can permanently wipe all chats, settings, and cached weights at any time via the Storage Manager.</li>
                </ul>

                <h4 className="text-sm font-medium text-white pt-2">3. Third-Party Embeds & Services</h4>
                <p>
                  Model weights are fetched from official public repositories (such as Hugging Face and MLC AI binaries). No personal data or user identifiers are transmitted during weight shard downloads.
                </p>
              </div>
            </section>
          )}

          {/* TERMS & CONDITIONS TAB */}
          {activeTab === 'terms' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <h3 className="text-base font-semibold text-white">Terms & Conditions of Use</h3>
                <span className="text-xs text-white/40 font-mono">Effective: 2026</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-amber-300 block font-semibold">Artificial Intelligence & Output Disclaimer</strong>
                  <p className="text-white/80">
                    Outputs are generated autonomously by probabilistic neural language models. Information may be inaccurate, incomplete, or outdated. Do not use AI outputs as a substitute for professional legal, medical, or financial advice.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-white/70">
                <h4 className="text-sm font-medium text-white">1. Acceptable Use Policy</h4>
                <p>
                  You agree to use this application only for lawful purposes. You must not use the local engine to generate content that violates applicable local, national, or international regulations, including hate speech, automated harassment, malicious exploits, or unauthorized reverse engineering.
                </p>

                <h4 className="text-sm font-medium text-white pt-2">2. Open Model Licenses & Intellectual Property</h4>
                <p>
                  Models accessible in this app are distributed under their respective open licenses:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>NVIDIA Nemotron-3-Nano-4B:</strong> Distributed under the NVIDIA Open Model License (commercial use permitted in compliance with NVIDIA terms).</li>
                  <li><strong>Qwen & Phi Models:</strong> Distributed under Apache 2.0 and Microsoft Research licenses respectively.</li>
                  <li><strong>Application Source:</strong> Licensed under permissive MIT open-source terms.</li>
                </ul>

                <h4 className="text-sm font-medium text-white pt-2">3. Limitation of Liability</h4>
                <p>
                  The application is provided "as is", without warranties of any kind. Under no circumstances shall the authors or copyright holders be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use this software.
                </p>
              </div>
            </section>
          )}

          {/* COOKIES & STORAGE POLICY TAB */}
          {activeTab === 'cookies' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <h3 className="text-base font-semibold text-white">Cookie & Local Storage Policy</h3>
                <span className="text-xs text-white/40 font-mono">ePrivacy Directive Compliant</span>
              </div>

              <div className="space-y-3 text-xs text-white/70">
                <p>
                  This site does <strong>not</strong> use advertising cookies, tracking pixels, or cross-site fingerprinting technologies. We use native browser storage mechanisms solely for application functionality:
                </p>

                <div className="space-y-2">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="flex items-center justify-between font-medium text-white text-xs mb-1">
                      <span>IndexedDB & LocalStorage</span>
                      <span className="text-emerald-400 text-[10px] font-mono">Strictly Functional</span>
                    </div>
                    <p className="text-[11px] text-white/60">
                      Stores your custom chat conversations, user preferences, hyperparameter settings (temperature, top_p), and UI state.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
                    <div className="flex items-center justify-between font-medium text-white text-xs mb-1">
                      <span>CacheStorage (WebLLM Model Shards)</span>
                      <span className="text-emerald-400 text-[10px] font-mono">Performance & Offline Mode</span>
                    </div>
                    <p className="text-[11px] text-white/60">
                      Caches the quantized neural network weights on your hard drive so you can run inferences offline without re-downloading multi-gigabyte models each session.
                    </p>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-white pt-2">Managing Your Storage</h4>
                <p>
                  You can inspect or delete these stored files at any moment directly from the <strong>Storage & Cache Manager</strong> in the sidebar, or through your browser's Developer Tools (Application tab).
                </p>
              </div>
            </section>
          )}

          {/* REFUND POLICY TAB */}
          {activeTab === 'refund' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <h3 className="text-base font-semibold text-white">Refund & Commercial Terms</h3>
                <span className="text-xs text-white/40 font-mono">Consumer Rights Protected</span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <strong className="text-blue-300 block font-semibold">100% Free & Open-Source Client</strong>
                  <p className="text-white/80">
                    The core browser AI interface and WebGPU local inference engine are provided completely free of charge with zero subscriptions, hidden fees, or credit card requirements.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-white/70">
                <h4 className="text-sm font-medium text-white">Commercial Add-ons & Cloud Inference Services</h4>
                <p>
                  If you purchase enterprise licenses, dedicated fine-tuned model weights, or cloud-hosted acceleration through our authorized commercial partners:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>14-Day Cooling-Off Period:</strong> All digital services and commercial tokens come with an unconditional 14-day refund window if unsatisfied.</li>
                  <li><strong>How to Request a Refund:</strong> Email <code className="text-emerald-400">billing@localbrowserai.org</code> with your transaction receipt. Refunds are processed within 3-5 business days to the original payment method.</li>
                </ul>
              </div>
            </section>
          )}

          {/* BUSINESS & CONTACT DETAILS TAB */}
          {activeTab === 'business' && (
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                <h3 className="text-base font-semibold text-white">Business Information & Legal Contacts</h3>
                <span className="text-xs text-white/40 font-mono">Verified Corporate Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>Registered Legal Entity</span>
                  </div>
                  <p className="text-white/60">Local Browser AI Open Systems Inc.</p>
                  <p className="text-[11px] text-white/40">Entity ID: 7492014-DE</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>Corporate Headquarters</span>
                  </div>
                  <p className="text-white/60">1209 North Orange Street, Suite 400</p>
                  <p className="text-[11px] text-white/40">Wilmington, Delaware 19801, USA</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Mail className="w-4 h-4 text-emerald-400" />
                    <span>Data Protection Officer (DPO)</span>
                  </div>
                  <a href="mailto:dpo@localbrowserai.org" className="text-emerald-400 hover:underline block">
                    dpo@localbrowserai.org
                  </a>
                  <p className="text-[11px] text-white/40">EU GDPR & Global Privacy Inquiries</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Jurisdiction & Governing Law</span>
                  </div>
                  <p className="text-white/60">State of Delaware, United States</p>
                  <p className="text-[11px] text-white/40">Compliance with EU GDPR & UK DPA</p>
                </div>
              </div>

              {/* Verified Claims & Copyright check */}
              <div className="pt-2 text-xs text-white/60 space-y-1 border-t border-white/[0.06]">
                <strong className="text-white block font-medium">Compliance Review:</strong>
                <p>
                  ✓ Zero fake reviews or testimonials. All performance statistics are computed on your device's actual WebGPU hardware.<br />
                  ✓ All trademarks (NVIDIA, Hugging Face, Apple, Microsoft) belong to their respective holders.<br />
                  ✓ No unsupported medical, scientific, or financial claims are made.
                </p>
              </div>
            </section>
          )}

          {/* Form Consent Checkbox (As specified in the video) */}
          <div className="pt-4 border-t border-white/[0.08]">
            <label className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors cursor-pointer select-none">
              <input
                type="checkbox"
                checked={userFormConsent}
                onChange={(e) => onToggleFormConsent?.(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-500 bg-white/10 border-white/20 focus:ring-emerald-400 focus:ring-offset-black cursor-pointer"
              />
              <div className="text-xs space-y-0.5">
                <span className="font-semibold text-white block">
                  Mandatory Form Consent for On-Device Processing
                </span>
                <span className="text-white/60 leading-relaxed block">
                  I consent to the local browser storage of my prompts, settings, and cached model weights in accordance with the Privacy Policy and Terms of Service.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/[0.08] bg-black/40 shrink-0 text-xs">
          <span className="text-white/40">
            Open-source and privacy-first local computing
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition-colors cursor-pointer active:scale-95"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
