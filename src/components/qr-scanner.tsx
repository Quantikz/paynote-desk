import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

export function QrScanner({
  onRead,
  paused,
  onReset,
}: {
  onRead: (value: string) => void;
  paused?: boolean;
  onReset?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || paused) return;
    let stream: MediaStream | undefined;
    let stop = false;
    let frame = 0;

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
        const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
        if (!Detector) {
          setError("This browser cannot read a camera code. Type the order number below.");
          return;
        }
        const detector = new Detector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stop || !video) return;
          try {
            if (video.readyState >= 2) {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue;
              if (value) {
                onRead(value);
                return;
              }
            }
          } catch {
            // keep scanning
          }
          frame = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setError("Camera was blocked. Type the order number instead.");
      }
    }

    void start();
    return () => {
      stop = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onRead, paused]);

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-[var(--shadow-border)]">
      <div className="relative aspect-[4/3] bg-black">
        <video
          ref={videoRef}
          className="size-full object-cover"
          playsInline
          muted
        />
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
        <p className="px-4 py-3 text-sm text-muted-foreground">
          Point the camera at the customer’s code.
        </p>
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
