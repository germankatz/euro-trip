"use client";

import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export const EMOJI_OPTIONS = [
  "❤️","😍","🤩","😂","😮","😢","😡","👍","👎","🔥","✅","❌","💯","🎉","🙌","💪","🙈","💀","🤔","👀","🍯",
];

const PICKER_W = 180;
const PICKER_H = 152; // 5 cols × 4 rows × h-8 (32px) + gaps + p-1.5*2

type Props = {
  /** Rect del botón que lo abre (para calcular posición). */
  triggerRect: DOMRect;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPicker({ triggerRect, onSelect, onClose }: Props) {
  // Abre hacia arriba si hay espacio, si no hacia abajo.
  const top =
    triggerRect.top >= PICKER_H + 6
      ? triggerRect.top - PICKER_H - 6
      : triggerRect.bottom + 6;

  // Evitar que se salga por la derecha del viewport.
  const left = Math.min(triggerRect.left, window.innerWidth - PICKER_W - 8);

  return createPortal(
    <>
      {/* backdrop z-[45] > BottomSheet z-30, captura clicks afuera */}
      <div className="fixed inset-0 z-[45]" onClick={onClose} />
      {/* picker z-[50] > backdrop */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-[50] grid grid-cols-5 gap-0.5 rounded-xl border border-[var(--hairline)] bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] overflow-y-auto"
        style={{ top, left, width: PICKER_W, maxHeight: PICKER_H }}
      >
        {EMOJI_OPTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSelect(e)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-[var(--surface-raised)] transition-colors"
          >
            {e}
          </button>
        ))}
      </motion.div>
    </>,
    document.body,
  );
}
