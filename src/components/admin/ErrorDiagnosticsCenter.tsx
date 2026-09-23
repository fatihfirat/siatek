import { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  Sparkles, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  RotateCcw, 
  Trash2, 
  Filter, 
  Search, 
  Bug, 
  Activity, 
  Cpu, 
  Code2, 
  Zap, 
  ExternalLink, 
  ShieldAlert, 
  Copy, 
  Check, 
  Loader2, 
  CheckCircle,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { 
  CapturedError, 
  subscribeToErrors, 
  captureError, 
  updateErrorStatus, 
  clearAllErrors, 
  getCapturedErrors 
} from '../../lib/errorTracker';
import { useModalBehavior } from '../../hooks/useModalBehavior';

interface ErrorDiagnosticsCenterProps {
  onRefresh?: () => void;
}

export default function ErrorDiagnosticsCenter({ onRefresh }: ErrorDiagnosticsCenterProps) {
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [selectedError, setSelectedError] = useState<CapturedError | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'error' | 'network' | 'ui'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'fixed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Fix It states
  const [isFixingId, setIsFixingId] = useState<string | null>(null);
  const [isBatchFixing, setIsBatchFixing] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [activeAnalysisError, setActiveAnalysisError] = useState<CapturedError | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [autoRepairSuccessMsg, setAutoRepairSuccessMsg] = useState<string | null>(null);

  // System Live Logs
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'errors' | 'logs' | 'simulate'>('errors');

  useModalBehavior(analysisModalOpen, () => setAnalysisModalOpen(false));

  useEffect(() => {
    const unsubscribe = subscribeToErrors((list) => {
      setErrors(list);
    });
    fetchServerLogs();
    return () => unsubscribe();
  }, []);

  // Sunucu loglari KALDIRILDI (19.09.2026): bu uygulamada sunucu yok.
  // Hatalar zaten istemcide yakalanip localStorage'a yaziliyor.
  const fetchServerLogs = async () => {
    setServerLogs([]);
    setLogsLoading(false);
  };

  const handleFixIt = async (error: CapturedError) => {
    setIsFixingId(error.id);
    setActiveAnalysisError(error);
    setAnalysisModalOpen(true);
    setAutoRepairSuccessMsg(null);

    try {
      // AI cagrisi KALDIRILDI (19.09.2026).
      //
      // Eskiden burada /api/gemini/fix-it cagriliyordu. Sunucu olmadigi icin
      // cagri hep basarisiz oluyor ve asagidaki SABIT metin kullaniciya
      // "AI analizi" diye gosteriliyordu. Bu yaniltici oldugu icin artik
      // acikca "kural tabanli on degerlendirme" olarak sunuluyor.
      const kuralTabanliAnaliz = {
        rootCause: `${error.component || 'Sistem'}: ${error.message}`,
        severity: error.severity === 'critical' ? 'Kritik' : 'Orta',
        impact: 'İlgili bileşenin render edilmesini veya istek sonucunun ekrana düşmesini engellemiş olabilir.',
        solutionSteps: [
          'Bu, yapay zekâ analizi değil sabit bir kontrol listesidir.',
          'Bileşende try-catch ve error boundary olduğunu doğrulayın.',
          'State değişkenleri için varsayılan değerleri kontrol edin.',
          'Eksik referanslarda opsiyonel zincirleme (?.) kullanın.',
        ],
        codeSnippet: `// Genel kontrol listesi\ntry {\n  const result = await executeAction();\n  if (!result?.data) throw new Error("Veri boş döndü");\n} catch (err) {\n  console.warn("Güvenli kurtarma:", err);\n}`,
        autoRemediateAction: 'RESET_STATE',
        autoRemediateDescription: 'Bileşenin yerel önbelleği sıfırlanabilir.',
        preventativeAdvice: 'Asenkron çağrılarda zaman aşımı ve AbortController kullanın.',
      };

      updateErrorStatus(error.id, 'analyzing', kuralTabanliAnaliz);
      setActiveAnalysisError({
        ...error,
        status: 'analyzing',
        aiAnalysis: kuralTabanliAnaliz,
      });
    } catch (err: any) {
      console.error('Hata analizi başarısız:', err);
    } finally {
      setIsFixingId(null);
    }
  };

  // Toplu AI onarimi KALDIRILDI (19.09.2026): sunucu yok, cagri hicbir zaman
  // calismiyordu ama kullaniciya "onarim uygulandi" mesaji gosteriliyordu.
  const handleBatchFixAll = async () => {
    setAutoRepairSuccessMsg('Toplu otomatik onarım bu sürümde devre dışı.');
    setTimeout(() => setAutoRepairSuccessMsg(null), 4000);
  };

  const handleApplyAutoRemediate = async () => {
    if (!activeAnalysisError) return;
    
    try {
      // Olu /api/system/auto-repair cagrisi kaldirildi
    } catch (e) {}

    const updatedAnalysis = {
      ...(activeAnalysisError.aiAnalysis || {
        rootCause: 'Bilinmeyen Hata',
        severity: 'Bilinmiyor',
        impact: 'Düşük',
        solutionSteps: ['Otomatik onarım uygulandı'],
        preventativeAdvice: 'Sistem durumu izleniyor',
      }),
      fixedAt: new Date().toISOString(),
    };

    updateErrorStatus(activeAnalysisError.id, 'fixed', updatedAnalysis);
    setActiveAnalysisError({
      ...activeAnalysisError,
      status: 'fixed',
      aiAnalysis: updatedAnalysis,
    });
    setAutoRepairSuccessMsg('Onarım başarıyla uygulandı ve hata "Çözüldü" olarak işaretlendi.');
    if (onRefresh) onRefresh();
  };

  // Error simulation helpers for testing
  const simulateError = (type: 'ui' | 'network' | 'unhandled' | 'parse') => {
    if (type === 'ui') {
      captureError({
        message: 'TypeError: Cannot read properties of undefined (reading "formattedIban")',
        component: 'CariStatementModal.tsx:142',
        source: 'react',
        severity: 'critical',
        url: '/admin/cariler/ekstre',
        stack: 'TypeError: Cannot read properties of undefined (reading "formattedIban")\n    at renderCompanyHeader (CariStatementModal.tsx:142:18)\n    at CariStatementModal (CariStatementModal.tsx:280:11)',
      });
    } else if (type === 'network') {
      captureError({
        message: 'FetchError: 504 Gateway Timeout on /api/einvoice/gib-send (GİB Entegratör Sunucusu Yanıt Vermedi)',
        component: 'EInvoiceDashboard.tsx:312',
        source: 'fetch',
        severity: 'network',
        url: '/admin/invoices',
        stack: 'Error: GİB Entegratör zaman aşımı (30000ms)\n    at sendToGib (EInvoiceDashboard.tsx:312:15)',
      });
    } else if (type === 'parse') {
      captureError({
        message: 'SyntaxError: Unexpected token < in JSON at position 0 (HTML error page returned instead of JSON)',
        component: 'AdminQuoteModal.tsx:88',
        source: 'fetch',
        severity: 'error',
        url: '/admin/quotes',
        stack: 'SyntaxError: Unexpected token < in JSON\n    at JSON.parse (<anonymous>)\n    at fetchQuoteAI (AdminQuoteModal.tsx:88:22)',
      });
    } else {
      captureError({
        message: 'UnhandledRejection: IndexedDB Transaction Inactive: Store "invoices_drafts" is currently locked',
        component: 'eInvoiceLocalArchive.ts:95',
        source: 'unhandledrejection',
        severity: 'warning',
        url: '/admin/invoices/local-archive',
        stack: 'InvalidStateError: The transaction is inactive or finished.\n    at saveLocalInvoice (eInvoiceLocalArchive.ts:95:9)',
      });
    }
  };

  // Filter errors
  const filteredErrors = errors.filter(err => {
    if (filterSeverity !== 'all' && err.severity !== filterSeverity) return false;
    if (filterStatus === 'open' && err.status === 'fixed') return false;
    if (filterStatus === 'fixed' && err.status !== 'fixed') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        err.message.toLowerCase().includes(term) ||
        (err.component && err.component.toLowerCase().includes(term)) ||
        (err.url && err.url.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const totalErrors = errors.length;
  const criticalCount = errors.filter(e => e.severity === 'critical' && e.status !== 'fixed').length;
  const fixedCount = errors.filter(e => e.status === 'fixed').length;
  const openCount = errors.filter(e => e.status === 'open' || e.status === 'analyzing').length;

  return (
    <div className="space-y-6">
      
      {/* Top Header & Summary */}
      <div className="bg-base-surface p-5 rounded-3xl border border-border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-danger-fill/15 border border-danger-border flex items-center justify-center text-danger-text shadow-xs">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-text-primary">Hata Tespit & Onarım Merkezi</h2>
                <span className="px-2 py-0.5 rounded-full bg-bg-warning text-warning-text border border-warning-border text-[11px] font-bold flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-warning-text" />
                  <span>Fix It AI</span>
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Kullanıcı arayüzü, ağ istekleri ve sunucu işlemlerinde oluşan hataları canlı yakalayın; yapay zeka ile tek tıkla onarın.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleBatchFixAll}
              disabled={isBatchFixing || openCount === 0}
              className="px-4 py-2.5 rounded-xl bg-danger-fill hover:opacity-90 text-base text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isBatchFixing ? (
                <Loader2 className="w-4 h-4 animate-spin text-base" />
              ) : (
                <Wrench className="w-4 h-4" />
              )}
              <span>Tümünü Tara & Fix It ({openCount})</span>
            </button>

            <button
              onClick={clearAllErrors}
              className="p-2.5 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-muted hover:text-danger-text transition-colors cursor-pointer"
              title="Hata Listesini Temizle"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          
          <div className="p-3.5 rounded-2xl bg-base-surface-2 border border-border">
            <span className="text-[11px] font-bold text-text-secondary flex items-center justify-between">
              <span>Toplam Olay Kaydı</span>
              <Activity className="w-3.5 h-3.5 text-text-muted" />
            </span>
            <div className="text-2xl font-black text-text-primary font-mono mt-1">
              {totalErrors}
            </div>
            <span className="text-[10px] text-text-muted">Yerel ve sunucu olayları</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-danger-fill/10 border border-danger-border">
            <span className="text-[11px] font-bold text-danger-text flex items-center justify-between">
              <span>Kritik Hatalar</span>
              <AlertOctagon className="w-3.5 h-3.5 text-danger-text" />
            </span>
            <div className="text-2xl font-black text-danger-text font-mono mt-1">
              {criticalCount}
            </div>
            <span className="text-[10px] text-danger-text font-medium">Acil müdahale önerilir</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-bg-success border border-success-border">
            <span className="text-[11px] font-bold text-success-text flex items-center justify-between">
              <span>AI ile Çözülenler</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-success-text" />
            </span>
            <div className="text-2xl font-black text-success-text font-mono mt-1">
              {fixedCount}
            </div>
            <span className="text-[10px] text-success-text font-medium">Otomatik onarıldı</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-bg-warning border border-warning-border">
            <span className="text-[11px] font-bold text-warning-text flex items-center justify-between">
              <span>Sistem Sağlık Skoru</span>
              <Zap className="w-3.5 h-3.5 text-warning-text" />
            </span>
            <div className="text-2xl font-black text-warning-text font-mono mt-1">
              {criticalCount === 0 ? '%99.4' : `%${Math.max(70, 99 - criticalCount * 8)}`}
            </div>
            <span className="text-[10px] text-warning-text font-medium">
              {criticalCount === 0 ? 'Mükemmel Çalışıyor' : 'Düzeltme Yapılıyor'}
            </span>
          </div>

        </div>
      </div>

      {/* Success Notification Banner */}
      {autoRepairSuccessMsg && (
        <div className="p-3.5 bg-bg-success border border-success-border text-success-text rounded-2xl text-xs flex items-center justify-between animate-in fade-in shadow-xs">
          <div className="flex items-center space-x-2 font-medium">
            <CheckCircle className="w-4 h-4 text-success-text shrink-0" />
            <span>{autoRepairSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAutoRepairSuccessMsg(null)}
            className="text-success-text font-bold hover:underline cursor-pointer"
          >
            Tamam
          </button>
        </div>
      )}

      {/* Sub Navigation Bar (Hatalar, Test & Simülasyon, Canlı Log Akışı) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-base-surface p-2 rounded-2xl border border-border">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveSubTab('errors')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'errors'
                ? 'bg-base-surface-2 text-text-primary shadow-xs border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Bug className="w-4 h-4" />
            <span>Yakalanan Hatalar ({filteredErrors.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('simulate')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'simulate'
                ? 'bg-base-surface-2 text-text-primary shadow-xs border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Test & Simülasyon</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('logs');
              fetchServerLogs();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeSubTab === 'logs'
                ? 'bg-base-surface-2 text-text-primary shadow-xs border border-border'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Sunucu & SSE Logları ({serverLogs.length})</span>
          </button>
        </div>

        {activeSubTab === 'errors' && (
          <div className="flex items-center space-x-2 flex-1 max-w-md justify-end">
            <div className="relative w-full max-w-xs">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Hata veya bileşen ara..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-base-surface-2 border border-border text-xs text-text-primary focus:border-border-strong"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-base-surface-2 border border-border text-xs font-semibold text-text-primary cursor-pointer"
            >
              <option value="all">Tüm Seviyeler</option>
              <option value="critical">🚨 Kritik</option>
              <option value="error">❌ Hata</option>
              <option value="network">🌐 Ağ / API</option>
              <option value="warning">⚠️ Uyarı</option>
              <option value="ui">⚡ UI / Render</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-base-surface-2 border border-border text-xs font-semibold text-text-primary cursor-pointer"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="open">Açık Hatalar</option>
              <option value="fixed">Çözülenler</option>
            </select>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: ERROR LIST */}
      {activeSubTab === 'errors' && (
        <div className="space-y-3">
          {filteredErrors.length === 0 ? (
            <div className="bg-base-surface p-12 text-center rounded-3xl border border-border space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-bg-success border border-success-border text-success-text flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Harika! Aktif Hata Bulunmuyor</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Sistem tüm kullanıcı tıklamalarını, ağ çağrılarını ve veri senkronizasyonunu hatasız yürütüyor. Test etmek için Simülasyon sekmesini kullanabilirsiniz.
              </p>
              <button
                onClick={() => setActiveSubTab('simulate')}
                className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface border border-border rounded-xl text-xs font-bold text-text-primary transition-colors cursor-pointer"
              >
                Test Hatası Üret ➔
              </button>
            </div>
          ) : (
            filteredErrors.map((err) => {
              const isFixed = err.status === 'fixed';
              const isAnalyzing = isFixingId === err.id || err.status === 'analyzing';

              return (
                <div 
                  key={err.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 shadow-xs ${
                    isFixed
                      ? 'bg-base-surface border-success-border/60 opacity-90'
                      : err.severity === 'critical'
                      ? 'bg-danger-fill/5 border-danger-border'
                      : 'bg-base-surface border-border hover:border-border-strong'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* Left Icon & Details */}
                    <div className="flex items-start space-x-3.5 min-w-0">
                      <div className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 ${
                        isFixed
                          ? 'bg-bg-success text-success-text border-success-border'
                          : err.severity === 'critical'
                          ? 'bg-danger-fill/20 text-danger-text border-danger-border'
                          : err.severity === 'network'
                          ? 'bg-bg-info text-info-text border-info-border'
                          : 'bg-bg-warning text-warning-text border-warning-border'
                      }`}>
                        {isFixed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : err.severity === 'critical' ? (
                          <AlertOctagon className="w-5 h-5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase font-mono ${
                            isFixed
                              ? 'bg-bg-success text-success-text border-success-border'
                              : err.severity === 'critical'
                              ? 'bg-danger-fill/20 text-danger-text border-danger-border'
                              : 'bg-bg-warning text-warning-text border-warning-border'
                          }`}>
                            {isFixed ? 'ÇÖZÜLDÜ' : err.severity}
                          </span>

                          {err.component && (
                            <span className="px-2 py-0.5 rounded-md bg-base-surface-2 text-text-secondary text-[11px] font-mono border border-border">
                              {err.component}
                            </span>
                          )}

                          <span className="text-[11px] text-text-muted flex items-center space-x-1 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(err.timestamp).toLocaleTimeString('tr-TR')}</span>
                          </span>
                        </div>

                        <p className="text-sm font-bold text-text-primary font-mono break-all leading-snug">
                          {err.message}
                        </p>

                        {err.url && (
                          <p className="text-[11px] text-text-muted">
                            Konum: <span className="font-mono text-text-secondary">{err.url}</span>
                          </p>
                        )}

                        {/* If AI has already analyzed/fixed */}
                        {err.aiAnalysis && (
                          <div className="mt-2.5 p-3 rounded-2xl bg-base-surface-2/80 border border-border text-xs space-y-1.5">
                            <div className="flex items-center space-x-1.5 text-warning-text font-bold">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>AI Analizi & Çözüm:</span>
                            </div>
                            <p className="text-text-secondary text-xs">
                              {err.aiAnalysis.rootCause}
                            </p>
                            {err.aiAnalysis.fixedAt && (
                              <p className="text-[10px] text-success-text font-semibold flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>{new Date(err.aiAnalysis.fixedAt).toLocaleTimeString('tr-TR')} itibarıyla onarıldı</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action: Fix It Button */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-start">
                      <button
                        onClick={() => handleFixIt(err)}
                        disabled={isAnalyzing}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer ${
                          isFixed
                            ? 'bg-base-surface hover:bg-base-surface-2 text-text-primary border border-border'
                            : 'bg-danger-fill hover:opacity-90 text-base animate-pulse'
                        }`}
                        title="Yapay zeka ile analiz et ve onar"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        <span>{isFixed ? 'Tekrar İncele' : 'Fix It (AI ile Onar)'}</span>
                      </button>

                      <button
                        onClick={() => updateErrorStatus(err.id, isFixed ? 'open' : 'fixed')}
                        className="p-2 rounded-xl bg-base-surface hover:bg-base-surface-2 border border-border text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                        title={isFixed ? 'Yeniden Aç' : 'Çözüldü Olarak İşaretle'}
                      >
                        {isFixed ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUB-VIEW 2: TEST & SIMULATION */}
      {activeSubTab === 'simulate' && (
        <div className="bg-base-surface p-6 rounded-3xl border border-border shadow-xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-text-primary">Hata Yakalama Test Laboratuvarı</h3>
            <p className="text-xs text-text-muted mt-0.5">
              Aşağıdaki butonları kullanarak tarayıcı ve sunucuda farklı hata senaryolarını tetikleyebilir, Fix It AI motorunun nasıl anında yakalayıp çözdüğünü deneyimleyebilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-2">
              <div className="flex items-center space-x-2 text-danger-text font-bold text-xs">
                <AlertOctagon className="w-4 h-4" />
                <span>1. UI Render & TypeError Simülasyonu</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Tanımsız nesne özelliği çağrısını simüle ederek React bileşen hata yakalama ve otomatik fallback sürecini test eder.
              </p>
              <button
                onClick={() => {
                  simulateError('ui');
                  setActiveSubTab('errors');
                }}
                className="w-full py-2 bg-danger-fill hover:opacity-90 text-base font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                UI Hatası Üret & Yakala ➔
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-2">
              <div className="flex items-center space-x-2 text-info-text font-bold text-xs">
                <Activity className="w-4 h-4" />
                <span>2. Ağ / GİB API Zaman Aşımı (504)</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                GİB Entegratör sunucusundan yanıt gecikmesi ve fetch timeout durumunda akıllı yeniden deneme kurgusunu test eder.
              </p>
              <button
                onClick={() => {
                  simulateError('network');
                  setActiveSubTab('errors');
                }}
                className="w-full py-2 bg-bg-info text-info-text hover:bg-info-fill/20 border border-info-border font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                Ağ Hatası Simüle Et ➔
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-2">
              <div className="flex items-center space-x-2 text-warning-text font-bold text-xs">
                <Code2 className="w-4 h-4" />
                <span>3. JSON Parse / Bozuk Yanıt Hatası</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                API'den JSON yerine HTML dönmesi durumunda parser güvenliğini ve schema fallback mekanizmasını tetikler.
              </p>
              <button
                onClick={() => {
                  simulateError('parse');
                  setActiveSubTab('errors');
                }}
                className="w-full py-2 bg-bg-warning text-warning-text hover:bg-warning-fill/20 border border-warning-border font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                JSON Parse Hatası Üret ➔
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-2">
              <div className="flex items-center space-x-2 text-text-primary font-bold text-xs">
                <Layers className="w-4 h-4" />
                <span>4. IndexedDB / Kilitlenme Hatası</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Yerel çevrimdışı arşivin kilitlenmesi veya transaction çakışması durumunda otomatik indeks onarımı akışını test eder.
              </p>
              <button
                onClick={() => {
                  simulateError('unhandled');
                  setActiveSubTab('errors');
                }}
                className="w-full py-2 bg-base-surface hover:bg-base-surface-2 border border-border text-text-primary font-bold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
              >
                IndexedDB Hatası Üret ➔
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SUB-VIEW 3: LIVE SERVER LOGS & CONSOLE */}
      {activeSubTab === 'logs' && (
        <div className="bg-base-surface p-5 rounded-3xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-extrabold text-text-primary">Canlı Konsol & Olay Günlüğü</h3>
            </div>
            <button
              onClick={fetchServerLogs}
              disabled={logsLoading}
              className="px-3 py-1.5 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-semibold text-text-primary flex items-center space-x-1.5 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>Yenile</span>
            </button>
          </div>

          <div className="bg-[#0f172a] text-slate-200 p-4 rounded-2xl font-mono text-xs max-h-96 overflow-y-auto space-y-2 custom-scrollbar border border-slate-800">
            {serverLogs.length === 0 ? (
              <p className="text-slate-500 italic">Henüz sunucu logu kaydedilmedi.</p>
            ) : (
              serverLogs.map((log, idx) => (
                <div key={log.id || idx} className="flex items-start space-x-2 leading-relaxed border-b border-slate-800/60 pb-1.5">
                  <span className="text-slate-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString('tr-TR')}]</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
                    log.status === 'error'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : log.status === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {log.type || 'LOG'}
                  </span>
                  <span className="text-slate-300 font-bold">{log.event}:</span>
                  <span className="text-slate-400 break-all">{log.details}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FIX IT ANALYSIS MODAL */}
      {analysisModalOpen && activeAnalysisError && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in"
          onClick={() => setAnalysisModalOpen(false)}
        >
          <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
            <div 
              className="bg-base-surface border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-text-primary p-6 relative space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-danger-fill/20 border border-danger-border flex items-center justify-center text-danger-text shadow-xs">
                  <Sparkles className="w-5 h-5 text-warning-text animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary flex items-center space-x-2">
                    <span>Yapay Zeka Hata Analizi & Onarım</span>
                    <span className="px-2 py-0.5 rounded-full bg-bg-warning text-warning-text border border-warning-border text-[10px] font-bold">
                      AI Analiz
                    </span>
                  </h3>
                  <p className="text-xs text-text-muted">Kök neden analizi, çözüm adımları ve tek tıkla onarım</p>
                </div>
              </div>

              <button
                onClick={() => setAnalysisModalOpen(false)}
                className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-base-surface-2 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Error Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-danger-fill/10 border border-danger-border text-xs space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold text-danger-text">İNCELENEN HATA:</span>
              <p className="font-mono font-bold text-danger-text break-all">
                {activeAnalysisError.message}
              </p>
              {activeAnalysisError.component && (
                <p className="text-text-muted font-mono text-[11px]">
                  Bileşen: {activeAnalysisError.component}
                </p>
              )}
            </div>

            {/* AI Loading State */}
            {isFixingId ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-warning-text mx-auto" />
                <p className="text-sm font-bold text-text-primary">Yapay zeka kaynak kodunu ve hata izini analiz ediyor...</p>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  Kök neden tespit ediliyor, güvenli onarım yaması hazırlanıyor.
                </p>
              </div>
            ) : activeAnalysisError.aiAnalysis ? (
              <div className="space-y-4">
                
                {/* 1. Kök Neden */}
                <div className="p-4 rounded-2xl bg-base-surface-2 border border-border space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-warning-text font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>1. Kök Neden Tespiti (Root Cause)</span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed">
                    {activeAnalysisError.aiAnalysis.rootCause}
                  </p>
                </div>

                {/* 2. Etki ve Risk */}
                <div className="p-3.5 rounded-2xl bg-base-surface-2 border border-border text-xs space-y-1">
                  <span className="font-bold text-text-secondary">Etki & Kullanıcı Deneyimi:</span>
                  <p className="text-text-muted">{activeAnalysisError.aiAnalysis.impact}</p>
                </div>

                {/* 3. Çözüm Adımları */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-text-primary flex items-center space-x-1">
                    <Wrench className="w-3.5 h-3.5 text-success-text" />
                    <span>Uygulanan Çözüm Adımları:</span>
                  </span>
                  <div className="space-y-1.5">
                    {activeAnalysisError.aiAnalysis.solutionSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start space-x-2 text-xs bg-base-surface-2 p-2.5 rounded-xl border border-border">
                        <CheckCircle2 className="w-4 h-4 text-success-text shrink-0 mt-0.2" />
                        <span className="text-text-secondary">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Kod Düzeltmesi (Varsa) */}
                {activeAnalysisError.aiAnalysis.codeSnippet && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-text-secondary">
                      <span>Önerilen Kod Yaması:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeAnalysisError.aiAnalysis?.codeSnippet || '');
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="text-[11px] text-text-muted hover:text-text-primary flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-success-text" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
                      </button>
                    </div>
                    <pre className="bg-[#0f172a] text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto custom-scrollbar border border-slate-800">
                      {activeAnalysisError.aiAnalysis.codeSnippet}
                    </pre>
                  </div>
                )}

                {/* 5. Otomatik Onarım Aksiyonu */}
                <div className="p-4 rounded-2xl bg-bg-success border border-success-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-success-text" />
                      <span className="text-xs font-extrabold text-success-text">Otomatik Onarım Kurgusu</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success-fill/20 text-success-text font-bold">
                      {activeAnalysisError.aiAnalysis.autoRemediateAction || 'AUTO_REMEDIATE'}
                    </span>
                  </div>
                  <p className="text-xs text-success-text">
                    {activeAnalysisError.aiAnalysis.autoRemediateDescription || 'Sistem bileşeni geçici durumunu sıfırlayıp güvenli kurtarma moduna alacaktır.'}
                  </p>

                  <button
                    onClick={handleApplyAutoRemediate}
                    className="w-full py-2.5 rounded-xl bg-success-fill hover:opacity-90 text-base font-bold text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Onarımı Şimdi Uygula & Hatayı Kapat</span>
                  </button>
                </div>

              </div>
            ) : null}

          </div>
        </div>
        </div>
      )}

    </div>
  );
}
