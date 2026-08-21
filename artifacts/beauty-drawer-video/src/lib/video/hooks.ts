import { useEffect, useState } from 'react';

type DurationMap = Record<string, number>;

declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export function useVideoPlayer({ durations }: { durations: DurationMap }) {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    const sceneKeys = Object.keys(durations);
    window.startRecording?.();
    let elapsed = 0;
    let recordingStopped = false;
    const timers = sceneKeys.map((key, index) => {
      elapsed += durations[key];
      return window.setTimeout(() => {
        if (index === sceneKeys.length - 1 && !recordingStopped) {
          recordingStopped = true;
          window.stopRecording?.();
        }
        setCurrentScene((index + 1) % sceneKeys.length);
      }, elapsed);
    });
    return () => timers.forEach(window.clearTimeout);
  }, [durations]);

  return { currentScene };
}