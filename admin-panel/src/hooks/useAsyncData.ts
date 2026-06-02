import { useCallback, useState } from 'react';

interface AsyncDataOptions {
  initialLoading?: boolean;
}

export function useAsyncData(options: AsyncDataOptions = {}) {
  const { initialLoading = true } = options;
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setError,
    setLoading,
    execute,
  };
}
