"use client";

import * as faceapi from "face-api.js";
import {
  FaceDetectionResult,
  FaceComparisonResult,
  FACE_MATCH_THRESHOLD,
} from "@/types/time-clock";

// Track if models are loaded
let modelsLoaded = false;
let modelsLoading = false;

/**
 * Load face-api.js models from public/models directory
 * Must be called before any face detection operations
 */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoading) {
    // Wait for models to finish loading
    while (modelsLoading) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return;
  }

  modelsLoading = true;

  try {
    const MODEL_URL = "/models";

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    modelsLoaded = true;
    console.log("Face recognition models loaded successfully (TinyFaceDetector + SSD + Landmarks + Recognition)");
  } catch (error) {
    console.error("Error loading face recognition models:", error);
    throw new Error("Failed to load face recognition models");
  } finally {
    modelsLoading = false;
  }
}

/**
 * Check if models are loaded
 */
export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Detect a face in a video element and extract its descriptor
 */
export async function detectFaceFromVideo(
  video: HTMLVideoElement
): Promise<FaceDetectionResult> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    // Log video info for debugging
    console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight, "readyState:", video.readyState);

    if (video.readyState < 2) {
      return {
        detected: false,
        descriptor: null,
        confidence: 0,
        error: "Video not ready",
      };
    }

    // First, try basic face detection to see if any face is found at all
    const ssdOptions = new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.1, // Very low threshold for testing
    });

    // Just detect face first (no landmarks)
    const basicDetection = await faceapi.detectSingleFace(video, ssdOptions);
    console.log("Basic detection result:", basicDetection ? `Found! Score: ${basicDetection.score}` : "Nothing found");

    // Now try full detection with landmarks and descriptor
    let detection = await faceapi
      .detectSingleFace(video, ssdOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    // If SSD fails, try TinyFaceDetector
    if (!detection) {
      console.log("SSD MobileNet found nothing, trying TinyFaceDetector...");
      const tinyOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.1, // Very low threshold
      });

      detection = await faceapi
        .detectSingleFace(video, tinyOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
    }

    if (!detection) {
      return {
        detected: false,
        descriptor: null,
        confidence: 0,
        error: "No face detected",
      };
    }

    console.log("Face detected! Score:", detection.detection.score);
    return {
      detected: true,
      descriptor: Array.from(detection.descriptor),
      confidence: detection.detection.score,
    };
  } catch (error) {
    console.error("Face detection error:", error);
    return {
      detected: false,
      descriptor: null,
      confidence: 0,
      error: error instanceof Error ? error.message : "Face detection failed",
    };
  }
}

/**
 * Detect a face in a canvas element and extract its descriptor
 */
export async function detectFaceFromCanvas(
  canvas: HTMLCanvasElement
): Promise<FaceDetectionResult> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  try {
    // Log canvas info for debugging
    console.log("Canvas dimensions:", canvas.width, "x", canvas.height);

    // Check if canvas has actual content
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
      const hasContent = imageData.data.some((val, i) => i % 4 !== 3 && val !== 0);
      console.log("Canvas has content:", hasContent);
    }

    // Try TinyFaceDetector first (faster and often more reliable)
    const tinyOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.3, // Lower threshold for better detection
    });

    let detection = await faceapi
      .detectSingleFace(canvas, tinyOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    // If TinyFaceDetector fails, try SSD MobileNet
    if (!detection) {
      console.log("TinyFaceDetector found nothing, trying SSD MobileNet...");
      const ssdOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.3, // Lower threshold
      });

      detection = await faceapi
        .detectSingleFace(canvas, ssdOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
    }

    if (!detection) {
      return {
        detected: false,
        descriptor: null,
        confidence: 0,
        error: "No face detected in image",
      };
    }

    console.log("Face detected! Score:", detection.detection.score);
    return {
      detected: true,
      descriptor: Array.from(detection.descriptor),
      confidence: detection.detection.score,
    };
  } catch (error) {
    console.error("Face detection from canvas error:", error);
    return {
      detected: false,
      descriptor: null,
      confidence: 0,
      error: error instanceof Error ? error.message : "Face detection failed",
    };
  }
}

/**
 * Compare two face descriptors using Euclidean distance
 * Lower distance = better match
 * @param descriptor1 - First face descriptor (128 numbers)
 * @param descriptor2 - Second face descriptor (128 numbers)
 * @returns Comparison result with match status and confidence
 */
export function compareFaceDescriptors(
  descriptor1: number[],
  descriptor2: number[]
): FaceComparisonResult {
  if (descriptor1.length !== 128 || descriptor2.length !== 128) {
    throw new Error("Invalid descriptor length - expected 128 dimensions");
  }

  // Convert to Float32Array for face-api.js
  const d1 = new Float32Array(descriptor1);
  const d2 = new Float32Array(descriptor2);

  // Calculate Euclidean distance
  const distance = faceapi.euclideanDistance(d1, d2);

  // Convert distance to confidence (0-1, higher is better)
  // Distance of 0 = perfect match (confidence 1)
  // Distance of FACE_MATCH_THRESHOLD = threshold (confidence ~0.5)
  const confidence = Math.max(0, 1 - distance / (FACE_MATCH_THRESHOLD * 2));

  return {
    matched: distance < FACE_MATCH_THRESHOLD,
    distance,
    confidence,
  };
}

/**
 * Capture a frame from video as a canvas
 */
export function captureVideoFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(video, 0, 0);
  }

  return canvas;
}

/**
 * Convert canvas to base64 JPEG image
 */
export function canvasToBase64(
  canvas: HTMLCanvasElement,
  quality: number = 0.8
): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Convert canvas to blob for upload
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Draw face detection overlay on canvas
 */
export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  detected: boolean
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Draw face outline indicator
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const ovalWidth = canvas.width * 0.5;
  const ovalHeight = canvas.height * 0.65;

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ovalWidth / 2, ovalHeight / 2, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = detected ? "#22c55e" : "#ef4444"; // green if detected, red if not
  ctx.lineWidth = 3;
  ctx.stroke();

  // Add guide text
  ctx.font = "16px sans-serif";
  ctx.fillStyle = detected ? "#22c55e" : "#ef4444";
  ctx.textAlign = "center";
  ctx.fillText(
    detected ? "Face detected" : "Position your face in the oval",
    centerX,
    canvas.height - 20
  );
}

/**
 * Create a resized canvas for photo storage (640x480 max)
 */
export function resizeCanvas(
  sourceCanvas: HTMLCanvasElement,
  maxWidth: number = 640,
  maxHeight: number = 480
): HTMLCanvasElement {
  let { width, height } = sourceCanvas;

  // Calculate new dimensions maintaining aspect ratio
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }
  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = width;
  resizedCanvas.height = height;

  const ctx = resizedCanvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(sourceCanvas, 0, 0, width, height);
  }

  return resizedCanvas;
}
