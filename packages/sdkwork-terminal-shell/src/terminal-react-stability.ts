import { useEffect, useRef } from "react";

export function useLatestRef<T>(value: T) {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  return valueRef;
}

type StableCallback = (...args: any[]) => any;

export function useStableCallback<T extends StableCallback>(callback: T): T {
  const latestCallbackRef = useLatestRef(callback);
  const stableCallbackRef = useRef<T | null>(null);

  if (stableCallbackRef.current === null) {
    stableCallbackRef.current = (((...args: Parameters<T>): ReturnType<T> =>
      latestCallbackRef.current(...args)) as T);
  }

  return stableCallbackRef.current;
}
