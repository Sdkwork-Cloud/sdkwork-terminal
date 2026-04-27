import { useRef } from "react";

export function useLatestRef<T>(value: T) {
  const valueRef = useRef(value);
  valueRef.current = value;

  return valueRef;
}

type StableCallback<Args extends unknown[] = never[], Result = unknown> = (
  ...args: Args
) => Result;

export function useStableCallback<Args extends unknown[], Result>(
  callback: StableCallback<Args, Result>,
): StableCallback<Args, Result> {
  const latestCallbackRef = useLatestRef(callback);
  const stableCallbackRef = useRef<StableCallback<Args, Result> | null>(null);

  if (stableCallbackRef.current === null) {
    stableCallbackRef.current = (...args: Args): Result =>
      latestCallbackRef.current(...args);
  }

  return stableCallbackRef.current;
}
