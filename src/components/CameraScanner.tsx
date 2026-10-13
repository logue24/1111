import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, CameraOff, RefreshCw, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { extractCodeFromUrl } from '../utils/transferUtils';
import { Translations } from '../locales/translations';

interface CameraScannerProps {
  t: Translations;
  onCodeScanned: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  t,
  onCodeScanned,
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setIsInitializing(true);
    setErrorMsg(null);
    setScannedCode(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(t.cameraError);
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      // Check if torch/flashlight is supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? (videoTrack.getCapabilities() as any) : {};
        setHasTorch(Boolean(capabilities?.torch));
      }

      setIsInitializing(false);
      requestScanFrame();
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsInitializing(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMsg(t.cameraPermissionNeeded);
      } else {
        setErrorMsg(t.cameraError);
      }
    }
  }, [facingMode, stopCamera, t]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextTorch = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }],
        });
        setTorchOn(nextTorch);
      } catch (e) {
        console.warn('Torch toggle failed', e);
      }
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const requestScanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const parsedCode = extractCodeFromUrl(code.data);
          if (parsedCode) {
            setScannedCode(parsedCode);
            try {
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            } catch (_) {}

            setTimeout(() => {
              stopCamera();
              onCodeScanned(parsedCode);
            }, 600);
            return;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(scan);
    };

    animationFrameRef.current = requestAnimationFrame(scan);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-lg bg-stone-900 border border-red-900/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Top bar inside scanner */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-sm font-semibold tracking-wide text-white uppercase">
              {t.cameraSectionTitle}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                title="Bật/Tắt Đèn Flash"
                className={`p-2 rounded-lg transition-colors ${
                  torchOn ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={switchCamera}
              title={t.btnSwitchCamera}
              className="p-2 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-lg bg-stone-800 text-stone-400 hover:text-white hover:bg-red-950 transition-colors"
            >
              <CameraOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Viewport & Square Viewfinder */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Square Viewfinder Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Dark vignette mask outside the square */}
            <div className="absolute inset-0 bg-black/40" />

            {/* The Target Square Frame */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-red-500/70 rounded-xl bg-transparent z-10 shadow-[0_0_25px_rgba(239,68,68,0.25)] flex items-center justify-center overflow-hidden">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 rounded-tl-sm" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 rounded-tr-sm" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 rounded-bl-sm" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 rounded-br-sm" />

              {/* Scanning Red Laser Line */}
              {!scannedCode && !errorMsg && !isInitializing && (
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-scan-laser" />
              )}

              {/* Scanned Success Confirmation */}
              {scannedCode && (
                <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mb-2" />
                  <p className="text-emerald-300 font-semibold text-sm">
                    {t.cameraSuccessScan}
                  </p>
                  <p className="font-mono text-xl text-white font-bold tracking-widest mt-1 bg-stone-900/90 px-3 py-1 rounded border border-red-500/40">
                    {scannedCode}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Loading or Error States */}
          {isInitializing && (
            <div className="absolute inset-0 z-20 bg-stone-950/90 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-stone-300">{t.cameraRequesting}</p>
            </div>
          )}

          {errorMsg && (
            <div className="absolute inset-0 z-20 bg-stone-950/95 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-stone-200 max-w-xs">{errorMsg}</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                >
                  {t.btnOpenCamera}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors"
                >
                  {t.previewClose}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Helper Guide */}
        <div className="px-5 py-3.5 bg-stone-950/90 border-t border-stone-800 text-center">
          <p className="text-xs text-stone-400">
            {t.cameraGuide}
          </p>
        </div>
      </div>
    </div>
  );
};
