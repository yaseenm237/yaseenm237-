import React, { useEffect, useRef, useState } from 'react';

interface RipplePoint {
  id: number;
  x: number;
  y: number;
}

const INTERACTIVE_SELECTOR =
  'button:not(:disabled), label, [role="button"], input[type="range"]:not(:disabled), [data-knob="true"], [data-interactive="true"]';

export const NeonRippleOverlay: React.FC = () => {
  const [ripples, setRipples] = useState<RipplePoint[]>([]);
  const nextIdRef = useRef(1);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!interactive) return;
      if (interactive.getAttribute('aria-disabled') === 'true') return;

      const id = nextIdRef.current++;
      setRipples((prev) => [...prev.slice(-5), { id, x: e.clientX, y: e.clientY }]);
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
  }, []);

  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="neon-ripple-ring"
          style={{ left: r.x, top: r.y }}
          onAnimationEnd={() =>
            setRipples((prev) => prev.filter((item) => item.id !== r.id))
          }
        />
      ))}
    </>
  );
};
