import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const moduleName = this.props.moduleName || 'Bu Bölüm';

      return (
        <div className="p-6 my-4 mx-auto max-w-2xl rounded-3xl bg-base-surface border border-danger-border shadow-xl text-text-primary animate-in fade-in duration-200">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-danger-fill/20 text-danger-text border border-danger-border flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-danger-fill/20 text-danger-text border border-danger-border">
                  Hata Koruma Kalkanı
                </span>
                <span className="text-xs text-text-muted">
                  {moduleName}
                </span>
              </div>
              
              <h3 className="text-base sm:text-lg font-bold text-text-primary mt-1">
                Görünüm Yüklenirken Beklenmeyen Bir Durum Oluştu
              </h3>
              
              <p className="text-xs text-text-secondary mt-1">
                Uygulamanın geri kalanı çalışmaya devam etmektedir. Bu bölümü yeniden başlatabilir veya sayfayı tazeleyebilirsiniz.
              </p>

              {this.state.error && (
                <div className="mt-3 p-3 rounded-xl bg-base-surface-2 border border-border font-mono text-[11px] text-danger-text overflow-x-auto max-h-32">
                  <div className="font-bold">{this.state.error.name}: {this.state.error.message}</div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-xl bg-primary-fill hover:bg-primary-hover text-white text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Bölümü Yeniden Başlat</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-2 rounded-xl bg-base-surface-2 hover:bg-base-surface border border-border text-xs font-bold text-text-primary flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <span>Sayfayı Yenile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
