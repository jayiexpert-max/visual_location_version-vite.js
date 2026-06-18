interface TtsVoicePickerApi {
  pick: (voices: SpeechSynthesisVoice[], forThai: boolean) => SpeechSynthesisVoice | null;
  THAI_SPEECH_RATE?: number;
  EN_SPEECH_RATE?: number;
  speak: (
    text: string,
    voices: SpeechSynthesisVoice[],
    forThai: boolean,
    opts?: { rate?: number; pitch?: number; onError?: (e: SpeechSynthesisErrorEvent) => void },
  ) => boolean;
  loadVoices: () => SpeechSynthesisVoice[];
  logThaiVoices: (voices: SpeechSynthesisVoice[]) => void;
  logVoices: (voices: SpeechSynthesisVoice[], filter?: 'th' | 'en') => void;
}

declare global {
  interface Window {
    TtsVoicePicker?: TtsVoicePickerApi;
  }
}

export {};
