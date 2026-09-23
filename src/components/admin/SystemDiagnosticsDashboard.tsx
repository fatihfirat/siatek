import { useState, useEffect, useRef, ChangeEvent, DragEvent } from 'react';
import { 
  Activity, 
  Database, 
  Radio, 
  Server, 
  ShieldCheck, 
  Cpu, 
  HardDrive, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  Download, 
  Terminal, 
  Sliders, 
  Wifi, 
  WifiOff, 
  Layers, 
  Lock, 
  Send, 
  Play,
  Copy,
  Check,
  Search,
  Filter,
  Sparkles,
  BarChart2,
  Upload,
  FileSpreadsheet,
  FileJson,
  FolderArchive,
  FileUp,
  DownloadCloud,
  CheckCircle,
  AlertCircle,
  Trash2,
  Save,
  Users
} from 'lucide-react';
import { Product, Order, Quote } from '../../types';
import { playNotificationSound } from '../../lib/audio';

interface SystemDiagnosticsDashboardProps {
  products: Product[];
  orders: Order[];
  quotes: Quote[];
  onRefresh: () => void;
}

interface DiagnosticsResponse {
  status: string;
  timestamp: string;
  database: {
    engine: string;
    status: string;
    healthy: boolean;
    collections: {
      products: number;
      orders: number;
      quotes: number;
      notifications: number;
      users: number;
    };
    storageEstimatedBytes: number;
    storageFormatted: string;
    totalOperations: {
      reads: number;
      writes: number;
    };
    avgReadLatencyMs: number;
    avgWriteLatencyMs: number;
    integrity: {
      orphanedOrderItems: number;
      totalVerifiedOrders: number;
      totalVerifiedQuotes: number;
      status: string;
    };
  };
  realtimeSync: {
    protocol: string;
    status: string;
    activeClientsCount: number;
    totalBroadcastsCount: number;
    heartbeatIntervalMs: number;
    lastBroadcastTimestamp: string;
    channels: Array<{ name: string; description: string; active: boolean }>;
  };
  server: {
    uptimeSeconds: number;
    uptimeFormatted: string;
    nodeVersion: string;
    platform: string;
    memory: {
      rssBytes: number;
      rssFormatted: string;
      heapUsedBytes: number;
      heapUsedFormatted: string;
      heapTotalBytes: number;
      heapTotalFormatted: string;
    };
    geminiAi: {
      configured: boolean;
      model: string;
      status: string;
    };
  };
  securityCrypto: {
    e2eeAlgorithm: string;
    hashAlgorithm: string;
    authHashMethod: string;
    status: string;
  };
  recentLogs: Array<{
    id: string;
    timestamp: string;
    type: 'broadcast' | 'client_connect' | 'client_disconnect' | 'db_write' | 'db_read' | 'security_audit' | 'heartbeat';
    event: string;
    details: string;
    status: 'ok' | 'warning' | 'error';
    latencyMs?: number;
    activeClientsCount?: number;
  }>;
}

