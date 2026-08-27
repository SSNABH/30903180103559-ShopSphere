import { useEffect, useRef, useState } from 'react';

export function useDebouncedValue(value, delay = 350, resetSignal = 0) {
  const [debounced, setDebounced] = useState(value);
  const latestValue = useRef(value);
  const lastResetSignal = useRef(resetSignal);
  const isResetting = lastResetSignal.current !== resetSignal;
  latestValue.current = value;

  useEffect(() => {
    lastResetSignal.current = resetSignal;
    setDebounced(latestValue.current);
  }, [resetSignal]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, resetSignal, value]);

  return isResetting ? value : debounced;
}
