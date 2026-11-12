"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, QrCode } from "lucide-react";
import type { Html5QrcodeScanner } from "html5-qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/locale-provider";

export function DoorScannerModal({
  isOpen,
  onClose,
  onScan,
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qrCode: string) => void;
}) {
  const { t } = useI18n();
  const [scannerReady, setScannerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    let scanner: Html5QrcodeScanner | null = null;
    let mounted = true;
    lockedRef.current = false;

    const start = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!mounted) return;

        scanner = new Html5QrcodeScanner(
          "door-qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
            showTorchButtonIfSupported: true,
            videoConstraints: { facingMode: "environment" },
          },
          false
        );

        scanner.render(
          (decodedText) => {
            if (lockedRef.current) return;
            lockedRef.current = true;
            scanner?.clear().catch(() => undefined);
            onScan(decodedText.trim());
          },
          () => undefined
        );

        setScannerReady(true);
        setError(null);
      } catch {
        setError(t("door.cameraError"));
      }
    };

    void start();

    return () => {
      mounted = false;
      scanner?.clear().catch(() => undefined);
      setScannerReady(false);
    };
  }, [isOpen, onScan, t]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5 text-purple-500" />
            {t("door.scan")}
          </DialogTitle>
          <DialogDescription>{t("door.scanHint")}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : (
          <>
            <div id="door-qr-reader" className="w-full" style={{ minHeight: 320 }} />
            {!scannerReady && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="size-5 animate-spin text-purple-500" />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
