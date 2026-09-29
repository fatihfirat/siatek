import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alphateknikhvac.app',
  appName: 'ALPHA TEKNİK',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  ios: {
    scrollEnabled: true,
    preferredContentMode: 'mobile',
    contentInset: 'always'
  },
  android: {
    backgroundColor: '#111827',
    allowMixedContent: true
  },
  plugins: {
    FirebaseAuthentication: {
      // Native hesap seciciyi kullan, kimlik bilgisini Firebase Web SDK'ya
      // aktar. Boylece uygulamanin mevcut onAuthStateChanged akisi tek kaynak kalir.
      skipNativeAuth: true,
      providers: ['google.com']
    }
  }
};

export default config;
