"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useDragControls,
  type PanInfo,
} from "framer-motion";

export type SheetState = "peek" | "half" | "full";

type Props = {
  state: SheetState;
  onStateChange: (s: SheetState) => void;
  children: React.ReactNode;
};

// peek = px fijos, half/full = fracción del viewport (svh-equivalent)
const PEEK_PX = 130;
const HALF_FRAC = 0.5;
const FULL_FRAC = 0.9;

// Altura del drag handle (pt-3 + h-1 + pb-2 + border-t).
const HANDLE_HEIGHT = 28;

export function BottomSheet({ state, onStateChange, children }: Props) {
  const y = useMotionValue(0);
  const [vh, setVh] = useState(0);
  const dragControls = useDragControls();

  // Mantener la altura del viewport actualizada (resize, rotación móvil).
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const snaps = computeSnaps(vh);

  // Animar al snap correspondiente cuando cambia el state externo o el vh.
  useEffect(() => {
    if (!vh) return;
    const target = snaps[state];
    const controls = animate(y, target, {
      type: "spring",
      damping: 32,
      stiffness: 320,
      mass: 0.8,
    });
    return () => controls.stop();
  }, [state, vh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Altura del área scrolleable = lo que realmente se ve del sheet.
  // Sin esto, el container interno mide `vh - handle` (todo el sheet,
  // incluso la parte off-screen) y el contenido nunca scrollea aunque
  // la mitad inferior esté fuera de pantalla.
  const scrollHeight = useTransform(y, (yVal) =>
    Math.max(0, vh - yVal - HANDLE_HEIGHT),
  );

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (!vh) return;
    const current = y.get();
    // Proyectar destino en base a la velocidad (gesto con flick).
    const projected = current + info.velocity.y * 0.18;
    const order: SheetState[] = ["full", "half", "peek"];
    let best: SheetState = state;
    let minDist = Infinity;
    for (const s of order) {
      const d = Math.abs(snaps[s] - projected);
      if (d < minDist) {
        minDist = d;
        best = s;
      }
    }
    onStateChange(best);
  }

  if (!vh) return null; // primer render server/cliente: evitar flicker

  return (
    <motion.div
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: snaps.full, bottom: snaps.peek }}
      dragElastic={0.04}
      onDragEnd={handleDragEnd}
      style={{ y, height: vh }}
      className="fixed left-0 right-0 top-0 z-30 flex flex-col bg-white rounded-t-[24px] border-t border-[var(--hairline)] shadow-[var(--shadow-card)] md:left-4 md:right-auto md:w-[420px] md:rounded-2xl md:border"
    >
      <div
        className="flex flex-col items-center gap-1 pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="h-1 w-9 rounded-full bg-[var(--hairline)]" />
      </div>

      <motion.div
        style={{ height: scrollHeight }}
        className="overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)]"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function computeSnaps(vh: number): Record<SheetState, number> {
  return {
    peek: vh - PEEK_PX,
    half: vh * (1 - HALF_FRAC),
    full: vh * (1 - FULL_FRAC),
  };
}
