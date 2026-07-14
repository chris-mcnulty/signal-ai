import { useState, useEffect } from "react";
import type { LibraryImage } from "./types";

interface ImagePickerProps {
  value: string | null;
  onChange: (path: string) => void;
  apiBase: string;
  refreshKey?: number;
}

export function ImagePicker({ value, onChange, apiBase, refreshKey = 0 }: ImagePickerProps) {
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${apiBase}/library/images`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<LibraryImage[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setImages(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center border border-border rounded-xl bg-muted/20">
        <span className="animate-pulse">Loading image library…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive py-4 border border-destructive/30 rounded-xl px-4">
        Failed to load image library: {error}
      </div>
    );
  }

  const selectedNotInLibrary = value && !images.some((img) => img.path === value);

  return (
    <div className="space-y-2">
      {/* Preview of currently selected image (shown when not in the grid, e.g. just-generated) */}
      {selectedNotInLibrary && (
        <div className="space-y-1.5">
          <div className="rounded-lg overflow-hidden border border-border aspect-video bg-muted">
            <img
              src={value}
              alt="Selected cover image"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-medium text-foreground">Current cover image</span>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-destructive hover:text-destructive/80 ml-2 shrink-0"
            >
              Clear
            </button>
          </div>
          {images.length > 0 && (
            <p className="text-xs text-muted-foreground px-1">Or pick a different image from the library:</p>
          )}
        </div>
      )}

      {/* Library grid */}
      {images.length === 0 && !selectedNotInLibrary ? (
        <div className="text-sm text-muted-foreground py-6 border border-border rounded-xl text-center">
          No images in the library yet. An admin can upload images via the Image Library page.
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto p-1">
          {(images as LibraryImage[]).map((img) => {
            const isSelected = value === img.path;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => onChange(img.path)}
                className={[
                  "relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 bg-muted text-left",
                  isSelected
                    ? "border-primary ring-2 ring-primary ring-offset-1"
                    : "border-transparent hover:border-border",
                ].join(" ")}
              >
                <div className="aspect-video w-full overflow-hidden">
                  <img
                    src={img.path}
                    alt={img.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="px-1.5 py-1 bg-background/90 text-[10px] leading-tight text-muted-foreground truncate">
                  {img.label}
                </div>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Path + clear for images that ARE in the library */}
      {value && !selectedNotInLibrary && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="truncate">{value}</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-destructive hover:text-destructive/80 ml-2 shrink-0"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
