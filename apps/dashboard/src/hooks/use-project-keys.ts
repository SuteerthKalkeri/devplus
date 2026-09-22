import { useCallback, useEffect, useState } from 'react';
import { api, type IngestionKey } from '../api';
import { message } from '../lib/error-message';

export function useProjectKeys(projectId: string | undefined) {
  const [keys, setKeys] = useState<IngestionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshKeys = useCallback(async () => {
    setKeys(await api<IngestionKey[]>(`/projects/${projectId}/api-keys`));
  }, [projectId]);

  useEffect(() => {
    let active = true;
    api<IngestionKey[]>(`/projects/${projectId}/api-keys`)
      .then((keys) => {
        if (active) setKeys(keys);
      })
      .catch((error) => {
        if (active) setError(message(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  return { keys, loading, error, setError, refreshKeys };
}
