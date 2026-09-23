import { User, LoginCredentials, RegisterCredentials, UserRole } from '../types';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  db,
  doc,
  getDoc,
  setDoc,
  FirebaseUser
} from './firebase';

const TOKEN_STORAGE_KEY = 'alpha_b2b_auth_token';
const USER_STORAGE_KEY = 'alpha_b2b_auth_user';

export const ADMIN_EMAILS = ['fatihfirat1010@gmail.com', 'muslimfirat@yahoo.com'];

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: User) {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

export function clearStoredSession() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session:', err);
  }
}

/**
 * Normalizes and synchronizes Firebase Auth User with Firestore profile
 */
export async function syncFirebaseUserToFirestore(fbUser: FirebaseUser, extraData?: Partial<User>): Promise<User> {
  const email = (fbUser.email || '').trim().toLowerCase();
  const isAdminEmail = ADMIN_EMAILS.includes(email);

  try {
    const userRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const role: UserRole = (isAdminEmail || data.role === 'admin') ? 'admin' : (data.role === 'operasyon' ? 'operasyon' : (data.role || 'customer'));
      
      const user: User = {
        id: fbUser.uid,
        email: email,
        name: data.name || fbUser.displayName || (email === 'fatihfirat1010@gmail.com' ? 'Fatih Fırat (Yönetici)' : email.split('@')[0]) || 'Kullanıcı',
        companyName: data.companyName || extraData?.companyName || (isAdminEmail ? 'ALPHA TEKNİK' : 'Bayi'),
        phone: data.phone || fbUser.phoneNumber || extraData?.phone || '',
        address: data.address || extraData?.address || '',
        city: data.city || extraData?.city || 'Şanlıurfa',
        taxNumber: data.taxNumber || extraData?.taxNumber || '',
        taxOffice: data.taxOffice || extraData?.taxOffice || '',
        role: role,
        isDealer: data.isDealer !== undefined ? data.isDealer : !isAdminEmail,
        discountTier: isAdminEmail ? 'ALPHA_ADMIN' : (data.discountTier || 'ALPHA_ADMIN'),
        createdAt: data.createdAt || new Date().toISOString(),
      };

      try {
        await setDoc(userRef, { ...user, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn('Could not update user doc in Firestore (quota limit or offline):', err);
      }
      return user;
    } else {
      // New user in Firestore
      const role: UserRole = isAdminEmail ? 'admin' : (extraData?.role || 'customer');
      const newUser: User = {
        id: fbUser.uid,
        email: email,
        name: extraData?.name || fbUser.displayName || (email === 'fatihfirat1010@gmail.com' ? 'Fatih Fırat (Yönetici)' : (isAdminEmail ? 'Müslüm Fırat (Yönetici)' : email.split('@')[0])) || 'Kullanıcı',
        companyName: extraData?.companyName || (isAdminEmail ? 'ALPHA TEKNİK DOĞALGAZ' : 'Yeni Bayi'),
        phone: extraData?.phone || fbUser.phoneNumber || '',
        address: extraData?.address || '',
        city: extraData?.city || 'Şanlıurfa',
        taxNumber: extraData?.taxNumber || '',
        taxOffice: extraData?.taxOffice || '',
        role: role,
        isDealer: !isAdminEmail,
        discountTier: isAdminEmail ? 'ALPHA_ADMIN' : 'A_TIER',
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(userRef, newUser);
      } catch (err) {
        console.warn('Could not create user doc in Firestore (quota limit or offline):', err);
      }
      return newUser;
    }
  } catch (err) {
    console.warn('Firestore sync failed (e.g. quota exceeded):', err);
    // Return a safe fallback User object based on Firebase Auth data so the user is never blocked
    const role: UserRole = isAdminEmail ? 'admin' : (extraData?.role || 'customer');
    return {
      id: fbUser.uid,
      email: email,
      name: extraData?.name || fbUser.displayName || (email === 'fatihfirat1010@gmail.com' ? 'Fatih Fırat (Yönetici)' : (isAdminEmail ? 'Müslüm Fırat (Yönetici)' : email.split('@')[0])) || 'Kullanıcı',
      companyName: extraData?.companyName || (isAdminEmail ? 'ALPHA TEKNİK DOĞALGAZ' : 'Bayi'),
      phone: extraData?.phone || fbUser.phoneNumber || '',
      address: extraData?.address || '',
      city: extraData?.city || 'Şanlıurfa',
      taxNumber: extraData?.taxNumber || '',
      taxOffice: extraData?.taxOffice || '',
      role: role,
      isDealer: !isAdminEmail,
      discountTier: isAdminEmail ? 'ALPHA_ADMIN' : 'A_TIER',
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Google Sign-In with Firebase Authentication and Redirect Fallback
 */
export async function signInWithGoogle(): Promise<{ user: User; token: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const token = await fbUser.getIdToken();

    const user = await syncFirebaseUserToFirestore(fbUser);
    setStoredSession(token, user);
    return { user, token };
  } catch (err: any) {
    console.warn('Google popup sign-in error:', err);

    const kod = String(err?.code || '');

    if (kod === 'auth/popup-closed-by-user' || kod === 'auth/cancelled-popup-request') {
      throw new Error('Giriş işlemi kullanıcı tarafından iptal edildi.');
    }

    if (kod === 'auth/disallowed_useragent') {
      throw new Error(
        'Google, güvenlik politikaları nedeniyle bu uygulama içi tarayıcıdan girişe izin vermemektedir. ' +
        'Lütfen e-posta ve şifrenizle giriş yapın.'
      );
    }

    // Popup akisi apis.google.com/js/api.js script'ine ve bir araci iframe'e
    // muhtactir. Reklam/izleme engelleyiciler (Brave Shields, uBlock vb.) bu
    // script'i bloklayinca Firebase bunu auth/internal-error olarak bildirir.
    // Bu durumda POPUP yerine YONLENDIRME akisina gec.
    const yonlendirmeyeGec = [
      'auth/popup-blocked',
      'auth/internal-error',
      'auth/network-request-failed',
      'auth/web-storage-unsupported',
    ].includes(kod);

    if (yonlendirmeyeGec) {
      try {
        await signInWithRedirect(auth, googleProvider);
        // Sayfa yonlendirilir; donusu App basta handleGoogleRedirectResult / onAuthStateChanged ile karsilar.
        return new Promise(() => {});
      } catch (redirectErr: any) {
        throw new Error(
          'Google ile giriş açılamadı. Lütfen e-posta ve şifrenizle giriş yapın veya ' +
          'reklam engelleyici eklentinizi bu site için devre dışı bırakın.'
        );
      }
    }

    if (kod === 'auth/unauthorized-domain') {
      throw new Error('Bu alan adı Firebase Konsolunda yetkilendirilmemiş (Authentication → Settings → Authorized domains).');
    }
    if (kod === 'auth/operation-not-allowed') {
      throw new Error('Google ile giriş Firebase Konsolunda aktif değil.');
    }
    throw new Error(firebaseAuthHatasiniCevir(err));
  }
}

/**
 * Yonlendirmeli (redirect) Google girisinin sonucunu karsilar.
 *
 * getRedirectResult daha once hic CAGRILMIYORDU; yalnizca import edilmisti.
 * Bu yuzden popup basarisiz olup yonlendirmeye dusuldugunde donus sessizce
 * isleniyor, hata varsa kullaniciya hic gosterilmiyordu. (19.09.2026)
 */
export async function handleGoogleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    const token = await result.user.getIdToken();
    const user = await syncFirebaseUserToFirestore(result.user);
    setStoredSession(token, user);
    return user;
  } catch (err: any) {
    console.warn('Google redirect sonucu işlenemedi:', err);
    return null;
  }
}

/**
 * Logout from Firebase Auth & local storage
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Firebase signOut error:', e);
  }
  clearStoredSession();
}

export interface DemoAccount {
  label: string;
  emailOrUsername: string;
  username?: string;
  password: string;
  role: 'customer' | 'admin';
  company: string;
  name: string;
  badge: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Yönetici (Admin)',
    emailOrUsername: 'admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    company: 'ALPHA TEKNİK DOĞALGAZ SAN. VE TİC. LTD. ŞTİ.',
    name: 'Müslüm Fırat (Yönetici)',
    badge: '👑 Admin Paneli',
  },
  {
    label: 'Örnek Bayi (Müşteri)',
    emailOrUsername: 'bayi',
    username: 'bayi',
    password: 'bayi123',
    role: 'customer',
    company: 'Örnek Doğalgaz & Mühendislik Ltd. Şti.',
    name: 'Örnek Bayi Tesisat',
    badge: '🏢 Bayi Portalı',
  },
];

const FALLBACK_USERS: Record<string, { user: User; password: string }> = {
  admin: {
    user: {
      id: 'usr-admin-01',
      email: 'admin@alphadogalgaz.com',
      name: 'ALPHA Sistem Yöneticisi',
      companyName: 'ALPHA TEKNİK DOĞALGAZ A.Ş.',
      phone: '+90 544 440 91 80',
      address: 'Batıkent Mah. Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa',
      city: 'Şanlıurfa',
      taxNumber: '0580948214',
      taxOffice: 'Karaköprü VD',
      role: 'admin',
      isDealer: false,
      discountTier: 'ALPHA_ADMIN',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    password: 'admin123',
  },
  'admin@alphadogalgaz.com': {
    user: {
      id: 'usr-admin-01',
      email: 'admin@alphadogalgaz.com',
      name: 'ALPHA Sistem Yöneticisi',
      companyName: 'ALPHA TEKNİK DOĞALGAZ A.Ş.',
      phone: '+90 544 440 91 80',
      address: 'Batıkent Mah. Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa',
      city: 'Şanlıurfa',
      taxNumber: '0580948214',
      taxOffice: 'Karaköprü VD',
      role: 'admin',
      isDealer: false,
      discountTier: 'ALPHA_ADMIN',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    password: 'admin123',
  },
  'muslimfirat@yahoo.com': {
    user: {
      id: 'usr-admin-muslimfirat',
      email: 'muslimfirat@yahoo.com',
      name: 'Müslüm Fırat (Yönetici)',
      companyName: 'ALPHA TEKNİK DOĞALGAZ A.Ş.',
      phone: '+90 544 440 91 80',
      address: 'Batıkent Mah. Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa',
      city: 'Şanlıurfa',
      taxNumber: '0580948214',
      taxOffice: 'Karaköprü VD',
      role: 'admin',
      isDealer: false,
      discountTier: 'ALPHA_ADMIN',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    password: 'admin123',
  },
  muslimfirat: {
    user: {
      id: 'usr-admin-muslimfirat',
      email: 'muslimfirat@yahoo.com',
      name: 'Müslüm Fırat (Yönetici)',
      companyName: 'ALPHA TEKNİK DOĞALGAZ A.Ş.',
      phone: '+90 544 440 91 80',
      address: 'Batıkent Mah. Beyazıt Bulvarı No:32/1 Karaköprü / Şanlıurfa',
      city: 'Şanlıurfa',
      taxNumber: '0580948214',
      taxOffice: 'Karaköprü VD',
      role: 'admin',
      isDealer: false,
      discountTier: 'ALPHA_ADMIN',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    password: 'admin123',
  },
  bayi: {
    user: {
      id: 'usr-customer-01',
      email: 'bayi@alphadogalgaz.com',
      name: 'Örnek Bayi Tesisat',
      companyName: 'Örnek Doğalgaz & Mühendislik Ltd. Şti.',
      phone: '+90 555 123 45 67',
      address: 'Organize Sanayi Bölgesi 12. Cad. No:4 Şanlıurfa',
      city: 'Şanlıurfa',
      taxNumber: '1234567890',
      taxOffice: 'Şanlıurfa VD',
      role: 'customer',
      isDealer: true,
      discountTier: 'A_TIER',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    password: 'bayi123',
  },
  'bayi@alphadogalgaz.com': {
    user: {
      id: 'usr-customer-01',
      email: 'bayi@alphadogalgaz.com',
      name: 'Örnek Bayi Tesisat',
      companyName: 'Örnek Doğalgaz & Mühendislik Ltd. Şti.',
      phone: '+90 555 123 45 67',
      address: 'Organize Sanayi Bölgesi 12. Cad. No:4 Şanlıurfa',
      city: 'Şanlıurfa',
      taxNumber: '1234567890',
      taxOffice: 'Şanlıurfa VD',
      role: 'customer',
      isDealer: true,
      discountTier: 'A_TIER',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    password: 'bayi123',
  },
};

/**
 * Standard Email/Password login with fallback to backend or offline mock
 */
export async function loginUser(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
  const email = (credentials.emailOrUsername || '').trim().toLowerCase();
  const password = credentials.password || '';

  if (!email.includes('@')) {
    throw new Error('Lütfen e-posta adresinizle giriş yapın.');
  }
  if (!password) {
    throw new Error('Lütfen şifrenizi girin.');
  }

  try {
    // Kimlik dogrulamasi DOGRUDAN Firebase Auth uzerinden.
    //
    // Eskiden burada fetch('/api/auth/login') vardi. Bu uygulama Firebase
    // Hosting'de statik yayinlaniyor, sunucu YOK: o istek HTTP 200 + index.html
    // donuyor, res.json() HTML uzerinde patliyor ve kod sahte bir yerel oturum
    // aciyordu. O oturumun Firebase kimligi olmadigi icin kullanici girisli
    // gorunuyor ama Firestore'daki hicbir veriye erisemiyordu.
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = await syncFirebaseUserToFirestore(cred.user);
    const token = await cred.user.getIdToken();
    setStoredSession(token, user);
    return { user, token };
  } catch (err: any) {
    throw new Error(firebaseAuthHatasiniCevir(err));
  }
}

/**
 * Firebase Auth hata kodlarini kullanicinin anlayacagi Turkce mesaja cevirir.
 */
function firebaseAuthHatasiniCevir(err: any): string {
  const kod = String(err?.code || '');
  switch (kod) {
    case 'auth/invalid-email':
      return 'E-posta adresi geçersiz.';
    case 'auth/user-disabled':
      return 'Bu hesap devre dışı bırakılmış.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-posta veya şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.';
    case 'auth/weak-password':
      return 'Şifre çok zayıf. En az 6 karakter olmalı.';
    case 'auth/network-request-failed':
      return 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.';
    case 'auth/operation-not-allowed':
      return 'Bu giriş yöntemi Firebase konsolunda kapalı görünüyor.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Giriş penceresi kapatıldı.';
    case 'auth/disallowed_useragent':
      return 'Google, uygulama içi taranan pencereden girişi engellemektedir. Lütfen e-posta/şifre ile giriş yapın.';
    case 'auth/account-exists-with-different-credential':
      return 'Bu e-posta adresiyle başka bir yöntem kullanılarak kaydolunmuş.';
    default:
      return err?.message || 'İşlem tamamlanamadı. Lütfen tekrar deneyin.';
  }
}

/**
 * Standard Dealer registration
 */
export async function registerUser(credentials: RegisterCredentials): Promise<{ user: User; token: string }> {
  const email = (credentials.email || '').trim().toLowerCase();
  const password = credentials.password || '';

  if (!email.includes('@')) {
    throw new Error('Geçerli bir e-posta adresi girin.');
  }
  if (password.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalı.');
  }

  try {
    // Kayit DOGRUDAN Firebase Auth uzerinden.
    //
    // Eskiden burada fetch('/api/auth/register') vardi; sunucu olmadigi icin
    // istek index.html donuyor, res.json() patliyor ve hata "Failed to fetch"
    // olmadigi icin catch bloguna takilmadan kullaniciya firliyordu.
    // Yani e-posta/sifre ile kayit HICBIR ZAMAN calismiyordu.
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    const user = await syncFirebaseUserToFirestore(cred.user, {
      name: (credentials.name || '').trim(),
      companyName: (credentials.companyName || '').trim(),
      phone: (credentials.phone || '').trim(),
      address: (credentials.address || '').trim(),
      city: (credentials.city || '').trim() || 'Şanlıurfa',
      taxNumber: (credentials.taxNumber || '').trim(),
      taxOffice: (credentials.taxOffice || '').trim(),
      role: 'customer',
    });

    const token = await cred.user.getIdToken();
    setStoredSession(token, user);

    // Yeni kayıtta cari_accounts'a pending kayıt oluştur.
    // Kurallar bunu zaten izin veriyor: kendi e-postasıyla, pending ve
    // tüm finansal alanlar sıfır olmak koşuluyla kullanıcı kendi kartını açabilir.
    try {
      const now = new Date().toISOString();
      const cariDocRef = doc(db, 'cari_accounts', cred.user.uid);
      await setDoc(cariDocRef, {
        id: cred.user.uid,
        code: `CR-${Date.now()}`,
        name: (credentials.name || '').trim(),
        companyName: (credentials.companyName || '').trim(),
        type: 'customer',
        taxNumber: (credentials.taxNumber || '').trim(),
        taxOffice: (credentials.taxOffice || '').trim(),
        phone: (credentials.phone || '').trim(),
        email,
        city: (credentials.city || '').trim() || 'Şanlıurfa',
        address: (credentials.address || '').trim(),
        creditLimit: 0,
        paymentTermDays: 30,
        balance: 0,
        totalDebit: 0,
        totalCredit: 0,
        status: 'pending',
        notes: 'Yeni bayi kaydı – Yönetici onayı bekliyor.',
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // cari_accounts oluşturulamazsa auth başarısını engelleme;
      // admin sonradan manuel kayıt açabilir.
    }

    return { user, token };
  } catch (err: any) {
    throw new Error(firebaseAuthHatasiniCevir(err));
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
  const fbUser = auth.currentUser;
  if (!fbUser || !fbUser.email) {
    throw new Error('Oturum açılmamış. Lütfen tekrar giriş yapın.');
  }
  if ((newPassword || '').length < 6) {
    throw new Error('Yeni şifre en az 6 karakter olmalı.');
  }

  try {
    // Firebase yakin zamanda giris yapilmis olmasini ister; once mevcut
    // sifreyle yeniden dogrula. (Eskiden burada olu bir /api/auth/change-password
    // cagrisi vardi ve sifre degistirme hic calismiyordu.)
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await updatePassword(fbUser, newPassword);
    return true;
  } catch (err: any) {
    throw new Error(firebaseAuthHatasiniCevir(err));
  }
}

export async function verifyCurrentSession(): Promise<User | null> {
  // Oturumun tek kaynagi Firebase Auth. (Eskiden olu bir /api/auth/me cagrisi
  // vardi; basarisiz olunca localStorage'daki eski kullaniciya geri dusuyordu.)
  const fbUser = auth.currentUser;
  if (!fbUser) {
    clearStoredSession();
    return null;
  }

  try {
    const user = await syncFirebaseUserToFirestore(fbUser);
    const token = await fbUser.getIdToken();
    setStoredSession(token, user);
    return user;
  } catch {
    return getStoredUser();
  }
}

export async function getDemoAccounts(): Promise<DemoAccount[]> {
  return DEMO_ACCOUNTS;
}
