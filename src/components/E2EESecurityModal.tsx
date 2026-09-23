import { useState } from 'react';
import { ShieldCheck, Lock, Key, Hash, CheckCircle2, Copy, Check, RefreshCw, X } from 'lucide-react';
import { encryptPayload, decryptPayload, generateSHA256Hash } from '../lib/crypto';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface E2EESecurityModalProps {
  onClose: () => void;
}

export default function E2EESecurityModal({ onClose }: E2EESecurityModalProps) {
  useModalBehavior(true, onClose);
  const [testInput, setTestInput] = useState('Gizli Ticari Not: Bu siparişte %15 özel bayi iskontosu uygulanmış ve gizlilik şartına tabidir.');
  const [encryptedOutput, setEncryptedOutput] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');
  const [shaHash, setShaHash] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTestEncrypt = async () => {
    setLoading(true);
    try {
      const enc = await encryptPayload(testInput);
      const hash = await generateSHA256Hash(testInput);
      const dec = await decryptPayload(enc);

      setEncryptedOutput(enc);
      setShaHash(hash);
      setDecryptedOutput(dec);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="bg-base-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-text-primary p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-base-surface-2 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-bg-success border border-success-border flex items-center justify-center text-success-text shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center space-x-2">
              <span>Veri Güvenliği & Şifreleme</span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-bg-success text-success-text border border-success-border font-semibold">
                AES-256-GCM
              </span>
            </h2>
            <p className="text-xs text-text-muted">Veri Bütünlüğü, SHA-256 Dijital Mühürleme & Kriptografik Doğrulama</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <div className="p-3.5 bg-base-surface-2 rounded-xl border border-border shadow-xs">
            <div className="flex items-center space-x-2 text-success-text text-xs font-bold mb-1">
              <Lock className="w-4 h-4" />
              <span>AES-GCM 256-Bit</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Tüm özel teklif notları, müşteri TC/Vergi detayları ve fiyat şartları tarayıcıda şifrelenir.
            </p>
          </div>

          <div className="p-3.5 bg-base-surface-2 rounded-xl border border-border shadow-xs">
            <div className="flex items-center space-x-2 text-warning-text text-xs font-bold mb-1">
              <Hash className="w-4 h-4" />
              <span>SHA-256 Dijital Mühür</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Her sipariş ve teklif veri paketi tekil bir kriptografik imza ile mühürlenir, değiştirilemez.
            </p>
          </div>

          <div className="p-3.5 bg-base-surface-2 rounded-xl border border-border shadow-xs">
            <div className="flex items-center space-x-2 text-info-text text-xs font-bold mb-1">
              <Key className="w-4 h-4" />
              <span>PBKDF2 Anahtar Türetimi</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Rastgele 16-byte salt ve 100.000 iterasyonlu şifreleme anahtar türetim protokolü.
            </p>
          </div>
        </div>

        {/* Live Interactive Cryptographic Test */}
        <div className="p-4 bg-base-surface-2 rounded-xl border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center space-x-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-success-text" />
              <span>Canlı Kriptografi & Şifreleme Test Alanı</span>
            </span>
            <button
              onClick={handleTestEncrypt}
              disabled={loading}
              className="px-3.5 py-1.5 bg-success-fill hover:opacity-90 text-base rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span>Testi Çalıştır</span>
            </button>
          </div>

          <div>
            <label className="block text-xs text-text-secondary mb-1">Orijinal Düz Metin (Plaintext)</label>
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full px-3 py-2 bg-base-surface border border-border rounded-lg text-xs text-text-primary focus:border-border-strong"
            />
          </div>

          {encryptedOutput && (
            <div className="space-y-3 pt-2 border-t border-border animate-in fade-in">
              <div>
                <div className="flex items-center justify-between text-xs text-success-text font-bold mb-1">
                  <span>AES-256-GCM Şifreli Çıktı (Ciphertext Payload)</span>
                  <button
                    onClick={() => handleCopy(encryptedOutput)}
                    className="flex items-center space-x-1 text-[11px] text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-success-text" /> : <Copy className="w-3 h-3 text-text-muted" />}
                    <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-base-surface rounded-lg border border-border font-mono text-[11px] text-success-text break-all max-h-20 overflow-y-auto font-semibold">
                  {encryptedOutput}
                </div>
              </div>

              <div>
                <span className="block text-xs text-warning-text font-bold mb-1">SHA-256 Bütünlük İmzası (Tamper-proof Seal)</span>
                <div className="p-2 bg-base-surface rounded-lg border border-border font-mono text-[11px] text-warning-text break-all font-semibold">
                  {shaHash}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs text-success-text bg-bg-success p-2.5 rounded-lg border border-success-border">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success-text" />
                <span>Çözülmüş Doğrulama: <strong className="text-text-primary">"{decryptedOutput}"</strong> (Kayıpsız ve Güvenli)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-base-surface-2 hover:bg-base-surface text-text-primary border border-border rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Anladım, Kapat
          </button>
        </div>

      </div>
      </div>
    </div>
  );
}
