"use client";
import { useRef } from "react";

/**
 * A horizontally-scrolling filmstrip of attached images, used anywhere a
 * post's images are picked/edited. Replaces the old fixed grid-cols-2 /
 * grid-cols-3 layouts, which forced every thumbnail into an identical square
 * and left an awkward empty cell for odd counts. Thumbnails stay a
 * consistent size and just flow — add as many as you like, no dead space.
 */
export default function ImageAttachmentStrip({
  existing = [],
  onRemoveExisting,
  newFiles = [],
  onRemoveNew,
  onAddFiles,
  uploading = false,
}: {
  existing?: string[];
  onRemoveExisting?: (index: number) => void;
  newFiles?: File[];
  onRemoveNew?: (index: number) => void;
  onAddFiles: (files: FileList) => void;
  uploading?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      style={{ scrollbarWidth: "thin" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      {existing.map((url, i) => (
        <div
          key={`e-${i}`}
          className="relative group shrink-0 w-24 h-24 rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <img src={url} alt="" className="w-full h-full object-cover" />
          {onRemoveExisting && (
            <button
              type="button"
              onClick={() => onRemoveExisting(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
              aria-label="Remove image"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {newFiles.map((file, i) => (
        <div
          key={`n-${i}`}
          className="relative group shrink-0 w-24 h-24 rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          <img
            src={URL.createObjectURL(file)}
            alt=""
            className="w-full h-full object-cover"
          />
          {onRemoveNew && (
            <button
              type="button"
              onClick={() => onRemoveNew(i)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "rgba(0,0,0,0.7)", color: "#fff" }}
              aria-label="Remove image"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {uploading && (
        <div
          className="shrink-0 w-24 h-24 rounded-2xl animate-pulse"
          style={{ background: "var(--bg-subtle)" }}
        />
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="shrink-0 w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors"
        style={{
          border: "1.5px dashed var(--border)",
          color: "var(--fg-subtle)",
        }}
        aria-label="Add images"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span className="text-[10px] font-medium">Add</span>
      </button>
    </div>
  );
}
