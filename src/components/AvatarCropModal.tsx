import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { X, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

interface AvatarCropModalProps {
  isOpen: boolean;
  file: File | null;
  onClose: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
}

const OUTPUT_SIZE = 512; // exported avatar resolution (px)
const FRAME_SIZE = 280; // visible crop frame (px)

export const AvatarCropModal = ({ isOpen, file, onClose, onConfirm }: AvatarCropModalProps) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Load file into image
  useEffect(() => {
    if (!isOpen || !file) {
      setImageSrc(null);
      setImgEl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    const img = new Image();
    img.onload = () => {
      const base = FRAME_SIZE / Math.min(img.width, img.height);
      setImgEl(img);
      setMinZoom(base);
      setZoom(base);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [isOpen, file]);

  const clampOffset = useCallback(
    (next: { x: number; y: number }, z: number) => {
      if (!imgEl) return next;
      const w = imgEl.width * z;
      const h = imgEl.height * z;
      const maxX = Math.max(0, (w - FRAME_SIZE) / 2);
      const maxY = Math.max(0, (h - FRAME_SIZE) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [imgEl]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset({ x: dragRef.current.ox + dx, y: dragRef.current.oy + dy }, zoom));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = Math.min(minZoom * 4, Math.max(minZoom, zoom + (e.deltaY < 0 ? 0.05 : -0.05)));
    setZoom(next);
    setOffset((o) => clampOffset(o, next));
  };

  const handleZoomChange = (v: number[]) => {
    const next = v[0];
    setZoom(next);
    setOffset((o) => clampOffset(o, next));
  };

  const renderCrop = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!imgEl) return reject(new Error("No image"));
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No canvas context"));

      // The frame shows pixels of the source image at scale `zoom`.
      // Source rect width/height in image-space = FRAME_SIZE / zoom.
      const srcSize = FRAME_SIZE / zoom;
      const cx = imgEl.width / 2 - offset.x / zoom;
      const cy = imgEl.height / 2 - offset.y / zoom;
      const sx = cx - srcSize / 2;
      const sy = cy - srcSize / 2;

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      ctx.drawImage(imgEl, sx, sy, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
        "image/jpeg",
        0.92
      );
    });
  };

  const handleApply = async () => {
    setSaving(true);
    try {
      const blob = await renderCrop();
      await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Adjust your avatar</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition · scroll or use the slider to zoom
          </p>

          <div className="flex justify-center">
            <div
              className="relative bg-muted overflow-hidden touch-none select-none"
              style={{ width: FRAME_SIZE, height: FRAME_SIZE }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            >
              {imageSrc && imgEl && (
                <img
                  src={imageSrc}
                  alt="Crop source"
                  draggable={false}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    width: imgEl.width * zoom,
                    height: imgEl.height * zoom,
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                    pointerEvents: "none",
                    maxWidth: "none",
                  }}
                />
              )}
              {/* Circular mask overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: `0 0 0 9999px hsl(var(--background) / 0.85)`,
                  borderRadius: "50%",
                }}
              />
              <div className="absolute inset-0 rounded-full border-2 border-primary/70 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={minZoom}
              max={minZoom * 4}
              step={0.01}
              onValueChange={handleZoomChange}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="flex-1" disabled={saving || !imgEl}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};