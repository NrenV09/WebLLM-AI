import React, { useState, useEffect } from 'react';
import { FileDown, Printer, Check, Loader2, AlertCircle, X, Sparkles, FileCode, FileText, Copy } from 'lucide-react';
import { ChatSession } from '../types';
import { exportChatSessionToPdf, printChatSessionViaBrowser } from '../utils/pdfExport';
import { downloadChatSessionAsLatex, generateLatexSource } from '../utils/latexExport';

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
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; filename: string } | null>(null);
  const [latexDownloaded, setLatexDownloaded] = useState(false);
  const [latexCopied, setLatexCopied] = useState(false);

  // Clean state when modal closes
  useEffect(() => {
    if (!isOpen || !session) {
      setStage('idle');
      setErrorMessage(null);
      setLatexDownloaded(false);
      setLatexCopied(false);
      if (downloadInfo) {
        URL.revokeObjectURL(downloadInfo.url);
        setDownloadInfo(null);
      }
    }
  }, [isOpen, session]);

  // Clean up object URL when component unmounts completely
  useEffect(() => {
    return () => {
      if (downloadInfo) {
        URL.revokeObjectURL(downloadInfo.url);
      }
    };
  }, [downloadInfo]);

  if (!isOpen || !session) return null;

  const handleManualDownload = async () => {
    try {
      setErrorMessage(null);
      if (downloadInfo) {
        URL.revokeObjectURL(downloadInfo.url);
        setDownloadInfo(null);
      }
      const { blob, filename } = await exportChatSessionToPdf(session, preprocessLatex, setStage);
      const url = URL.createObjectURL(blob);
      setDownloadInfo({ url, filename });
    } catch (err: any) {
      setStage('error');
      setErrorMessage(err?.message || 'Download failed. Please try LaTeX (.tex) or browser print.');
    }
  };

  const handleDownloadLatex = () => {
    if (!session) return;
    downloadChatSessionAsLatex(session);
    setLatexDownloaded(true);
    setTimeout(() => setLatexDownloaded(false), 3000);
  };

  const handleCopyLatex = async () => {
    if (!session) return;
    try {
      const tex = generateLatexSource(session);
      await navigator.clipboard.writeText(tex);
      setLatexCopied(true);
      setTimeout(() => setLatexCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
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
        className="w-full max-w-lg bg-[#0c0d12]/95 border border-white/[0.12] rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-2xl animate-in zoom-in-95 duration-200"
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
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
            <FileCode className="w-5 h-5 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h2 className="text-base font-semibold text-white tracking-tight truncate">
              Save Chat as LaTeX / PDF
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
              <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                <FileCode className="w-4 h-4 text-purple-400" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white">
                {stage === 'preparing' && 'Formatting document & LaTeX math...'}
                {stage === 'generating' && 'Rendering PDF pages...'}
                {stage === 'done' && 'PDF ready for download!'}
                {stage === 'error' && 'PDF renderer notice'}
                {stage === 'idle' && '100% Offline LaTeX & PDF Export'}
              </div>
              <div className="text-[11px] text-white/40 mt-0.5">
                {stage === 'preparing' && 'Normalizing KaTeX formulas, symbols, and equations'}
                {stage === 'generating' && 'Packaging vector and typography layout into .pdf'}
                {stage === 'done' && 'Click Download PDF below or get the raw .tex LaTeX source.'}
                {stage === 'error' && (errorMessage || 'You can download the LaTeX source (.tex) or use browser print')}
                {stage === 'idle' && 'Zero internet connection required. All mathematical formulations export offline.'}
              </div>
            </div>
          </div>
        </div>

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {/* Option 1: Direct LaTeX (.tex) */}
          <div className="p-3.5 rounded-2xl bg-purple-500/[0.04] border border-purple-500/20 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-xs text-purple-300">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span>LaTeX Source (.tex)</span>
              </div>
              <p className="text-[11px] text-white/50 mt-1 leading-snug">
                Compilable LaTeX document with full preamble, amsmath packages, and formulas. 100% offline.
              </p>
            </div>
            
            <div className="space-y-1.5">
              <button
                type="button"
                id="download-latex-btn"
                onClick={handleDownloadLatex}
                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  latexDownloaded
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 active:scale-95'
                }`}
              >
                {latexDownloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved .tex File!</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-3.5 h-3.5 text-white" />
                    <span>Download LaTeX (.tex)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="copy-latex-btn"
                onClick={handleCopyLatex}
                className="w-full py-1.5 px-3 rounded-xl text-xs font-medium text-white/70 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {latexCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white/60" />
                    <span>Copy LaTeX Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Option 2: Rendered PDF Document */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                <FileDown className="w-4 h-4 text-blue-400" />
                <span>Formatted PDF Document</span>
              </div>
              <p className="text-[11px] text-white/40 mt-1 leading-snug">
                Formatted publication-grade document with rendered mathematical equations and syntax styling.
              </p>
            </div>

            {stage === 'done' && downloadInfo ? (
              <a
                href={downloadInfo.url}
                download={downloadInfo.filename}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save PDF File</span>
              </a>
            ) : (
              <button
                type="button"
                id="download-pdf-again-btn"
                onClick={handleManualDownload}
                disabled={isWorking}
                className="w-full py-2 px-3 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isWorking ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>Generate PDF File</span>
              </button>
            )}
          </div>
        </div>

        {/* Vector Print Option Footer */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
          <div className="text-[11px] text-white/40 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400/80" />
            <span>100% Offline • Works with or without Wi-Fi</span>
          </div>

          <button
            type="button"
            id="print-pdf-browser-btn"
            onClick={handleBrowserPrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/[0.1] text-xs font-medium transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="Open browser print dialog for 100% Vector PDF"
          >
            {isPrinting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5 text-white/70" />
            )}
            <span>Browser Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};

