import React, { useState, useEffect } from 'react';
import { User, LoginCredentials, RegisterCredentials } from '../types';
import { loginUser, registerUser, signInWithGoogle } from '../lib/auth';
import { 
  Lock, 
  User as UserIcon, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  X, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playNotificationSound } from '../lib/audio';
import { useModalBehavior } from '../hooks/useModalBehavior';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  initialTab?: 'login' | 'register';
  targetRole?: 'customer' | 'admin';
  customTitle?: string;
  customMessage?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  initialTab = 'login',
  targetRole,
  customTitle,
  customMessage,
}: AuthModalProps) {
  useModalBehavior(isOpen, onClose);
  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regTaxNumber, setRegTaxNumber] = useState('');
  const [regTaxOffice, setRegTaxOffice] = useState('');
  const [regPassword, setRegPassword] = useState('');
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMessage('');
      setLoginIdentifier('');
      setLoginPassword('');
    }
  }, [isOpen, initialTab, targetRole]);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMessage('Lütfen e-posta / kullanıcı adı ve şifrenizi giriniz.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const credentials: LoginCredentials = {
        emailOrUsername: loginIdentifier.trim(),
        password: loginPassword,
      };

      const result = await loginUser(credentials);
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
      playNotificationSound('status');
      onLoginSuccess(result.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsLoading(true);
    try {
      const result = await signInWithGoogle();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      playNotificationSound('status');
      onLoginSuccess(result.user);
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User just cancelled popup
        return;
      }
      setErrorMessage(err.message || 'Google ile giriş yapılırken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCompanyName.trim() || !regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword) {
      setErrorMessage('Lütfen zorunlu alanları doldurunuz.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);

    try {
      const credentials: RegisterCredentials = {
        companyName: regCompanyName.trim(),
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        city: regCity.trim() || 'İstanbul',
        address: regAddress.trim(),
        taxNumber: regTaxNumber.trim(),
        taxOffice: regTaxOffice.trim(),
        password: regPassword,
      };

      const result = await registerUser(credentials);
      
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
      playNotificationSound('order');

      onLoginSuccess(result.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Kayıt işlemi başarısız.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md p-3 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center py-4 sm:py-6">
        <div 
          className="bg-base-surface border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
        
        {/* Modal Header */}
        <div className="bg-base-surface-2 px-6 py-5 text-text-primary flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-base-surface border border-border flex items-center justify-center text-warning-text">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center space-x-2">
                <span>{customTitle || (targetRole === 'admin' ? 'Yönetici Masası Girişi' : 'Bayi & Müşteri Portalı')}</span>
              </h2>
              <p className="text-xs text-text-muted font-mono">
                {targetRole === 'admin' ? 'ALPHA Yönetici Girişi' : 'Güvenli Bayi Girişi & Yeni Kayıt'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-base-surface hover:bg-base-surface-2 border border-border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative message if passed */}
        {customMessage && (
          <div className="px-6 py-3 bg-bg-info border-b border-info-border text-info-text text-xs flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{customMessage}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-border p-1 bg-base-surface-2">
          <button
            id="tab-auth-login"
            onClick={() => { setTab('login'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-base-surface text-text-primary border border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserIcon className="w-4 h-4 text-success-text" />
            <span>Oturum Aç (Giriş)</span>
          </button>

          <button
            id="tab-auth-register"
            onClick={() => { setTab('register'); setErrorMessage(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-base-surface text-text-primary border border-border shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Building2 className="w-4 h-4 text-warning-text" />
            <span>Yeni Bayi Kaydı</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5">

          {/* Google Sign-In Primary Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-base-surface hover:bg-base-surface-2 border border-border hover:border-border-strong rounded-2xl text-xs sm:text-sm font-bold text-text-primary shadow-xs transition-all flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-50 group"
            >
              {/* Google G Logo SVG */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google ile Hızlı ve Güvenli Giriş Yap</span>
            </button>

            <div className="relative flex items-center justify-center py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <span className="relative px-3 bg-base-surface text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                veya e-posta ile
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-bg-danger border border-danger-border text-danger-text rounded-xl text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-danger-text shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  E-Posta Adresi veya Kullanıcı Adı
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="input-login-email"
                    type="text"
                    required
                    placeholder="ornek@sirket.com veya admin"
                    value={loginIdentifier}
                    onChange={e => setLoginIdentifier(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:bg-base-surface focus:border-border-strong"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  Şifre
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    id="input-login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-base-surface-2 border border-border rounded-xl text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:bg-base-surface focus:border-border-strong"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-login"
                disabled={isLoading}
                className="w-full py-3 bg-info-fill hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Güvenli Giriş Yap</span>
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-border text-center">
                <button
                  type="button"
                  onClick={() => setTab('register')}
                  className="text-xs text-text-secondary hover:text-text-primary underline cursor-pointer"
                >
                  Hesabınız yok mu? Hemen bayi kaydı oluşturun
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: DEALER REGISTRATION FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    Firma / Şirket Ünvanı *
                  </label>
                  <div className="relative">
                    <Building2 className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="Örn: Kuzey Tesisat Ltd."
                      value={regCompanyName}
                      onChange={e => setRegCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    Yetkili Adı Soyadı *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      required
                      placeholder="Örn: Ahmet Yılmaz"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                    />
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    E-Posta Adresi *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="email"
                      required
                      placeholder="info@sirketiniz.com"
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    Telefon Numarası *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="tel"
                      required
                      placeholder="+90 532 000 00 00"
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                    />
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    İl / Şehir *
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="İstanbul, Ankara, Şanlıurfa..."
                      value={regCity}
                      onChange={e => setRegCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary mb-1">
                    Vergi Numarası / Dairesi
                  </label>
                  <input
                    type="text"
                    placeholder="Vergi No / Daire"
                    value={regTaxNumber}
                    onChange={e => setRegTaxNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">
                  Adres / Şantiye Lokasyonu
                </label>
                <input
                  type="text"
                  placeholder="Açık adres ve teslimat bilgisi..."
                  value={regAddress}
                  onChange={e => setRegAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text-secondary mb-1">
                  Giriş Şifresi Belirleyin (En az 6 karakter) *
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-base-surface-2 border border-border rounded-xl text-xs text-text-primary focus:bg-base-surface focus:border-border-strong"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-register"
                disabled={isLoading}
                className="w-full py-3 bg-warning-fill hover:opacity-90 disabled:opacity-50 text-base rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-base/40 border-t-base rounded-full animate-spin" />
                ) : (
                  <>
                    <Building2 className="w-4 h-4" />
                    <span>Bayi Olarak Kaydol & Oturum Aç</span>
                  </>
                )}
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer with Cryptographic Guarantees */}
        <div className="bg-base-surface-2 px-6 py-3 border-t border-border text-center text-[10px] text-text-muted">
          Tüm parolalar PBKDF2 10.000 döngü SHA-512 tuzlu hash ile şifrelenir. Düz metin parola asla saklanmaz.
        </div>

      </div>
      </div>
    </div>
  );
}
