import { useState, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, ImageIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { LibraryImage } from "@workspace/image-library";

const CATEGORIES = [
  "Technology",
  "Finance",
  "Private Equity",
  "Logistics",
  "Professional Services",
  "Manufacturing",
  "Healthcare",
  "Travel",
  "Education",
  "General",
];

const API_BASE = "/api";

function useLibraryImages() {
  const [images, setImages] = useState<LibraryImage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/library/images`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setImages(await res.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return { images, loading, error, fetchImages };
}

export default function ImageLibrary() {
  const { toast } = useToast();
  const { } = useAuth();
  const sessionKey = sessionStorage.getItem("dashboard_api_key");

  const { images, loading, error, fetchImages } = useLibraryImages();
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Technology");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fetched, setFetched] = useState(false);

  if (!fetched) {
    setFetched(true);
    fetchImages();
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: "Please select a file", variant: "destructive" });
      return;
    }
    if (!sessionKey) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("label", label || file.name);

    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/library/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionKey}` },
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      toast({ title: "Image uploaded successfully" });
      setFile(null);
      setLabel("");
      if (fileRef.current) fileRef.current.value = "";
      await fetchImages();
    } catch (e) {
      toast({ title: `Upload failed: ${String(e)}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Image Library</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the cover image library. Editors pick from these images when editing a draft.
          </p>
        </div>

        {/* Upload form */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-muted/40 border-b border-border">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upload New Image</h2>
          </div>
          <form onSubmit={handleUpload} className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">File <span className="text-muted-foreground font-normal">(SVG or PNG)</span></label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".svg,.png,image/svg+xml,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Label <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input
                  placeholder="e.g. Finance abstact grid"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={uploading || !file} className="gap-2">
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                ) : (
                  <><Upload className="w-4 h-4" /> Upload Image</>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Library grid */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Library</h2>
            {images && <span className="text-xs text-muted-foreground">{images.length} image{images.length !== 1 ? "s" : ""}</span>}
          </div>
          <div className="p-5">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading…
              </div>
            )}
            {error && (
              <div className="text-destructive text-sm py-4">{error}</div>
            )}
            {images && images.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                <ImageIcon className="w-10 h-10 opacity-30" />
                <p className="text-sm">No images yet. Upload the first one above.</p>
              </div>
            )}
            {images && images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="space-y-1.5">
                    <div className="rounded-lg overflow-hidden border border-border bg-muted aspect-video">
                      <img
                        src={img.path}
                        alt={img.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium truncate" title={img.label}>{img.label}</p>
                      <p className="text-xs text-muted-foreground">{img.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
