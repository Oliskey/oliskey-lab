import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ActionButton, Field, Logo } from '../components/ui';
import { DEMO_ONLY, useApp } from '../app/context';

const Frame: React.FC<{ title: string; lead: string; children: React.ReactNode; foot: React.ReactNode }> = ({ title, lead, children, foot }) => (
  <div className="flex min-h-screen flex-col bg-surface">
    <header className="page-x flex h-16 items-center"><Link to="/" aria-label="Oliskey Lab"><Logo /></Link></header>
    <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-14">
      <div className="panel w-full max-w-form p-6 sm:p-8">
        <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-small text-muted">{lead}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
    <p className="pb-8 text-center text-small text-muted">{foot}</p>
  </div>
);

export const SignIn: React.FC = () => {
  const { api, refresh, enterDemo } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (DEMO_ONLY) return <Navigate to="/" replace />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await api.signIn({ email, password }); await refresh(); nav('/app'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Frame title="Sign in to Oliskey Lab" lead="Welcome back." foot={<>New to Oliskey Lab? <Link className="font-semibold text-accent-ink" to="/sign-up">Create your account</Link> or <button className="font-semibold text-accent-ink" onClick={() => { enterDemo(); nav('/app'); }}>try the demo</button></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="email" label="Email"><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field id="password" label="Password"><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p role="alert" className="rounded-field bg-bad/10 px-3.5 py-2.5 text-small text-bad">{error}</p>}
        <ActionButton busy={busy} type="submit" className="w-full">Sign in</ActionButton>
      </form>
    </Frame>
  );
};

export const SignUp: React.FC = () => {
  const { api, refresh } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', business: '', email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (DEMO_ONLY) return <Navigate to="/" replace />;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = 'Enter your name.';
    if (!f.business.trim()) errs.business = 'Enter your business name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = 'Enter an email address like you@business.com.';
    if (f.password.length < 10) errs.password = 'Use at least 10 characters.';
    setErrors(errs); if (Object.keys(errs).length) return;
    setBusy(true);
    try { await api.signUp(f); await refresh(); nav('/app/discovery'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Frame title="Create your Oliskey Lab account" lead="One account for your website, app, social media and customers." foot={<>Already have an account? <Link className="font-semibold text-accent-ink" to="/sign-in">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field id="name" label="Your name" error={errors.name}><input className="input" autoComplete="name" value={f.name} onChange={set('name')} /></Field>
        <Field id="business" label="Business name" error={errors.business}><input className="input" autoComplete="organization" value={f.business} onChange={set('business')} /></Field>
        <Field id="email" label="Email" error={errors.email}><input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} /></Field>
        <Field id="password" label="Password" help="At least 10 characters." error={errors.password}><input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} /></Field>
        {error && <p role="alert" className="rounded-field bg-bad/10 px-3.5 py-2.5 text-small text-bad">{error}</p>}
        <ActionButton busy={busy} type="submit" className="w-full">Create account</ActionButton>
        <p className="text-caption text-muted">You own your business data. You can export or delete it at any time.</p>
      </form>
    </Frame>
  );
};
