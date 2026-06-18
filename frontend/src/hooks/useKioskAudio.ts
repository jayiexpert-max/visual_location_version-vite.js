import { useCallback, useEffect, useRef, useState } from 'react';
import {
  initKioskVoices,
  readKioskAudioEnabled,
  speakKioskToggleTest,
  writeKioskAudioEnabled,
} from '../utils/kioskTts';

type KioskAudioContext = 'tv' | '3d';

export function useKioskAudio(
  storageKey: string,
  lang: string,
  searchParams: URLSearchParams,
  context: KioskAudioContext,
  legacyKeys: string[] = [],
) {
  const [enabled, setEnabled] = useState(() =>
    readKioskAudioEnabled(storageKey, searchParams, legacyKeys),
  );
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    initKioskVoices();
  }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    writeKioskAudioEnabled(storageKey, next);
    speakKioskToggleTest(next, lang, context);
    setEnabled(next);
  }, [context, lang, storageKey]);

  const setWithUnlock = useCallback(
    (next: boolean) => {
      enabledRef.current = next;
      writeKioskAudioEnabled(storageKey, next);
      speakKioskToggleTest(next, lang, context);
      setEnabled(next);
    },
    [context, lang, storageKey],
  );

  return { enabled, toggle, setWithUnlock };
}
