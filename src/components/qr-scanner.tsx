import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

const FORMATS = ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e"] as const;

export function QrScanner({
  onRead,
  paused,
  onReset,
  continuous = false,
  hint = "Point the camera at the code.",
}: {
  onRead: (value: string) => void;
  paused?: boolean;
  onReset?: () => void;
  continuous?: boolean;
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onReadRef = useRef(onRead);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  onReadRef.current = onRead;

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
        const Detector = (
          window as unknown as {
            BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
          }
        ).BarcodeDetector;
        if (!Detector) {
          setError("This browser cannot read a camera code. Type the SKU or ticket below.");
          return;
        }
        let detector: BarcodeDetectorLike;
        try {
          detector = new Detector({ formats: [...FORMATS] });
        } catch {
          detector = new Detector({ formats: ["qr_code"] });
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
        setError("Camera was blocked. Type the SKU or ticket instead.");
      }
    }

    void start();
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [paused, continuous]);

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
      <div className="relative aspect-[4/3] bg-black">
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        <div className="pointer-events-none absolute inset-10 rounded-lg border-2 border-primary/80" />
        {!ready && !error ? (
          <p className="absolute inset-0 grid place-items-center text-sm text-primary-foreground">
            Opening camera…
          </p>
        ) : null}
      </div>
      {error ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">{error}</p>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">{hint}</p>
      )}
      {paused && onReset ? (
        <div className="px-4 pb-4">
          <Button variant="outline" className="w-full" onClick={onReset}>
            Scan another
          </Button>
        </div>
      ) : null}
    </div>
  );
}
