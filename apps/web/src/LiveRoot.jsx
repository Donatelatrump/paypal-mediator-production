import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createApi } from './lib/api';
const ConnectedApp = lazy(() => import('./ConnectedApp'));
const apiUrl =
  import.meta.env.VITE_API_URL ||
  'https://resolve-ai-api-ybmj.onrender.com/api';
let authClient;
function auth() {
  if (!authClient)
    authClient = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    );
  return authClient;
}
export default function LiveRoot() {
  const configured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!configured) return;
    let mounted = true;
    const { data } = auth().auth.onAuthStateChange((_event, value) => {
      if (mounted) {
        setSession(value);
        setError('');
      }
    });
    auth()
      .auth.getSession()
      .then(({ data, error }) => {
        if (mounted) {
          if (error) setError(error.message);
          setSession(data.session);
        }
      })
      .catch((error) => {
        if (mounted) {
          setError(error.message);
          setSession(null);
        }
      });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [configured]);
  const api = useMemo(
    () =>
      createApi({
        baseUrl: apiUrl,
        getAccessToken: async () => {
          const { data, error } = await auth().auth.getSession();
          if (error) throw error;
          return data.session?.access_token;
        },
      }),
    [],
  );
  if (!configured)
    return (
      <div className="signed-out">
        <section className="card">
          <h1>Connection setup</h1>
          <p>
            Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in
            .env.local, then restart the frontend.
          </p>
        </section>
      </div>
    );
  if (session === undefined)
    return (
      <div className="signed-out" role="status">
        Restoring session…
      </div>
    );
  if (!session)
    return (
      <div className="signed-out">
        <section className="card">
          <h1>Sign in</h1>
          <p>Open your merchant workspace.</p>
          <form
            className="account-settings-form account-information-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError('');
              const form = new FormData(event.currentTarget);
              try {
                const { error } = await auth().auth.signInWithPassword({
                  email: String(form.get('email')).trim(),
                  password: String(form.get('password')),
                });
                if (error) throw error;
              } catch (error) {
                setError(error.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="button primary" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </section>
      </div>
    );
  return (
    <Suspense
      fallback={
        <div className="signed-out" role="status">
          Loading workspace…
        </div>
      }
    >
      <ConnectedApp
        key={session.user.id}
        api={api}
        auth={auth()}
        session={session}
      />
    </Suspense>
  );
}
