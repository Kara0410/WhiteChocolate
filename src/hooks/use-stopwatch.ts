import { useCallback, useEffect, useRef, useState } from 'react';

function formatElapsedTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minuteText = String(minutes).padStart(2, '0');
  const secondText = String(seconds).padStart(2, '0');

  if (hours === 0) {
    return `${minuteText}:${secondText}`;
  }

  return `${String(hours).padStart(2, '0')}:${minuteText}:${secondText}`;
}

export function useStopwatch() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const accumulatedSecondsRef = useRef(0);
  const elapsedSecondsRef = useRef(0);

  useEffect(() => {
    if (!isRunning || startedAtRef.current === null) {
      return;
    }

    const updateElapsedTime = () => {
      if (startedAtRef.current === null) {
        return;
      }

      const currentSessionSeconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
      const nextElapsedSeconds =
        accumulatedSecondsRef.current + currentSessionSeconds;
      elapsedSecondsRef.current = nextElapsedSeconds;
      setElapsedSeconds(nextElapsedSeconds);
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  const start = useCallback((reset = false) => {
    if (reset) {
      accumulatedSecondsRef.current = 0;
      elapsedSecondsRef.current = 0;
      setElapsedSeconds(0);
    } else {
      accumulatedSecondsRef.current = elapsedSecondsRef.current;
    }

    startedAtRef.current = Date.now();
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    if (startedAtRef.current !== null) {
      const currentSessionSeconds = Math.floor(
        (Date.now() - startedAtRef.current) / 1000,
      );
      const nextElapsedSeconds =
        accumulatedSecondsRef.current + currentSessionSeconds;
      accumulatedSecondsRef.current = nextElapsedSeconds;
      elapsedSecondsRef.current = nextElapsedSeconds;
      setElapsedSeconds(nextElapsedSeconds);
    }

    startedAtRef.current = null;
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    accumulatedSecondsRef.current = 0;
    elapsedSecondsRef.current = 0;
    startedAtRef.current =
      startedAtRef.current === null ? null : Date.now();
    setElapsedSeconds(0);
  }, []);

  return {
    elapsedSeconds,
    formattedTime: formatElapsedTime(elapsedSeconds),
    isRunning,
    reset,
    start,
    stop,
  };
}
