import { useCallback, useEffect, useRef, useState } from 'react';
// Each load owns a generation and an AbortSignal; late responses never replace new routes.
export function useRemote(loader, deps = []) {
  const [state, setState] = useState({
    data: null,
    loading: true,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    Promise.resolve()
      .then(() => loader(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted && generation.current === current)
          setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted && generation.current === current)
          setState({ data: null, loading: false, error });
      });
    return () => controller.abort();
  }, [...deps, version]);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}
