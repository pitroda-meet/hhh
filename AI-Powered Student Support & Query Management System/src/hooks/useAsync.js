import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync(loader, dependencies = []) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.resolve().then(() => loaderRef.current()).then((response) => { if (active) setData(response.data); }).catch((reason) => { if (active) setError(reason); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // Callers explicitly supply the inputs that invalidate their request.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, reloadKey]);
  return { data, loading, error, reload, setData };
}

export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const timer = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(timer); }, [value, delay]);
  return debounced;
}
