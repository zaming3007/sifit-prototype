import { useCallback, useRef, useState } from 'react';
import { getApiErrorMessage, showError } from '../utils/errorHandler';
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const running = useRef(false);
  const run = useCallback(async action => {
    if (running.current) return false;
    running.current = true; setBusy(true); setError('');
    try { await action(); return true; }
    catch (cause) { setError(getApiErrorMessage(cause)); showError(cause); return false; }
    finally { running.current = false; setBusy(false); }
  }, []);
  return { busy, error, run, setError };
}
