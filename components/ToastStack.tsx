"use client";

import { useCallback, useRef, useState } from "react";

export type ToastTone = "win" | "lose" | "info";
export type ToastItem = { id: number; text: string; tone: ToastTone };

export function useToasts() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const push = useCallback((text: string, tone: ToastTone = "info") => {
    counter.current += 1;
    const id = counter.current;
    setItems((prev) => [...prev.slice(-2), { id, text, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 3400);
  }, []);

  return { items, push };
}

export function ToastStack({ items }: { items: ToastItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast ${item.tone}`}>
          {item.text}
        </div>
      ))}
    </div>
  );
}
