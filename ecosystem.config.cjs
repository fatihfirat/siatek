module.exports = {
  apps: [
    {
      name: 'alpha-teknik-b2b',
      script: 'dist/server.cjs',
      instances: 'max', // Sunucudaki tüm CPU çekirdeklerini kullanır (Cluster Mode)
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // DATABASE_URL= sunucu ortamında veya .env dosyasında tanımlı olmalıdır.
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      time: true,
    }
  ]
};
