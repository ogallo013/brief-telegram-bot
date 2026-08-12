import { useCallback, useEffect, useState } from 'react';

type SetValue<T> = T | ((prevValue: T) => T);

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') {
        return initialValue;
      }

      const item = window.localStorage.getItem(key);

      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: SetValue<T>) => {
      setStoredValue(prevValue => {
        try {
          const valueToStore =
            value instanceof Function ? value(prevValue) : value;

          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              key,
              JSON.stringify(valueToStore)
            );
          }

          return valueToStore;
        } catch (error) {
          console.error(`Error setting localStorage key "${key}":`, error);
          return prevValue;
        }
      });
    },
    [key]
  );

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);

        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        }
      }
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}