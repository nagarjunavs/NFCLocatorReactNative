import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * True when either the host asks for reduced motion (its own in-app setting) or the OS
 * "reduce motion" accessibility setting is on.
 */
export function useReducedMotion(hostRequested: boolean | undefined): boolean {
  const [system, setSystem] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setSystem(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => mounted && setSystem(v));
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return hostRequested === true || system;
}
