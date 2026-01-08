"use client";

import { useState, useCallback, useEffect } from "react";
import {
  loadFaceModels,
  areModelsLoaded,
  detectFaceFromVideo,
  compareFaceDescriptors,
} from "@/lib/face-recognition";
import { FaceDetectionResult, FaceComparisonResult } from "@/types/time-clock";

export interface UseFaceRecognitionReturn {
  modelsLoaded: boolean;
  isLoadingModels: boolean;
  modelError: string | null;
  loadModels: () => Promise<void>;
  detectFace: (video: HTMLVideoElement) => Promise<FaceDetectionResult>;
  compareFaces: (descriptor1: number[], descriptor2: number[]) => FaceComparisonResult;
}

export function useFaceRecognition(): UseFaceRecognitionReturn {
  const [modelsLoaded, setModelsLoaded] = useState(areModelsLoaded());
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;

    setIsLoadingModels(true);
    setModelError(null);

    try {
      await loadFaceModels();
      setModelsLoaded(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load face recognition models";
      setModelError(message);
      console.error("Model loading error:", error);
    } finally {
      setIsLoadingModels(false);
    }
  }, [modelsLoaded]);

  const detectFace = useCallback(async (video: HTMLVideoElement): Promise<FaceDetectionResult> => {
    if (!modelsLoaded) {
      await loadModels();
    }
    return detectFaceFromVideo(video);
  }, [modelsLoaded, loadModels]);

  const compareFaces = useCallback((descriptor1: number[], descriptor2: number[]): FaceComparisonResult => {
    return compareFaceDescriptors(descriptor1, descriptor2);
  }, []);

  // Auto-load models on mount
  useEffect(() => {
    if (!modelsLoaded && !isLoadingModels) {
      loadModels();
    }
  }, [modelsLoaded, isLoadingModels, loadModels]);

  return {
    modelsLoaded,
    isLoadingModels,
    modelError,
    loadModels,
    detectFace,
    compareFaces,
  };
}
