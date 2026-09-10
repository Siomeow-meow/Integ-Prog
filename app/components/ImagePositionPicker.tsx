"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Modal that lets the user choose exactly which part of an image ends up
 * in a fixed-aspect-ratio frame, instead of always cropping to center.
 * Drag to pan, scroll/pinch or the slider to zoom, then "Use photo" bakes
 * the chosen crop into a new File at `outputWidth`x`outputHeight` so the
 * position sticks no matter where the image is displayed later (this app
 * has no per-image "focal point" field on the backend, so baking the crop
 * client-side is what makes the choice actually persist).
 */
export default function ImagePositionPicker({
  file,
  aspectRatio, // width / height of the frame, e.g. 1 for avatar, 3 for a banner
  shape = "rect", // "rect" | "circle" — circle just changes the visual mask
  outputWidth,
  outputHeight,
  title = "Reposition photo",
  onCancel,
  onConfirm,
}: {
  file: File;
  aspectRatio: number;
  shape?: "rect" | "circle";
  outputWidth: number;
  outputHeight: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1); // multiplier on top of the cover-fit scale
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // px, top-left of image within frame
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offX: 0, offY: 0 });
  const [saving, setSaving] = useState(false);

  // Load the file into an object URL once.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Measure the frame (it's sized by CSS aspect-ratio + a max width).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setFrame({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setFrame({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const coverScale =
    natural.w > 0 && frame.w > 0
      ? Math.max(frame.w / natural.w, frame.h / natural.h)
      : 0;
  const dispW = natural.w * coverScale * zoom;
  const dispH = natural.h * coverScale * zoom;

  function clampOffset(x: number, y: number, w = dispW, h = dispH) {
    const minX = Math.min(0, frame.w - w);
    const minY = Math.min(0, frame.h - h);
    return {
      x: Math.max(minX, Math.min(0, x)),
      y: Math.max(minY, Math.min(0, y)),
    };
  }

  // Re-center whenever the image or frame first becomes measurable.
  useEffect(() => {
    if (!coverScale) return;
    setOffset(clampOffset((frame.w - dispW) / 2, (frame.h - dispH) / 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverScale, frame.w, frame.h]);

  // Keep the image covering the frame whenever zoom changes.
  useEffect(() => {
    setOffset((o) => clampOffset(o.x, o.y));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function onPointerDown(e: React.PointerEvent) {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, offX: offset.x, offY: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clampOffset(dragStart.current.offX + dx, dragStart.current.offY + dy));
  }
  function onPointerUp() {
    setDragging(false);
  }
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    setZoom((z) => Math.min(4, Math.max(1, z + delta)));
  }

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img || !coverScale) return;
    setSaving(true);
    try {
      const pxPerNatural = coverScale * zoom;
      const sx = -offset.x / pxPerNatural;
      const sy = -offset.y / pxPerNatural;
      const sw = frame.w / pxPerNatural;
      const sh = frame.h / pxPerNatural;

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);

      const blob: Blob | null = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("Failed to export image");
      const cropped = new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
        type: "image/jpeg",
      });
      onConfirm(cropped);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 flex flex-col gap-4"
        style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
            {title}
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
            Drag to move, scroll or use the slider to zoom.
          </p>
        </div>

        <div
          ref={frameRef}
          className="relative w-full overflow-hidden select-none touch-none"
          style={{
            aspectRatio: String(aspectRatio),
            background: "var(--bg-subtle)",
            borderRadius: shape === "circle" ? 9999 : 12,
            cursor: dragging ? "grabbing" : "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onWheel={onWheel}
        >
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              alt=""
              draggable={false}
              onLoad={(e) =>
                setNatural({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              className="absolute top-0 left-0 max-w-none"
              style={{
                width: dispW || undefined,
                height: dispH || undefined,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
          {/* Guide overlay — doesn't affect the exported crop */}
          {shape === "circle" && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{ boxShadow: "inset 0 0 0 2000px rgba(0,0,0,0.15)", borderRadius: 9999 }}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--fg-muted)" }}>
            Zoom
          </span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium"
            style={{ color: "var(--fg-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !coverScale}
            className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ background: "var(--primary)", color: "var(--primary-fg)" }}
          >
            {saving ? "Saving..." : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
