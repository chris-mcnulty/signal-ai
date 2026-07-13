import { useState, useEffect } from "react";
import type { LibraryImage } from "./types";

interface ImagePickerProps {
  value: string | null;
  onChange: (path: string) => void;
  apiBase: string;
}

export function ImagePicker({ value, onChange, apiBase }: ImagePickerProps) {
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
  }, [apiBase]);

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

  if (!images.length) {
    return (
      <div className="text-sm text-muted-foreground py-6 border border-border rounded-xl text-center">
        No images in the library yet. An admin can upload images via the Image Library page.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
        {images.map((img) => {
          const isSelected = value === img.path;
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => onChange(img.path)}
              title={`${img.label} (${img.category})`}
              className={[
                "relative rounded-lg overflow-hidden border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 aspect-video bg-muted",
                isSelected
                  ? "border-primary ring-2 ring-primary ring-offset-1"
                  : "border-transparent hover:border-border",
              ].join(" ")}
            >
              <img
                src={img.path}
                alt={img.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {isSelected && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {value && (
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
