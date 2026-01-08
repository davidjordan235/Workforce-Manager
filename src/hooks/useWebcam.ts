"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseWebcamOptions {
  width?: number;
  height?: number;
  facingMode?: "user" | "environment";
}

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isLoading: boolean;
  error: string | null;
  isActive: boolean;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => HTMLCanvasElement | null;
}

export function useWebcam(options: UseWebcamOptions = {}): UseWebcamReturn {
  const { width = 640, height = 480, facingMode = "user" } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for getUserMedia support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access is not supported in this browser");
      }

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode,
        },
        audio: false,
      });

      setStream(mediaStream);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setIsActive(true);
    } catch (err) {
      let message = "Failed to access camera";

      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          message = "Camera permission denied. Please allow camera access and try again.";
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          message = "No camera found. Please connect a camera and try again.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          message = "Camera is in use by another application.";
        } else {
          message = err.message;
        }
      }

      setError(message);
      console.error("Camera error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [width, height, facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
  }, [stream]);

  const captureFrame = useCallback((): HTMLCanvasElement | null => {
    if (!videoRef.current || !isActive) {
      return null;
    }

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
    }

    return canvas;
  }, [isActive]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    videoRef,
    stream,
    isLoading,
    error,
    isActive,
    startCamera,
    stopCamera,
    captureFrame,
  };
}
