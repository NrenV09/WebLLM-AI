import React, { useState, useEffect } from 'react';
import { FileDown, Printer, Check, Loader2, AlertCircle, X, Sparkles } from 'lucide-react';
import { ChatSession } from '../types';
import { exportChatSessionToPdf, printChatSessionViaBrowser } from '../utils/pdfExport';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ChatSession | null;
  preprocessLatex: (content: string) => string;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  session,
  preprocessLatex
}) => {
  const [stage, setStage] = useState<'idle' | 'preparing' | 'generating' | 'done' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Auto-trigger export when opened
  useEffect(() => {
    if (!isOpen || !session) {
      setStage('idle');
      setErrorMessage(null);
      return;
    }

    let isMounted = true;

    const runExport = async () => {
      try {
        setErrorMessage(null);
        await exportChatSessionToPdf(
          session,
          preprocessLatex,
          (stg) => {
            if (isMounted) setStage(stg);
          }
        );
      } catch (err: any) {
        console.error('PDF Export error:', err);
        if (isMounted) {
          setStage('error');
          setErrorMessage(err?.message || 'Failed to generate PDF. You can try the browser print alternative below.');
        }
      }
    };

    runExport();

    return () => {
      isMounted = false;
    };
  }, [isOpen, session, preprocessLatex]);

  if (!isOpen || !session) return null;

  const handleManualDownload = async () => {
    try {
      setErrorMessage(null);
      await exportChatSessionToPdf(session, preprocessLatex, setStage);
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err?.message || 'Download failed. Please try browser print.');
    }
  };

  const handleBrowserPrint = async () => {
    try {
      setIsPrinting(true);
      await printChatSessionViaBrowser(session, preprocessLatex);
    } catch (err: any) {
      console.warn('Browser print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const isWorking = stage === 'preparing' || stage === 'generating';

  return (
    <div
      id="pdf-export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="pdf-export-modal"
        className="w-full max-w-md bg-[#0c0d12]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Close Button */}
        <button
          type="button"
          id="close-pdf-modal-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <FileDown className="w-5 h-5 text-blue-400" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h2 className="text-base font-semibold text-white tracking-tight truncate">
              Save Chat as PDF
            </h2>
            <p className="text-xs text-white/50 truncate">
              "{session.title}"
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div className="mb-5 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
          <div className="flex items-center gap-3">
            {isWorking ? (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
            ) : stage === 'done' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
            ) : stage === 'error' ? (
              <div className="w-8 h-8 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
            ) : null}

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white">
                {stage === 'preparing' && 'Formatting document & LaTeX math...'}
                {stage === 'generating' && 'Rendering PDF pages...'}
                {stage === 'done' && 'PDF successfully generated!'}
                {stage === 'error' && 'Export encountered an issue'}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {stage === 'preparing' && 'Normalizing KaTeX formulas, symbols, and equations'}
                {stage === 'generating' && 'Packaging vector and typography layout into .pdf'}
                {stage === 'done' && 'Your browser should start downloading the file automatically'}
                {stage === 'error' && (errorMessage || 'Please try again or use the browser print option')}
              </div>
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mb-6 space-y-1.5 text-xs text-white/60 bg-white/[0.02] p-3 rounded-xl border border-white/[0.05]">
          <div className="flex items-center gap-2 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-[#a8c7fa] shrink-0" />
            <span>LaTeX formulas ($...$ &amp; $$...$$) rendered in mathematical notation</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Clean print typography with full code block and table formatting</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            id="download-pdf-again-btn"
            onClick={handleManualDownload}
            disabled={isWorking}
            className="w-full flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {isWorking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileDown className="w-3.5 h-3.5" />
            )}
            <span>{stage === 'done' ? 'Download PDF again' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            id="print-pdf-browser-btn"
            onClick={handleBrowserPrint}
            disabled={isPrinting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/90 hover:text-white border border-white/[0.1] text-xs font-medium transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Open browser print dialog for 100% Vector PDF"
          >
            {isPrinting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5 text-white/70" />
            )}
            <span>Print / Vector PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
