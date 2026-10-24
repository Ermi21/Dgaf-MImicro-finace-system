import { useEffect, useRef, useState } from "react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title: string;
  onFallbackToFile: () => void;
}

export function CameraModal({
  isOpen,
  onClose,
  onCapture,
  title,
  onFallbackToFile,
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  function stopTracks() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
  }

  useEffect(() => {
    if (!isOpen) {
      stopTracks();
      return;
    }

    let isCancelled = false;
    setStarting(true);
    setCameraError(null);

    async function initCamera() {
      stopTracks();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!isCancelled) {
          setCameraError("Camera access is not supported by your browser or environment.");
          setStarting(false);
        }
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (isCancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true"); // Critical for iOS Safari / Telegram
          await videoRef.current.play();
        }
        if (!isCancelled) {
          setStarting(false);
        }
      } catch (err: any) {
        console.warn("Direct camera constraint failed, trying basic video:", err);
        try {
          // Fallback with basic video constraint
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (isCancelled) {
            fallbackStream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = fallbackStream;
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.setAttribute("playsinline", "true");
            await videoRef.current.play();
          }
          if (!isCancelled) {
            setStarting(false);
          }
        } catch (fallbackErr: any) {
          if (!isCancelled) {
            setCameraError(
              fallbackErr?.name === "NotAllowedError" || fallbackErr?.name === "PermissionDeniedError"
                ? "Camera permission was denied. Please allow camera access in your device settings."
                : "Unable to access camera on this device."
            );
            setStarting(false);
          }
        }
      }
    }

    initCamera();

    return () => {
      isCancelled = true;
      stopTracks();
    };
  }, [isOpen, facingMode]);

  function handleCapture() {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `camera_photo_${Date.now()}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          stopTracks();
          onCapture(file);
          onClose();
        }
      },
      "image/jpeg",
      0.92
    );
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)",
          zIndex: 10,
        }}
      >
        <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 16 }}>
          📷 {title}
        </span>
        <button
          type="button"
          onClick={() => {
            stopTracks();
            onClose();
          }}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {/* Main Viewfinder Area */}
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "#090d16",
        }}
      >
        {cameraError ? (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              maxWidth: 320,
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 14,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>📷⚠️</div>
            <div style={{ color: "#f87171", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              {cameraError}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                stopTracks();
                onClose();
                onFallbackToFile();
              }}
              style={{ width: "100%", padding: "10px 14px", fontSize: 13 }}
            >
              📁 Choose Photo from Files
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Document alignment overlay frame */}
            <div
              style={{
                position: "absolute",
                inset: "15% 8%",
                border: "2px dashed rgba(52, 211, 153, 0.8)",
                borderRadius: 12,
                pointerEvents: "none",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: 12,
              }}
            >
              <span
                style={{
                  background: "rgba(0, 0, 0, 0.65)",
                  color: "#ffffff",
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Fit document inside frame
              </span>
            </div>

            {starting && (
              <div
                style={{
                  position: "absolute",
                  color: "#34d399",
                  fontSize: 14,
                  fontWeight: 600,
                  background: "rgba(0,0,0,0.7)",
                  padding: "8px 16px",
                  borderRadius: 8,
                }}
              >
                Starting camera…
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "24px 20px 32px",
          background: "linear-gradient(to top, rgba(0,0,0,0.95), transparent)",
          zIndex: 10,
        }}
      >
        {/* Toggle front/back camera */}
        <button
          type="button"
          onClick={toggleCamera}
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            border: "none",
            borderRadius: "50%",
            width: 48,
            height: 48,
            color: "#ffffff",
            fontSize: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Switch Camera"
        >
          🔄
        </button>

        {/* Shutter Button */}
        <button
          type="button"
          disabled={Boolean(cameraError) || starting}
          onClick={handleCapture}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#ffffff",
            border: "4px solid #10b981",
            cursor: cameraError || starting ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
            opacity: cameraError || starting ? 0.4 : 1,
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.92)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "#10b981",
            }}
          />
        </button>

        {/* Fallback to File picker if needed */}
        <button
          type="button"
          onClick={() => {
            stopTracks();
            onClose();
            onFallbackToFile();
          }}
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            border: "none",
            borderRadius: "50%",
            width: 48,
            height: 48,
            color: "#ffffff",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          title="Choose File Instead"
        >
          📁
        </button>
      </div>
    </div>
  );
}
