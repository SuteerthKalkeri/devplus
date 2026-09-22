import { useEffect, useState } from 'react';
import { api, ApiError, type Account } from '../api';
import { message } from '../lib/error-message';

export function useSession() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    api<Account>('/auth/me')
      .then((user) => {
        if (active) setAccount(user);
      })
      .catch((error) => {
        if (active && !(error instanceof ApiError && error.status === 401))
          setError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const expireSession = () => setAccount(null);
    window.addEventListener('session-expired', expireSession);
    return () => {
      active = false;
      window.removeEventListener('session-expired', expireSession);
    };
  }, [attempt]);

  function retry() {
    setError('');
    setLoading(true);
    setAttempt((current) => current + 1);
  }

  return { account, setAccount, loading, error, retry };
}
