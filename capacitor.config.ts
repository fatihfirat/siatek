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
  }
};

export default config;
