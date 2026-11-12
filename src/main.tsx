import { detectRefraction } from './lib/liquid';
import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, createRoutesFromElements, Navigate, Outlet, Route, RouterProvider } from 'react-router-dom';
import '@fontsource-variable/inter';
import './index.css';
import { AppProvider, useApp } from './app/context';
import { Shell } from './app/Shell';
import { LoadingBlock, ToastProvider } from './components/ui';
import { IconDefs } from './components/icons';
import Landing from './pages/Landing';
import { SignIn, SignUp } from './pages/Auth';

const Home = lazy(() => import('./pages/Home'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Studio = lazy(() => import('./pages/Studio'));
const Editor = lazy(() => import('./pages/Editor'));
const Control = lazy(() => import('./pages/Control'));
const Product = lazy(() => import('./pages/Product'));
const Customers = lazy(() => import('./pages/Customers'));
const Social = lazy(() => import('./pages/Social'));
const Access = lazy(() => import('./pages/Access'));
const Module = lazy(() => import('./pages/Module'));
const Preview = lazy(() => import('./pages/Preview'));
const Build = lazy(() => import('./pages/Build'));
const Grow = lazy(() => import('./pages/Grow'));
const More = lazy(() => import('./pages/More'));
const Automation = lazy(() => import('./pages/Automation'));

/** Areas of the app need a signed-in session (a real account or the demo). */
const Private: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useApp();
  if (loading) return <div className="page-x py-16"><LoadingBlock /></div>;
  if (!session) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
};

const Root = () => (
  <AppProvider><ToastProvider>
    <IconDefs />
    <Suspense fallback={<div className="page-x py-16"><LoadingBlock /></div>}><Outlet /></Suspense>
  </ToastProvider></AppProvider>
);

const router = createBrowserRouter(createRoutesFromElements(
    <Route element={<Root />}>
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/preview/:siteId/:versionId" element={<Preview />} />
      <Route path="/s/:slug/*" element={<Preview />} />
      <Route path="/app" element={<Private><Shell /></Private>}>
        <Route index element={<Home />} />
        <Route path="build" element={<Build />} />
        <Route path="grow" element={<Grow />} />
        <Route path="more" element={<More />} />
        <Route path="automation" element={<Automation />} />
        <Route path="discovery" element={<Discovery />} />
        <Route path="studio" element={<Studio />} />
        <Route path="studio/:siteId" element={<Editor />} />
        <Route path="control" element={<Control />} />
        <Route path="control/:productId" element={<Product />} />
        <Route path="customers" element={<Customers />} />
        <Route path="social" element={<Social />} />
        <Route path="access" element={<Access />} />
        <Route path=":module" element={<Module />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>,
), { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' });

detectRefraction();
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
