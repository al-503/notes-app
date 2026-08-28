import { useCallback, useEffect, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export function useSpeechToText() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [volume, setVolume] = useState(-2);
  const [durationMillis, setDurationMillis] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
    startedAtRef.current = Date.now();
  });
  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
    startedAtRef.current = null;
  });
  useSpeechRecognitionEvent('error', () => {
    setIsRecording(false);
  });
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript;
    if (text) setTranscript(text);
  });
  useSpeechRecognitionEvent('volumechange', (event) => {
    setVolume(event.value);
  });

  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      if (startedAtRef.current) setDurationMillis(Date.now() - startedAtRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  const start = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      throw new Error('Permission micro/dictée refusée');
    }
    setTranscript('');
    setDurationMillis(0);
    ExpoSpeechRecognitionModule.start({
      lang: 'fr-FR',
      interimResults: true,
      continuous: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isRecording, transcript, setTranscript, volume, durationMillis, start, stop };
}
