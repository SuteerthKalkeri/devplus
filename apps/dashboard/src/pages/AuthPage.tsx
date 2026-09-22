import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, ArrowUpRight, Radio, ShieldCheck } from 'lucide-react';
import { api, signIn, type Account } from '../api';
import { Brand } from '../components/Brand';
import { ErrorMessage } from '../components/ErrorMessage';
import { message } from '../lib/error-message';

export function AuthPage({
  register,
  onLogin,
}: {
  register: boolean;
  onLogin: (account: Account) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = new FormData(event.currentTarget);
    const email = String(values.get('email')).trim();
    const password = String(values.get('password'));
    try {
      if (register)
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name: values.get('name'), email, password }),
        });
      onLogin(await signIn(email, password));
      navigate('/');
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Brand />
        <div className="story-content">
          <div className="eyebrow">
            <span className="live-dot" /> BUILT FOR DEVELOPERS
          </div>
          <h1>
            A clearer view.
            <br />
            <span>A better app.</span>
          </h1>
          <p>
            Your application has a story to tell.
            <br />
            Give every request and every error a place to land.
          </p>
          <div className="signal-art" aria-hidden="true">
            <div className="signal-line" />
            <Activity size={160} strokeWidth={0.65} />
            <div className="signal-caption">
              <Radio size={14} /> Less noise. More understanding.
            </div>
          </div>
        </div>
        <div className="story-footer">
          YOUR NEXT GREAT RELEASE STARTS HERE <ArrowUpRight size={15} />
        </div>
      </section>
      <main className="auth-main">
        <div className="auth-top">
          {register ? 'Already have an account?' : 'New to DevPulse?'}{' '}
          <Link to={register ? '/login' : '/register'}>
            {register ? 'Sign in' : 'Create an account'} <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="auth-form">
          <div className="section-icon">
            <Activity size={23} />
          </div>
          <h2>{register ? 'Make room for better.' : 'Welcome back.'}</h2>
          <p className="muted">
            {register
              ? 'Create your account and set up your first workspace.'
              : 'Sign in to your DevPulse workspace.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  placeholder="Alex Morgan"
                  required
                  maxLength={100}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                maxLength={254}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder={register ? 'At least 12 characters' : 'Enter your password'}
                minLength={register ? 12 : undefined}
                maxLength={64}
                required
              />
            </label>
            {register && (
              <p className="field-hint">Use 12–64 characters. Make it unique to DevPulse.</p>
            )}
            <ErrorMessage message={error} />
            <button className="primary full" disabled={busy}>
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}{' '}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="auth-note">
            <ShieldCheck size={15} /> Your workspace. Your data. Your control.
          </div>
        </div>
        <div className="auth-bottom">
          DevPulse <span>APPLICATION OBSERVABILITY</span>
        </div>
      </main>
    </div>
  );
}
