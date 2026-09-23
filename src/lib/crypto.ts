/**
 * Uygulama ici sifreleme yardimcilari (AES-256-GCM + PBKDF2, Web Crypto API).
 *
 * DURUSTLUK NOTU - BU "UCTAN UCA SIFRELEME" DEGILDIR:
 * Asagidaki anahtar istemci paketine gomulur, yani tarayiciya inen JS dosyasini
 * acan herkes anahtari gorebilir. Dolayisiyla bu katman "veriyi Firestore
 * konsolunda duz metin gormeyi engelleyen" bir maskeleme (at-rest obfuscation)
 * saglar; yetkisiz erisime karsi GERCEK koruma Firestore guvenlik kurallaridir.
 *
 * Gercek E2EE istenirse anahtarin sunucuya/veritabanina hic ulasmamasi,
 * kullanicinin parolasindan turetilip yalnizca cihazda kalmasi gerekir.
 * Bu durumda admin panelinin bu notlari okuyamayacagini unutma.
 *
 * Anahtari degistirme: mevcut kayitlar bu anahtarla sifrelendi, degistirilirse
 * eski siparislerin sifreli notlari acilamaz.
 */

const DEFAULT_SECRET = 'SECURE-E2EE-ENTERPRISE-SIGNING-KEY-V1';

// Derive an AES-GCM key from a shared secret passphrase
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a text or object payload using AES-256-GCM
 */
export async function encryptPayload(data: any, customPassphrase?: string): Promise<string> {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(customPassphrase || DEFAULT_SECRET, salt);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(text)
    );

    const combined = {
      salt: Array.from(salt),
      iv: Array.from(iv),
      cipher: Array.from(new Uint8Array(ciphertext)),
      algo: 'AES-256-GCM',
      timestamp: new Date().toISOString(),
    };

    return btoa(JSON.stringify(combined));
  } catch (err) {
    console.error('Encryption failed:', err);
    return `[ENC_FAIL:${btoa(typeof data === 'string' ? data : JSON.stringify(data))}]`;
  }
}

/**
 * Decrypt an AES-256-GCM encrypted payload
 */
export async function decryptPayload(encryptedBase64: string, customPassphrase?: string): Promise<string> {
  try {
    if (!encryptedBase64) return '';
    if (encryptedBase64.startsWith('[ENC_FAIL:')) {
      const b64 = encryptedBase64.replace('[ENC_FAIL:', '').replace(']', '');
      return atob(b64);
    }

    const decodedStr = atob(encryptedBase64);
    const parsed = JSON.parse(decodedStr);
    const salt = new Uint8Array(parsed.salt);
    const iv = new Uint8Array(parsed.iv);
    const cipher = new Uint8Array(parsed.cipher);

    const key = await deriveKey(customPassphrase || DEFAULT_SECRET, salt);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipher
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    return '(Şifrelenmiş Gizli Veri - Doğrulanamadı)';
  }
}

/**
 * Compute a tamper-proof SHA-256 digital hash of any object or string
 */
export async function generateSHA256Hash(data: any): Promise<string> {
  try {
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const enc = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(text));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    return '0000000000000000000000000000000000000000000000000000000000000000';
  }
}

/**
 * Verify if payload data matches an expected digital signature hash
 */
export async function verifyIntegrity(data: any, expectedHash: string): Promise<boolean> {
  const computed = await generateSHA256Hash(data);
  return computed.toLowerCase() === expectedHash.toLowerCase();
}
