import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { ImageUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

const FORMATS = ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] as const;

function getDetector(): (new (opts: { formats: string[] }) => BarcodeDetectorLike) | undefined {
  return (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike })
    .BarcodeDetector;
}

function makeDetector() {
  const Detector = getDetector();
  if (!Detector) return null;
  try {
    return new Detector({ formats: [...FORMATS] });
  } catch {
    return new Detector({ formats: ["qr_code"] });
  }
}

function decodeCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const qr = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  return qr?.data?.trim() ?? "";
}

async function readCodeFromBlob(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  try {
    const detector = makeDetector();
    if (detector) {
      const codes = await detector.detect(bitmap);
      const value = codes[0]?.rawValue?.trim();
      if (value) return value;
    }
    const max = 1800;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const first = decodeCanvas(canvas);
    if (first) return first;
    if (scale < 1) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      ctx.drawImage(bitmap, 0, 0);
      return decodeCanvas(canvas);
    }
    return "";
  } finally {
    bitmap.close();
  }
}

export async function readCodeFromFile(file: File): Promise<string> {
  if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
    return readCodeFromBlob(file);
  }
  return (await file.text()).trim();
}

export function QrScanner({
  onRead,
  paused,
  onReset,
  continuous = false,
  hint = "Point the camera at the code, or upload a photo of it.",
  allowUpload = true,
}: {
  onRead: (value: string) => void;
  paused?: boolean;
  onReset?: () => void;
  continuous?: boolean;
  hint?: string;
  allowUpload?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const onReadRef = useRef(onRead);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [reading, setReading] = useState(false);
  const [preview, setPreview] = useState("");
  onReadRef.current = onRead;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || paused) return;
    let stream: MediaStream | undefined;
    let stop = false;
    let frame = 0;
    let last = "";
    let lastAt = 0;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!video || stop) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.srcObject = stream;
        await video.play();
        setReady(true);
        const detector = makeDetector();
        if (!detector) {
          setError("Camera cannot read codes here. Upload a photo of the QR instead.");
          return;
        }
        const tick = async () => {
          if (stop || !video) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue?.trim();
              const now = Date.now();
              if (value && (value !== last || now - lastAt > 1400)) {
                last = value;
                lastAt = now;
                onReadRef.current(value);
                if (!continuous) return;
              }
            }
          } catch {
            // keep scanning
          }
          frame = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setError("Camera was blocked. Upload a photo of the QR, or type the SKU.");
      }
    }

    void start();
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [paused, continuous]);

  async function onPhoto(file?: File | null) {
    if (!file) return;
    setReading(true);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    const url = URL.createObjectURL(file);
    setPreview(url);
    try {
      const value = await readCodeFromFile(file);
      if (!value) {
        setError("No QR or barcode in that photo. Try a closer, sharper picture.");
        return;
      }
      onReadRef.current(value);
    } catch {
      setError("Could not read that photo. Try another picture of the code.");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
      <div className="relative aspect-[4/3] bg-black">
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        {preview ? (
          <img src={preview} alt="Uploaded code" className="absolute inset-0 size-full object-contain bg-black/80" />
        ) : null}
        <div className="pointer-events-none absolute inset-10 rounded-lg border-2 border-primary/80" />
        {!ready && !error && !preview ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-primary-foreground">
            Opening camera…
          </p>
        ) : null}
        {reading ? (
          <p className="absolute inset-0 grid place-items-center bg-black/50 text-sm text-primary-foreground">
            Reading photo…
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">{error}</p>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">{hint}</p>
      )}
      <div className="flex flex-col gap-2 px-4 pb-4 sm:flex-row">
        {allowUpload ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.png,.jpg,.jpeg,.webp,.gif"
              className="hidden"
              onChange={(event) => {
                void onPhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={reading}
            >
              <ImageUp className="size-4" />
              Upload QR photo
            </Button>
          </>
        ) : null}
        {(paused || preview) && onReset ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (preview) URL.revokeObjectURL(preview);
              setPreview("");
              setError("");
              onReset();
            }}
          >
            Scan another
          </Button>
        ) : null}
      </div>
    </div>
  );
}
