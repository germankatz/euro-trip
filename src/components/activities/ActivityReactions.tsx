"use client";

import { useState, useRef, useTransition } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { toggleActivityReactionAction } from "@/lib/actions/activities";
import { EmojiPicker } from "@/components/activities/EmojiPicker";
import type { ActivityReactionLite } from "@/lib/trip";

const LONG_PRESS_MS = 450;
const TOOLTIP_W = 180;

type ReactionGroup = {
  emoji: string;
  reactions: ActivityReactionLite[];
};

export function groupReactions(reactions: ActivityReactionLite[]): ReactionGroup[] {
  const map = new Map<string, ActivityReactionLite[]>();
  for (const r of reactions) {
    const group = map.get(r.emoji) ?? [];
    group.push(r);
    map.set(r.emoji, group);
  }
  return Array.from(map.entries()).map(([emoji, rs]) => ({ emoji, reactions: rs }));
}

type TooltipState = { left: number; top: number; arrowLeft: number; names: string[] };

type Props = {
  activityId: string;
  reactions: ActivityReactionLite[];
  currentUserId: string;
  isMember: boolean;
};

export function ActivityReactions({ activityId, reactions, currentUserId, isMember }: Props) {
  const [pickerRect, setPickerRect] = useState<DOMRect | null>(null);
  const [isPending, startTransition] = useTransition();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const pressRect = useRef<DOMRect | null>(null);

  const groups = groupReactions(reactions);

  function toggle(emoji: string) {
    if (!isMember) return;
    startTransition(async () => {
      await toggleActivityReactionAction(activityId, emoji);
    });
    setPickerRect(null);
  }

  function buildTooltip(rect: DOMRect, names: string[]): TooltipState {
    const btnCenterX = rect.left + rect.width / 2;
    const left = Math.min(Math.max(btnCenterX - TOOLTIP_W / 2, 8), window.innerWidth - TOOLTIP_W - 8);
    const arrowLeft = Math.min(Math.max(btnCenterX - left - 4, 8), TOOLTIP_W - 16);
    return { left, top: rect.top, arrowLeft, names };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLButtonElement>, names: string[]) {
    if (e.pointerType !== "touch") return;
    isLongPress.current = false;
    startPos.current = { x: e.clientX, y: e.clientY };
    pressRect.current = e.currentTarget.getBoundingClientRect();
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setTooltip(buildTooltip(pressRect.current!, names));
      setTimeout(() => setTooltip(null), 2500);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== "touch" || !longPressTimer.current || !startPos.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (dx * dx + dy * dy > 64) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLButtonElement>, emoji: string) {
    if (e.pointerType !== "touch") return;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPress.current) toggle(emoji);
    isLongPress.current = false;
  }

  function handlePointerCancel() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    isLongPress.current = false;
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>, names: string[]) {
    const rect = e.currentTarget.getBoundingClientRect();
    hoverTimer.current = setTimeout(() => setTooltip(buildTooltip(rect, names)), 200);
  }

  function handleMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setTooltip(null);
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {groups.map((g) => {
        const mine = g.reactions.some((r) => r.userId === currentUserId);
        const names = g.reactions.map((r) => r.userName);
        return (
          <button
            key={g.emoji}
            type="button"
            disabled={isPending || !isMember}
            onClick={(e) => { if ((e.nativeEvent as PointerEvent).pointerType !== "touch") toggle(g.emoji); }}
            onPointerDown={(e) => handlePointerDown(e, names)}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => handlePointerUp(e, g.emoji)}
            onPointerCancel={handlePointerCancel}
            onMouseEnter={(e) => handleMouseEnter(e, names)}
            onMouseLeave={handleMouseLeave}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm transition-colors select-none",
              mine
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--hairline)] bg-white text-[var(--ink)] hover:bg-[var(--surface-raised)]",
              !isMember && "cursor-default",
            )}
          >
            <span>{g.emoji}</span>
            <span className="text-xs font-medium">{g.reactions.length}</span>
          </button>
        );
      })}

      {isMember && (
        <>
          <button
            ref={plusRef}
            type="button"
            onClick={() => pickerRect ? setPickerRect(null) : (plusRef.current && setPickerRect(plusRef.current.getBoundingClientRect()))}
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-full border text-sm leading-none transition-colors",
              pickerRect
                ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                : "border-[var(--hairline)] bg-white text-[var(--muted-foreground)] hover:bg-[var(--surface-raised)]",
            )}
            title="Agregar reacción"
          >
            +
          </button>
          {pickerRect && (
            <EmojiPicker
              triggerRect={pickerRect}
              onSelect={toggle}
              onClose={() => setPickerRect(null)}
            />
          )}
        </>
      )}

      {tooltip && createPortal(
        <div
          className="pointer-events-none fixed z-[9999] rounded-md bg-[var(--ink)] px-2.5 py-1.5 text-xs text-white shadow-sm"
          style={{ left: tooltip.left, top: tooltip.top - 6, width: TOOLTIP_W, transform: "translateY(-100%)" }}
        >
          <div className="flex flex-col gap-0.5 text-center">
            {tooltip.names.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          <span
            className="absolute top-full border-4 border-transparent border-t-[var(--ink)]"
            style={{ left: tooltip.arrowLeft }}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
