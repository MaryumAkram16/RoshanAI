import { useState, useCallback } from 'react';

export function useUndoRedo<T>(initialValue: T) {
  const [history, setHistory] = useState<T[]>([initialValue]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const setValue = useCallback((newValue: T) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newValue);
      return newHistory;
    });
    setCurrentIndex((prev) => prev + 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      setCurrentIndex((curr) => Math.min(prev.length - 1, curr + 1));
      return prev;
    });
  }, []);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // Provide a way to override silently (e.g. initial load)
  const reset = useCallback((newValue: T) => {
    setHistory([newValue]);
    setCurrentIndex(0);
  }, []);

  return {
    value: history[currentIndex],
    setValue,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
