import { useCallback, useEffect, useRef, useState } from 'react';

type SpeakOptions = {
  rate?: number;
  pitch?: number;
};

const pickPreferredVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined => {
  const english = voices.filter((voice) => voice.lang.startsWith('en'));
  return (
    english.find((voice) => voice.lang.startsWith('en-US')) ??
    english.find((voice) => voice.lang.startsWith('en-GB')) ??
    english[0] ??
    voices[0]
  );
};

export const useSpeechSynthesis = () => {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<Array<SpeechSynthesisVoice>>([]);

  const loadVoices = useCallback(() => {
    if (!supported) return;
    const list = window.speechSynthesis.getVoices();
    if (list.length > 0) setVoices(list);
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [supported, loadVoices]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
  }, [supported]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!supported || !text.trim()) return;
      stop();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickPreferredVoice(voices);
      if (voice) utterance.voice = voice;
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;

      utterance.onstart = () => {
        setSpeaking(true);
        setPaused(false);
      };
      utterance.onend = () => {
        utteranceRef.current = null;
        setSpeaking(false);
        setPaused(false);
      };
      utterance.onerror = () => {
        utteranceRef.current = null;
        setSpeaking(false);
        setPaused(false);
      };
      utterance.onpause = () => setPaused(true);
      utterance.onresume = () => setPaused(false);

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [supported, stop, voices],
  );

  const pause = useCallback(() => {
    if (!supported || !speaking || paused) return;
    window.speechSynthesis.pause();
    setPaused(true);
  }, [supported, speaking, paused]);

  const resume = useCallback(() => {
    if (!supported || !speaking || !paused) return;
    window.speechSynthesis.resume();
    setPaused(false);
  }, [supported, speaking, paused]);

  return {
    supported,
    speaking,
    paused,
    voices,
    speak,
    pause,
    resume,
    stop,
  };
};