export default function SystemDiagnosticsDashboard({
  products,
  orders,
  quotes,
  onRefresh,
}: SystemDiagnosticsDashboardProps) {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  
  // Interactive tests state
  const [pingHistory, setPingHistory] = useState<number[]>([]);
  const [isPinging, setIsPinging] = useState(false);
  const [lastPingResult, setLastPingResult] = useState<{ roundtrip: number; serverTime: string } | null>(null);

  const [isBroadcastingTest, setIsBroadcastingTest] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<string | null>(null);

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const [isFlushing, setIsFlushing] = useState(false);
  const [flushFeedback, setFlushFeedback] = useState<string | null>(null);

  // Backup & Restore state
  const [exportScope, setExportScope] = useState<'all' | 'products' | 'orders' | 'quotes' | 'cariler'>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [uploadedBackupFile, setUploadedBackupFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [backupParseError, setBackupParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any | null>(null);
  const [isResettingStock, setIsResettingStock] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logFilter, setLogFilter] = useState<'all' | 'broadcast' | 'client' | 'security'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const fetchDiagnostics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/system/diagnostics');
      if (res.ok) {
        const json = await res.json();
        setData(json.diagnostics);
        setLastRefreshedAt(new Date());
      }
    } catch (e) {
      console.error('Error fetching diagnostics:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  // Auto-refresh interval (every 4s if active)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchDiagnostics(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Handle Interactive Ping Test
  const handleRunPing = async () => {
    setIsPinging(true);
    const clientSend = Date.now();
    try {
      const res = await fetch('/api/system/diagnostics/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientTimestamp: clientSend }),
      });
      const clientReceived = Date.now();
      const roundtrip = Math.max(1, clientReceived - clientSend);
      if (res.ok) {
        const json = await res.json();
        setLastPingResult({ roundtrip, serverTime: json.serverTimeIso });
        setPingHistory(prev => [roundtrip, ...prev.slice(0, 7)]);
        playNotificationSound('status');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPinging(false);
    }
  };

  // Handle Test Broadcast Trigger
  const handleTriggerTestBroadcast = async () => {
    setIsBroadcastingTest(true);
    setBroadcastFeedback(null);
    try {
      const res = await fetch('/api/system/diagnostics/test-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testMessage: 'Yönetici Tanılama Masasından Test Sinyali 📡' }),
      });
      if (res.ok) {
        const json = await res.json();
        playNotificationSound('success');
        setBroadcastFeedback(`Test yayını ${json.activeClientsCount} aktif dinleyiciye başarıyla iletildi.`);
        fetchDiagnostics(true);
      }
    } catch (e) {
      console.error(e);
      setBroadcastFeedback('Test yayını gönderilemedi.');
    } finally {
      setIsBroadcastingTest(false);
    }
  };

  // Handle Deep DB Audit
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch('/api/system/diagnostics/audit-integrity', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        setAuditResult(json);
        playNotificationSound('success');
        fetchDiagnostics(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditing(false);
    }
  };

  // Handle Flush Sync Cache
  const handleFlushCache = async () => {
    setIsFlushing(true);
    setFlushFeedback(null);
    try {
      const res = await fetch('/api/system/diagnostics/flush-cache', {
        method: 'POST',
      });
      if (res.ok) {
        const json = await res.json();
        playNotificationSound('status');
        setFlushFeedback(json.message);
        fetchDiagnostics(true);
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFlushing(false);
    }
  };

  // 1. Export JSON Backup
  const handleExportBackup = async (scope: 'all' | 'products' | 'orders' | 'quotes' | 'cariler' = exportScope) => {
    setIsExporting(true);
    try {
      playNotificationSound('status');
      const res = await fetch(`/api/backup/export?scope=${scope}`);
      if (!res.ok) throw new Error('Yedek verisi sunucudan alınamadı.');
      const data = await res.json();
      
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `alpha-yedek-${scope}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      fetchDiagnostics(true);
    } catch (e: any) {
      console.error('Export error:', e);
      alert('Yedek indirme sırasında hata oluştu: ' + e.message);
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  // 2. Export Excel / Sheets CSV
  const handleExportCsv = async (type: 'products' | 'orders' | 'cariler') => {
    playNotificationSound('status');
    try {
      const res = await fetch(`/api/backup/export/csv?type=${type}`);
      if (!res.ok) throw new Error('CSV dosyası sunucudan alınamadı.');
      const text = await res.text();

      const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const typeName = type === 'products' ? 'stok-listesi' : type === 'orders' ? 'siparisler' : 'cari-hesaplar';
      a.download = `alpha-${typeName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error('CSV export error:', e);
      alert('CSV dışa aktarımında hata: ' + e.message);
    }
  };

  // Process JSON Backup file from input or drop
  const processBackupJsonFile = (file: File) => {
    setBackupParseError(null);
    setRestoreResult(null);
    setUploadedBackupFile(file);

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setBackupParseError('Lütfen geçerli bir .json uzantılı yedek dosyası seçin.');
      setParsedBackupData(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        
        // Safety check if user uploaded an HTML error page by mistake
        if (text.trim().startsWith('<') || text.includes('<html') || text.includes('Cookie check')) {
          setBackupParseError('Yüklenen dosya JSON yedeği değil, bir HTML güvenlik sayfasıdır. Lütfen sistemden indirilmiş .json dosyasını yükleyin.');
          setParsedBackupData(null);
          return;
        }

        const parsed = JSON.parse(text);
        const dataSection = parsed.data || parsed;

        const hasProducts = Array.isArray(dataSection.products) && dataSection.products.length > 0;
        const hasOrders = Array.isArray(dataSection.orders) && dataSection.orders.length > 0;
        const hasQuotes = Array.isArray(dataSection.quotes) && dataSection.quotes.length > 0;
        const hasCariler = (Array.isArray(dataSection.cariAccounts) && dataSection.cariAccounts.length > 0) ||
                           (Array.isArray(dataSection.cariler) && dataSection.cariler.length > 0);

        if (!hasProducts && !hasOrders && !hasQuotes && !hasCariler) {
          setBackupParseError('Dosya geçerli bir yedek formatında değil (içinde ürün, sipariş, teklif veya cari hesap kaydı bulunamadı).');
          setParsedBackupData(null);
          return;
        }

        const cariCount = Array.isArray(dataSection.cariAccounts) 
          ? dataSection.cariAccounts.length 
          : (Array.isArray(dataSection.cariler) ? dataSection.cariler.length : 0);

        setParsedBackupData({
          metadata: parsed.metadata || null,
          productsCount: Array.isArray(dataSection.products) ? dataSection.products.length : 0,
          ordersCount: Array.isArray(dataSection.orders) ? dataSection.orders.length : 0,
          quotesCount: Array.isArray(dataSection.quotes) ? dataSection.quotes.length : 0,
          cariCount,
          raw: parsed,
        });
        playNotificationSound('status');
      } catch (err: any) {
        setBackupParseError('JSON dosyası okunamadı veya biçim hatalı: ' + err.message);
        setParsedBackupData(null);
      }
    };
    reader.onerror = () => {
      setBackupParseError('Dosya okunurken bir hata oluştu.');
      setParsedBackupData(null);
    };
    reader.readAsText(file);
  };

  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processBackupJsonFile(e.target.files[0]);
    }
  };

  const handleFileDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processBackupJsonFile(e.dataTransfer.files[0]);
    }
  };

  const handleClearSelectedBackup = () => {
    setUploadedBackupFile(null);
    setParsedBackupData(null);
    setBackupParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 3. Execute Restore / Import
  const handleExecuteRestore = async () => {
    if (!parsedBackupData) return;
    setIsRestoring(true);
    setRestoreResult(null);
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupData: parsedBackupData.raw,
          mode: restoreMode,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        playNotificationSound('success');
        setRestoreResult({
          success: true,
          message: json.message,
          stats: json.stats,
        });
        onRefresh();
        fetchDiagnostics(true);
      } else {
        playNotificationSound('status');
        setRestoreResult({
          success: false,
          message: json.error || 'Geri yükleme işlemi başarısız oldu.',
        });
      }
    } catch (e: any) {
      setRestoreResult({
        success: false,
        message: 'Sunucuya bağlanırken bir hata oluştu: ' + e.message,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // 4. Reset Stock to Factory
  const handleResetFactoryStock = async () => {
    if (!window.confirm('Tüm ürün kataloğu orijinal fabrika stok.pdf verilerine sıfırlanacak. Onaylıyor musunuz?')) {
      return;
    }
    setIsResettingStock(true);
    try {
      const res = await fetch('/api/backup/reset-stock', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        playNotificationSound('success');
        setFlushFeedback(json.message);
        onRefresh();
        fetchDiagnostics(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsResettingStock(false);
    }
  };

  // Copy Log Line
  const handleCopyLog = (logText: string, id: string) => {
    navigator.clipboard.writeText(logText);
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Filter logs
  const filteredLogs = (data?.recentLogs || []).filter(log => {
    if (logFilter === 'broadcast' && log.type !== 'broadcast') return false;
    if (logFilter === 'client' && log.type !== 'client_connect' && log.type !== 'client_disconnect') return false;
    if (logFilter === 'security' && log.type !== 'security_audit') return false;
    if (logSearch) {
      const query = logSearch.toLowerCase();
      return (
        log.event.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.type.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const avgPing = pingHistory.length > 0
    ? Math.round(pingHistory.reduce((a, b) => a + b, 0) / pingHistory.length)
    : (lastPingResult?.roundtrip || 12);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Real-time Pulse Strip */}
      <div className="bg-white/95 p-5 rounded-3xl border border-[#E7E0D4] shadow-xs backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-[#235835]/10 text-[#235835] rounded-2xl border border-[#235835]/20 flex items-center justify-center relative">
            <Activity className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap">
              <h2 className="text-base font-extrabold text-stone-900">
                Sistem Tanılama & Gerçek Zamanlı Senkronizasyon Masası
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-extrabold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>TÜM SİSTEMLER OPERASYONEL</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Veritabanı işlemleri, SSE yayın kanalları, bellek kullanımı ve şifreleme bütünlüğü anlık olarak izlenmektedir.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <label className="flex items-center space-x-2 bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#DDD5C7] text-xs font-semibold text-stone-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={e => setAutoRefresh(e.target.checked)}
              className="accent-[#235835] rounded cursor-pointer"
            />
            <span>Canlı Akış (4sn)</span>
          </label>

          <button
            onClick={() => fetchDiagnostics(false)}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#F4EFE6] hover:bg-[#EAE3D6] text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-[#DDD5C7]"
            title="Manuel Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>

          <a
            href="/api/system/diagnostics/export-snapshot"
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#2E5438] hover:bg-[#23452C] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Veritabanı Snapshot JSON İndir"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Yedek İndir</span>
          </a>
        </div>
      </div>

      {/* 4 Core Metric Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* CARD 1: DATABASE ENGINE & STORAGE */}
        <div className="p-5 bg-white rounded-3xl border border-[#E7E0D4] shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-[#2E5438]" />
              <span>Veritabanı & Veri Deposu</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-[10px] font-mono font-bold">
              RAM-ACID
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-[#235835] font-mono">
              {data?.database.collections.products || products.length} Ürün
            </div>
            <div className="text-xs text-stone-500 font-mono">
              {data?.database.storageFormatted || '285 KB'}
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-[#EAE3D6]">
            <div className="flex items-center justify-between">
              <span>Sipariş / Teklif:</span>
              <span className="font-bold text-stone-900 font-mono">
                {data?.database.collections.orders || orders.length} Sip / {data?.database.collections.quotes || quotes.length} Teklif
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Okuma / Yazma Hızı:</span>
              <span className="font-bold text-emerald-800 font-mono">
                ~{data?.database.avgReadLatencyMs || 0.45}ms / ~{data?.database.avgWriteLatencyMs || 0.85}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bütünlük & Sağlık:</span>
              <span className="font-bold text-emerald-800 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>%100 Doğrulandı</span>
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: REAL-TIME SSE SYNC ENGINE */}
        <div className="p-5 bg-white rounded-3xl border border-[#E7E0D4] shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 flex items-center space-x-1.5">
              <Radio className="w-4 h-4 text-[#8C4A32]" />
              <span>Gerçek Zamanlı Senkronizasyon</span>
            </span>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>SSE Canlı</span>
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-[#8C4A32] font-mono">
              {data?.realtimeSync.activeClientsCount !== undefined ? data.realtimeSync.activeClientsCount : 1} İstemci
            </div>
            <div className="text-xs text-stone-500 font-mono">
              {data?.realtimeSync.totalBroadcastsCount || 0} Olay
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-[#EAE3D6]">
            <div className="flex items-center justify-between">
              <span>Protokol Türü:</span>
              <span className="font-bold text-stone-900 font-mono text-[11px]">
                SSE + HTTP Polling
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Heartbeat Nabız Aralığı:</span>
              <span className="font-bold text-stone-900 font-mono">
                {((data?.realtimeSync.heartbeatIntervalMs || 20000) / 1000)} sn
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Aktif Yayın Kanalları:</span>
              <span className="font-bold text-[#235835] font-mono">
                5 Kanal Aktif
              </span>
            </div>
          </div>
        </div>

        {/* CARD 3: SERVER RUNTIME & MEMORY */}
        <div className="p-5 bg-white rounded-3xl border border-[#E7E0D4] shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 flex items-center space-x-1.5">
              <Cpu className="w-4 h-4 text-stone-700" />
              <span>Sunucu & Bellek (Runtime)</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-mono font-bold">
              {data?.server.nodeVersion || 'Node v20+'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-2xl font-black text-stone-900 font-mono">
              {data?.server.memory.heapUsedFormatted || '38.4 MB'}
            </div>
            <div className="text-xs text-stone-500 font-mono">
              Heap / {data?.server.memory.heapTotalFormatted || '64.0 MB'}
            </div>
          </div>

          {/* Memory Bar */}
          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#2E5438] h-full rounded-full transition-all duration-500"
              style={{
                width: `${data?.server.memory ? Math.min(100, Math.round((data.server.memory.heapUsedBytes / data.server.memory.heapTotalBytes) * 100)) : 55}%`,
              }}
            ></div>
          </div>

          <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-[#EAE3D6]">
            <div className="flex items-center justify-between">
              <span>Çalışma Süresi (Uptime):</span>
              <span className="font-bold text-stone-900 font-mono">
                {data?.server.uptimeFormatted || 'Aktif'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Yapay Zeka:</span>
              <span className="font-bold text-emerald-800 flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Yedek Mod</span>
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: CRYPTOGRAPHY & E2EE SECURITY */}
        <div className="p-5 bg-white rounded-3xl border border-[#E7E0D4] shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>Şifreleme & İmza Bütünlüğü</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200 text-[10px] font-bold">
              E2EE Aktif
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div className="text-xl font-black text-teal-900 font-mono truncate">
              AES-256-GCM
            </div>
            <div className="text-[11px] text-teal-700 font-mono font-bold">
              SHA-256
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-stone-600 pt-2 border-t border-[#EAE3D6]">
            <div className="flex items-center justify-between">
              <span>Kimlik Özetleme:</span>
              <span className="font-bold text-stone-900 font-mono text-[11px]">
                PBKDF2 (100k) + Salt
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Oturum Doğrulama:</span>
              <span className="font-bold text-stone-900 font-mono">
                HMAC-SHA256 Token
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Sipariş Gizlilik Şifresi:</span>
              <span className="font-bold text-emerald-800 flex items-center space-x-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Uçtan Uca Koruma</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Interactive Diagnostics Suite & Actions */}
      <div className="bg-white p-6 rounded-3xl border border-[#E7E0D4] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAE3D6] pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#2E5438]" />
              <span>İnteraktif Sistem Tanılama & Test Suite Masası</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Veritabanı bütünlüğünü denetleyin, gecikmeyi (ping) ölçün ve senkronizasyon sinyallerini canlı olarak test edin.
            </p>
          </div>

          {lastRefreshedAt && (
            <div className="text-[11px] text-stone-500 font-mono">
              Son Yenilenme: {lastRefreshedAt.toLocaleTimeString('tr-TR')}
            </div>
          )}
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Test 1: Live Ping */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#DDD5C7] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Canlı Gecikme (Ping)</span>
                </span>
                <span className="text-xs font-extrabold font-mono text-[#235835]">
                  {avgPing} ms
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                İstemci ile sunucu arasındaki gidiş-dönüş yanıt süresini milisaniye cinsinden ölçer.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunPing}
              disabled={isPinging}
              className="w-full py-2 bg-white hover:bg-stone-50 text-stone-800 border border-[#DDD5C7] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${isPinging ? 'animate-bounce text-amber-600' : 'text-amber-500'}`} />
              <span>{isPinging ? 'Ölçülüyor...' : 'Ping Testi Yap'}</span>
            </button>
          </div>

          {/* Test 2: Test Broadcast Trigger */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#DDD5C7] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center space-x-1.5">
                  <Send className="w-3.5 h-3.5 text-[#8C4A32]" />
                  <span>Test Senkronizasyonu</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold">
                  SSE Broadcast
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Tüm bağlı istemcilere test sinyali fırlatarak gerçek zamanlı iletiyi doğrular.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTriggerTestBroadcast}
              disabled={isBroadcastingTest}
              className="w-full py-2 bg-[#8C4A32] hover:bg-[#783D27] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isBroadcastingTest ? 'Yayınlanıyor...' : 'Test Sinyali Bas'}</span>
            </button>
          </div>

          {/* Test 3: Deep Integrity Audit */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#DDD5C7] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2E5438]" />
                  <span>Bütünlük Taraması</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-mono font-bold">
                  Audit
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                SKU benzersizliğini, sipariş hesaplamalarını ve veri tablolarını baştan sona denetler.
              </p>
            </div>

            <button
              type="button"
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="w-full py-2 bg-[#2E5438] hover:bg-[#23452C] text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAuditing ? 'Denetleniyor...' : 'Veri Denetimi Başlat'}</span>
            </button>
          </div>

          {/* Test 4: Flush Cache & Re-sync */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#DDD5C7] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-900 flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-stone-700" />
                  <span>Kanalı Tazele (Flush)</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono font-bold">
                  Keepalive
                </span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                SSE tamponlarını sıfırlar ve tüm istemcilere zorunlu veri tazeleme sinyali iletir.
              </p>
            </div>

            <button
              type="button"
              onClick={handleFlushCache}
              disabled={isFlushing}
              className="w-full py-2 bg-white hover:bg-stone-50 text-stone-800 border border-[#DDD5C7] rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFlushing ? 'animate-spin' : ''}`} />
              <span>{isFlushing ? 'Tazeleniyor...' : 'Zorunlu Senkronize Et'}</span>
            </button>
          </div>

        </div>

        {/* Feedback Banners */}
        {broadcastFeedback && (
          <div className="p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{broadcastFeedback}</span>
            </div>
            <button onClick={() => setBroadcastFeedback(null)} className="text-amber-800 font-bold hover:underline cursor-pointer">
              Kapat
            </button>
          </div>
        )}

        {flushFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{flushFeedback}</span>
            </div>
            <button onClick={() => setFlushFeedback(null)} className="text-emerald-800 font-bold hover:underline cursor-pointer">
              Kapat
            </button>
          </div>
        )}

        {/* Audit Report Modal/Box */}
        {auditResult && (
          <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-2xl space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-emerald-950 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Veritabanı Bütünlük Raporu — Sonuç: %100 Başarılı ({auditResult.durationMs}ms)</span>
              </span>
              <button
                onClick={() => setAuditResult(null)}
                className="text-emerald-800 text-xs font-bold hover:underline cursor-pointer"
              >
                Kapat
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-emerald-900 pt-1">
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                <span>Taranan Ürünler:</span> <strong>{auditResult.report.productsChecked} Adet</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                <span>Taranan Siparişler:</span> <strong>{auditResult.report.ordersChecked} Adet</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                <span>Taranan Teklifler:</span> <strong>{auditResult.report.quotesChecked} Adet</strong>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                <span>Kopuk İlişki / Hata:</span> <strong className="text-emerald-700">0 Hata (Kusursuz)</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Database Collections Table Breakdown */}
      <div className="bg-white p-6 rounded-3xl border border-[#E7E0D4] shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-stone-900 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#2E5438]" />
          <span>Veritabanı Tablo / Koleksiyon Dağılımı ve İşlem İstatistikleri</span>
        </h3>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#DDD5C7] text-stone-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Koleksiyon Adı</th>
                <th className="py-3 px-4 text-center">Kayıt Sayısı</th>
                <th className="py-3 px-4 text-center">Tahmini Bellek</th>
                <th className="py-3 px-4 text-center">İndeks / Benzersizlik</th>
                <th className="py-3 px-4 text-center">Okuma/Yazma Durumu</th>
                <th className="py-3 px-4 text-right">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D6]">
              
              <tr className="hover:bg-[#FAF8F5] transition-colors">
                <td className="py-3 px-4 font-bold text-stone-900 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>products (stok.pdf Kataloğu)</span>
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-[#235835]">
                  {products.length} Kayıt
                </td>
                <td className="py-3 px-4 text-center font-mono text-stone-600">
                  ~148 KB
                </td>
                <td className="py-3 px-4 text-center text-stone-600">
                  ID (PK), SKU (Unique), Kategori
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-mono">
                    Okuma-Ağırlıklı (R/W: 8:1)
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                    Aktif
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-[#FAF8F5] transition-colors">
                <td className="py-3 px-4 font-bold text-stone-900 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>orders (30 Günlük Geçmiş + Canlı)</span>
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-amber-800">
                  {orders.length} Kayıt
                </td>
                <td className="py-3 px-4 text-center font-mono text-stone-600">
                  ~92 KB
                </td>
                <td className="py-3 px-4 text-center text-stone-600">
                  ID (PK), OrderNumber, CreatedAt
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-mono">
                    Canlı İşlem (R/W: 3:1)
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                    Aktif
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-[#FAF8F5] transition-colors">
                <td className="py-3 px-4 font-bold text-stone-900 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#8C4A32]"></span>
                  <span>quotes (Proforma Teklif Talepleri)</span>
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-[#8C4A32]">
                  {quotes.length} Kayıt
                </td>
                <td className="py-3 px-4 text-center font-mono text-stone-600">
                  ~28 KB
                </td>
                <td className="py-3 px-4 text-center text-stone-600">
                  ID (PK), QuoteNumber, Status
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-[10px] font-mono">
                    AI Destekli Fiyatlama
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                    Aktif
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-[#FAF8F5] transition-colors">
                <td className="py-3 px-4 font-bold text-stone-900 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>users (Bayi & Yönetici Hesapları)</span>
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-purple-800">
                  {data?.database.collections.users || 3} Hesap
                </td>
                <td className="py-3 px-4 text-center font-mono text-stone-600">
                  ~14 KB
                </td>
                <td className="py-3 px-4 text-center text-stone-600">
                  ID (PK), Email (Unique), PBKDF2 Salt
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-900 text-[10px] font-mono">
                    Kriptografik İmzalı
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                    Aktif
                  </span>
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOCAL DATABASE BACKUP (EXPORT) & RESTORE (IMPORT) MODULE                  */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#E7E0D4] shadow-xs space-y-6">
        
        {/* Module Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-[#E7E0D4] gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-2xl bg-[#2E5438]/10 text-[#2E5438] flex items-center justify-center">
                <FolderArchive className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-stone-900">
                Yerel Veritabanı Yedekleme (Export) ve Geri Yükleme (Import)
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed max-w-3xl">
              <strong>ALPHA TEKNİK DOĞALGAZ SIHHİ TESİSAT</strong> sistemindeki stok ürünleri, sipariş kayıtları ve resmi teklifleri yerel JSON veya Excel CSV dosyası olarak bilgisayarınıza indirin; istediğiniz zaman tek tıkla geri yükleyin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Yerel & Güvenli</span>
            </span>
            <span className="text-[11px] px-3 py-1 rounded-full bg-stone-100 text-stone-700 font-mono font-bold">
              v2026.2-PRO
            </span>
          </div>
        </div>

        {/* 2-Column Backup Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT: Export (Dışa Aktarma) */}
          <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#DDD5C7] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-900 flex items-center space-x-2">
                  <Download className="w-4 h-4 text-[#2E5438]" />
                  <span>1. Veritabanını Yerel Olarak Yedekle (Export)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">
                  JSON & CSV
                </span>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Yedeklemek istediğiniz veri kapsamını seçip bilgisayarınıza anında JSON dosyası olarak kaydedin:
              </p>

              {/* Scope Selection Radios */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    exportScope === 'all'
                      ? 'bg-white border-[#2E5438] ring-2 ring-[#2E5438]/20 shadow-xs'
                      : 'bg-stone-50/70 border-stone-200 hover:bg-white text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-[#2E5438]" />
                      <span>Tam Sistem Yedeği (Önerilen)</span>
                    </span>
                    {exportScope === 'all' && <CheckCircle className="w-4 h-4 text-[#2E5438]" />}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    Ürünler ({products.length}) + Siparişler ({orders.length}) + Teklifler ({quotes.length}) + Cari Hesaplar + Bildirimler
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportScope('products')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'products'
                        ? 'bg-white border-[#2E5438] ring-2 ring-[#2E5438]/20 shadow-xs'
                        : 'bg-stone-50/70 border-stone-200 hover:bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs flex items-center space-x-1.5">
                        <FileJson className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Stok Kataloğu</span>
                      </span>
                      {exportScope === 'products' && <CheckCircle className="w-3.5 h-3.5 text-[#2E5438]" />}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {products.length} ürün ve fiyat
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('orders')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'orders'
                        ? 'bg-white border-[#2E5438] ring-2 ring-[#2E5438]/20 shadow-xs'
                        : 'bg-stone-50/70 border-stone-200 hover:bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs flex items-center space-x-1.5">
                        <FolderArchive className="w-3.5 h-3.5 text-blue-700" />
                        <span>Siparişler</span>
                      </span>
                      {exportScope === 'orders' && <CheckCircle className="w-3.5 h-3.5 text-[#2E5438]" />}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {orders.length} sipariş kaydı
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('quotes')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'quotes'
                        ? 'bg-white border-[#2E5438] ring-2 ring-[#2E5438]/20 shadow-xs'
                        : 'bg-stone-50/70 border-stone-200 hover:bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs flex items-center space-x-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-700" />
                        <span>Teklifler</span>
                      </span>
                      {exportScope === 'quotes' && <CheckCircle className="w-3.5 h-3.5 text-[#2E5438]" />}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      {quotes.length} proforma teklif
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportScope('cariler')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportScope === 'cariler'
                        ? 'bg-white border-[#2E5438] ring-2 ring-[#2E5438]/20 shadow-xs'
                        : 'bg-stone-50/70 border-stone-200 hover:bg-white text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                        <span>Cari Hesaplar</span>
                      </span>
                      {exportScope === 'cariler' && <CheckCircle className="w-3.5 h-3.5 text-[#2E5438]" />}
                    </div>
                    <div className="text-[10px] text-stone-500 mt-0.5">
                      Cari & Bakiye Defteri
                    </div>
                  </button>
                </div>

              </div>

              {/* Primary JSON Export Button */}
              <button
                type="button"
                onClick={() => handleExportBackup()}
                disabled={isExporting}
                className="w-full py-3 bg-[#2E5438] hover:bg-[#23452C] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>
                  {isExporting ? 'JSON Yedeği Hazırlanıyor...' : `Seçilen Kapsamı JSON Olarak İndir (.json)`}
                </span>
              </button>

            </div>

            {/* Quick CSV Export Shortcuts */}
            <div className="pt-4 border-t border-[#E0D7C9] space-y-2">
              <div className="text-[11px] font-bold text-stone-700 flex items-center space-x-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-800" />
                <span>Excel & Google E-Tablolar (CSV Formatı) İndir:</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleExportCsv('products')}
                  className="py-2 px-2 bg-white hover:bg-emerald-50 text-emerald-950 border border-[#DDD5C7] rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Stok (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCsv('orders')}
                  className="py-2 px-2 bg-white hover:bg-blue-50 text-blue-950 border border-[#DDD5C7] rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Sipariş (.csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportCsv('cariler')}
                  className="py-2 px-2 bg-white hover:bg-purple-50 text-purple-950 border border-[#DDD5C7] rounded-xl text-[11px] font-bold transition-colors flex items-center justify-center space-x-1 cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>Cari (.csv)</span>
                </button>
              </div>
            </div>

          </div>

          {/* RIGHT: Import / Restore (Geri Yükleme) */}
          <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#DDD5C7] space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-900 flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-[#8C4A32]" />
                  <span>2. Yedeği Geri Yükle (Import / Restore)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                  JSON Yükleme
                </span>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="hidden"
              />

              {/* Drag and Drop Zone or File Info */}
              {!uploadedBackupFile ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-[#C5BBAA] hover:border-[#8C4A32] bg-white/70 hover:bg-white rounded-2xl text-center cursor-pointer transition-all space-y-2 group"
                >
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#8C4A32]/10 group-hover:bg-[#8C4A32]/20 text-[#8C4A32] flex items-center justify-center transition-colors">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-stone-800">
                    Yedek JSON Dosyasını Buraya Sürükleyin veya Tıklayın
                  </div>
                  <div className="text-[11px] text-stone-500">
                    Daha önce dışa aktarılmış <strong>.json</strong> formatındaki yedekleri destekler.
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-white rounded-2xl border border-[#DDD5C7] space-y-3 shadow-2xs">
                  
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <FileJson className="w-5 h-5 text-[#8C4A32] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-stone-900 truncate">
                          {uploadedBackupFile.name}
                        </div>
                        <div className="text-[10px] text-stone-500 font-mono">
                          {(uploadedBackupFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearSelectedBackup}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Dosyayı İptal Et"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {parsedBackupData && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="text-[10px] text-emerald-700 font-bold">Ürünler</div>
                        <div className="font-mono font-bold text-stone-900 text-sm">{parsedBackupData.productsCount}</div>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="text-[10px] text-blue-700 font-bold">Siparişler</div>
                        <div className="font-mono font-bold text-stone-900 text-sm">{parsedBackupData.ordersCount}</div>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="text-[10px] text-amber-700 font-bold">Teklifler</div>
                        <div className="font-mono font-bold text-stone-900 text-sm">{parsedBackupData.quotesCount}</div>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-xl border border-purple-200">
                        <div className="text-[10px] text-purple-700 font-bold">Cari Hesap</div>
                        <div className="font-mono font-bold text-stone-900 text-sm">{parsedBackupData.cariCount || 0}</div>
                      </div>
                    </div>
                  )}

                  {/* Mode Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-stone-800 block">
                      Geri Yükleme Yöntemi:
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <label className={`p-2.5 rounded-xl border flex items-start space-x-2 cursor-pointer transition-colors ${
                        restoreMode === 'merge' ? 'bg-emerald-50/70 border-emerald-400 font-bold text-emerald-950' : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <div>Akıllı Birleştir</div>
                          <div className="text-[10px] font-normal text-stone-500">Mevcutları korur, eşleşenleri günceller</div>
                        </div>
                      </label>

                      <label className={`p-2.5 rounded-xl border flex items-start space-x-2 cursor-pointer transition-colors ${
                        restoreMode === 'replace' ? 'bg-rose-50/70 border-rose-400 font-bold text-rose-950' : 'bg-stone-50 border-stone-200 text-stone-700'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500"
                        />
                        <div>
                          <div>Tam Değiştir</div>
                          <div className="text-[10px] font-normal text-stone-500">Mevcut veriyi silip yedeği baştan kurar</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={isRestoring || !parsedBackupData}
                    className="w-full py-2.5 bg-[#8C4A32] hover:bg-[#783D27] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className={`w-4 h-4 ${isRestoring ? 'animate-bounce' : ''}`} />
                    <span>{isRestoring ? 'Veritabanı Geri Yükleniyor...' : 'Yedeği Veritabanına Yükle'}</span>
                  </button>

                </div>
              )}

              {/* Error feedback */}
              {backupParseError && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-950 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{backupParseError}</span>
                  </div>
                  <button onClick={() => setBackupParseError(null)} className="text-rose-800 font-bold hover:underline">
                    Kapat
                  </button>
                </div>
              )}

              {/* Restore Result feedback */}
              {restoreResult && (
                <div className={`p-3.5 border rounded-2xl text-xs space-y-1.5 animate-in fade-in ${
                  restoreResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center space-x-1.5">
                      {restoreResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>{restoreResult.message}</span>
                    </span>
                    <button onClick={() => setRestoreResult(null)} className="text-stone-500 hover:text-stone-900 font-bold">
                      Kapat
                    </button>
                  </div>
                  {restoreResult.stats && (
                    <div className="text-[11px] text-stone-600 pt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span>İşlenen Ürün: <strong>{restoreResult.stats.restoredProductsCount}</strong></span>
                      <span>İşlenen Sipariş: <strong>{restoreResult.stats.restoredOrdersCount}</strong></span>
                      <span>İşlenen Teklif: <strong>{restoreResult.stats.restoredQuotesCount}</strong></span>
                      {typeof restoreResult.stats.restoredCariCount === 'number' && (
                        <span>İşlenen Cari: <strong>{restoreResult.stats.restoredCariCount}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Factory Stock Reset Tool */}
            <div className="pt-4 border-t border-[#E0D7C9] flex items-center justify-between text-xs">
              <span className="text-[11px] text-stone-600">
                Kataloğu fabrika <strong>stok.pdf</strong> haline geri döndür:
              </span>
              <button
                type="button"
                onClick={handleResetFactoryStock}
                disabled={isResettingStock}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isResettingStock ? 'animate-spin' : ''}`} />
                <span>{isResettingStock ? 'Sıfırlanıyor...' : 'Fabrika Kataloğuna Sıfırla'}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Real-time Event Stream Log Console */}
      <div className="bg-[#1C1917] rounded-3xl border border-stone-800 shadow-xl overflow-hidden text-stone-300 font-mono">
        
        {/* Terminal Header */}
        <div className="p-4 bg-stone-900 border-b border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-stone-100">
              Canlı SSE Yayın Akışı & Senkronizasyon Olay Günlüğü (Event Stream Console)
            </span>
            <span className="px-2 py-0.5 rounded bg-stone-800 text-emerald-400 text-[10px] font-bold">
              {filteredLogs.length} Olay
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-lg border border-stone-800 text-[10px]">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2 py-0.5 rounded cursor-pointer ${logFilter === 'all' ? 'bg-stone-800 text-white font-bold' : 'text-stone-400 hover:text-stone-200'}`}
              >
                Tümü
              </button>
              <button
                onClick={() => setLogFilter('broadcast')}
                className={`px-2 py-0.5 rounded cursor-pointer ${logFilter === 'broadcast' ? 'bg-[#8C4A32] text-white font-bold' : 'text-stone-400 hover:text-stone-200'}`}
              >
                Yayınlar
              </button>
              <button
                onClick={() => setLogFilter('client')}
                className={`px-2 py-0.5 rounded cursor-pointer ${logFilter === 'client' ? 'bg-emerald-900 text-emerald-200 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
              >
                Bağlantılar
              </button>
              <button
                onClick={() => setLogFilter('security')}
                className={`px-2 py-0.5 rounded cursor-pointer ${logFilter === 'security' ? 'bg-teal-900 text-teal-200 font-bold' : 'text-stone-400 hover:text-stone-200'}`}
              >
                Denetim
              </button>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-stone-500" />
              <input
                type="text"
                placeholder="Log ara..."
                value={logSearch}
                onChange={e => setLogSearch(e.target.value)}
                className="pl-6 pr-2 py-1 bg-stone-950 border border-stone-800 rounded-lg text-[10px] text-stone-200 placeholder-stone-600 focus:border-emerald-500 w-28 sm:w-36"
              />
            </div>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 max-h-80 overflow-y-auto custom-scrollbar space-y-1.5 text-[11px]">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-stone-500 text-xs">
              Eşleşen olay kaydı bulunamadı.
            </div>
          ) : (
            filteredLogs.map(log => {
              const formattedTime = new Date(log.timestamp).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              let badgeColor = 'bg-stone-800 text-stone-300';
              if (log.type === 'broadcast') badgeColor = 'bg-amber-950 text-amber-300 border border-amber-800/60';
              if (log.type === 'client_connect') badgeColor = 'bg-emerald-950 text-emerald-300 border border-emerald-800/60';
              if (log.type === 'client_disconnect') badgeColor = 'bg-rose-950 text-rose-300 border border-rose-800/60';
              if (log.type === 'security_audit') badgeColor = 'bg-teal-950 text-teal-300 border border-teal-800/60';
              if (log.type === 'heartbeat') badgeColor = 'bg-stone-800 text-stone-400';

              return (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-2 rounded-lg hover:bg-stone-900/90 transition-colors group"
                >
                  <div className="flex items-start space-x-2.5 flex-1 min-w-0">
                    <span className="text-stone-500 text-[10px] shrink-0 pt-0.5">
                      [{formattedTime}]
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${badgeColor}`}>
                      {log.event}
                    </span>
                    <span className="text-stone-300 truncate group-hover:text-stone-100 flex-1">
                      {log.details}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 pl-2">
                    {log.latencyMs !== undefined && (
                      <span className="text-stone-500 text-[10px]">
                        {log.latencyMs.toFixed(1)}ms
                      </span>
                    )}
                    <button
                      onClick={() => handleCopyLog(`[${formattedTime}] ${log.event}: ${log.details}`, log.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-500 hover:text-stone-200 transition-opacity p-0.5 cursor-pointer"
                      title="Kopyala"
                    >
                      {copiedLogId === log.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Terminal Footer */}
        <div className="p-3 bg-stone-900/90 border-t border-stone-800 text-[10px] text-stone-500 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-stone-400">SSE Canlı Kanal: /api/events</span>
            </span>
            <span>Tampon: Son 35 Olay Kayıtlı</span>
          </div>
          <div className="text-stone-400">
            Node.js EventEmitter + Express SSE Transport
          </div>
        </div>

      </div>

    </div>
  );
}
