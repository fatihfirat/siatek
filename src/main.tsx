import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

const isPath = (p: string) => window.location.pathname === p;

const Screen = isPath('/products-preview')
  ? lazy(() => import('./components/ui/ProductTablePreview'))
  : isPath('/mobile-erp-preview')
  ? lazy(() => import('./components/ui/MobileERPPreview'))
  : isPath('/operations-preview')
  ? lazy(() => import('./components/ui/OperationsPreview'))
  : isPath('/orders-preview')
  ? lazy(() => import('./components/ui/OrdersPreview'))
  : isPath('/shopping-preview')
  ? lazy(() => import('./components/ui/ShoppingPreview'))
  : isPath('/reference-preview')
  ? lazy(() => import('./components/ui/ReferencePreview'))
  : isPath('/shell-preview')
  ? lazy(() => import('./components/ui/ShellPreview'))
  : isPath('/design-system')
  ? lazy(() => import('./components/ui/DesignSystemPreview'))
  : lazy(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary moduleName="Ana Uygulama">
      <Suspense fallback={<p role="status">Yükleniyor…</p>}><Screen /></Suspense>
    </ErrorBoundary>
  </StrictMode>,
);
