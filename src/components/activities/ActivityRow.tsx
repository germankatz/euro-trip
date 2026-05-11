"use client";

import { useState, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleActivityReactionAction } from "@/lib/actions/activities";
import { EMOJI_OPTIONS } from "@/components/activities/EmojiPicker";
import type { VisibleActivity } from "@/lib/trip";
import type { Actor } from "@/lib/permissions";

// ─── helpers ────────────────────────────────────────────────────────────────

type ReactionGroup = { emoji: string; count: number; mine: boolean; title: string };

function groupReactions(reactions: VisibleActivity["reactions"], userId: string): ReactionGroup[] {
  const map = new Map<string, { count: number; mine: boolean; names: string[] }>();
  for (const r of reactions) {
    const g = map.get(r.emoji) ?? { count: 0, mine: false, names: [] };
    g.count++;
    if (r.userId === userId) g.mine = true;
    g.names.push(r.userName);
    map.set(r.emoji, g);
  }
  return Array.from(map.entries()).map(([emoji, g]) => ({
    emoji,
    count: g.count,
    mine: g.mine,
    title: g.names.join(", "),
  }));
}

// ─── emoji strip (portaled al body para escapar el stacking context del sheet) ─

const STRIP_H = 48; // p-1.5 * 2 + h-9 emoji
const STRIP_GAP = 6;

type StripPos = { top: number; left: number; width: number };

function EmojiStrip({
  pos,
  onSelect,
  onClose,
}: {
  pos: StripPos;
  onSelect: (e: string) => void;
  onClose: () => void;
}) {
  return createPortal(
    <>
      <div className="fixed inset-0 z-[45]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 6 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="fixed z-[50] flex overflow-x-auto gap-0.5 rounded-2xl border border-[var(--hairline)] bg-white p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] [&::-webkit-scrollbar]:hidden"
        style={{
          top: pos.top,
          left: pos.left,
          width: pos.width,
          maxHeight: STRIP_H,
          scrollbarWidth: "none",
        }}
      >
        {EMOJI_OPTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onSelect(e)}
            className="flex-none flex h-9 w-9 items-center justify-center rounded-xl text-xl hover:bg-[var(--surface-raised)] transition-colors"
          >
            {e}
          </button>
        ))}
      </motion.div>
    </>,
    document.body,
  );
}

// ─── ActivityRow ─────────────────────────────────────────────────────────────

type Props = {
  activity: VisibleActivity;
  actor: Actor;
  archived?: boolean;
  onClick: () => void;
};

export function ActivityRow({ activity, actor, archived, onClick }: Props) {
  const [stripPos, setStripPos] = useState<StripPos | null>(null);
  const [isPending, startTransition] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressActivated = useRef(false);

  const userId = actor?.userId ?? "";
  const preview = firstLine(activity.notesMd);
  const groups = groupReactions(activity.reactions ?? [], userId);
  const canReact = actor?.isTripMember ?? false;

  function computePos(): StripPos | null {
    if (!cardRef.current) return null;
    const rect = cardRef.current.getBoundingClientRect();
    const top =
      rect.top >= STRIP_H + STRIP_GAP
        ? rect.top - STRIP_H - STRIP_GAP
        : rect.bottom + STRIP_GAP;
    return { top, left: rect.left, width: rect.width };
  }

  function openPicker() {
    if (!canReact) return;
    const pos = computePos();
    if (pos) setStripPos(pos);
  }

  function closePicker() {
    setStripPos(null);
  }

  function startLongPress(e?: React.TouchEvent | React.MouseEvent) {
    if (e && "touches" in e) e.preventDefault();
    if (!canReact) return;
    longPressTimer.current = setTimeout(() => {
      longPressActivated.current = true;
      navigator.vibrate?.(40);
      openPicker();
    }, 500);
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer.current);
  }

  function handleMainClick() {
    if (longPressActivated.current) {
      longPressActivated.current = false;
      return;
    }
    onClick();
  }

  function toggleReaction(emoji: string) {
    startTransition(async () => {
      await toggleActivityReactionAction(activity.id, emoji);
    });
    closePicker();
  }

  const hasReactions = groups.length > 0;

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative rounded-2xl border border-[var(--hairline)] bg-white transition-shadow hover:shadow-[var(--shadow-card)] select-none",
        archived && "opacity-60",
      )}
      style={{ WebkitTouchCallout: "none" } as React.CSSProperties}
    >
      {/* Main click + long-press */}
      <button
        type="button"
        onClick={handleMainClick}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={(e) => startLongPress(e)}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "flex w-full items-center gap-3 px-3.5 text-left",
          hasReactions ? "pt-3 pb-2" : "py-3",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold text-[var(--ink)]">
            {activity.title}
          </div>
          {preview && (
            <div className="truncate text-[13px] text-[var(--muted-foreground)]">
              {preview}
            </div>
          )}
        </div>
        {activity.mapsUrl && (
          <MapPin aria-hidden className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        )}
        {/* spacer invisible para reservar lugar al botón "+" absoluto */}
        {canReact && <span aria-hidden className="w-4 shrink-0" />}
      </button>

      {/* "+" — top-right, pequeño */}
      {canReact && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            stripPos ? closePicker() : openPicker();
          }}
          className={cn(
            "absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full border border-[var(--hairline)] bg-white text-xs leading-none transition-colors",
            stripPos
              ? "bg-[var(--ink)] text-white border-[var(--ink)]"
              : "text-[var(--muted-foreground)] hover:bg-[var(--surface-raised)]",
          )}
          title="Reaccionar"
        >
          +
        </button>
      )}

      {/* Emoji strip portaleada */}
      <AnimatePresence>
        {stripPos && (
          <EmojiStrip pos={stripPos} onSelect={toggleReaction} onClose={closePicker} />
        )}
      </AnimatePresence>

      {/* Chips de reacciones */}
      {hasReactions && (
        <div
          className="flex flex-wrap gap-1 px-3.5 pb-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {groups.map((g) => (
            <button
              key={g.emoji}
              type="button"
              title={g.title}
              disabled={isPending || !canReact}
              onClick={() => toggleReaction(g.emoji)}
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs transition-colors select-none",
                g.mine
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--hairline)] bg-white text-[var(--ink)] hover:bg-[var(--surface-raised)]",
                !canReact && "cursor-default",
              )}
            >
              <span>{g.emoji}</span>
              <span className="font-medium">{g.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function firstLine(md: string): string {
  if (!md) return "";
  const line = md.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  return line.trim();
}
