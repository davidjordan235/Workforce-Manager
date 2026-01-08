"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LogIn,
  LogOut,
  User,
  MapPin,
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { useIdentifyTech, useVerifyPin, useRecordPunch, IdentifyResponse } from "@/hooks/useTimePunch";
import { useWebcam } from "@/hooks/useWebcam";
import { useGeolocation } from "@/hooks/useGeolocation";
import { PunchType, VerificationMethod } from "@/types/time-clock";
import { formatCoordinates } from "@/lib/geolocation";
import {
  loadFaceModels,
  detectFaceFromVideo,
  compareFaceDescriptors,
  areModelsLoaded,
} from "@/lib/face-recognition";

type Step = "identify" | "status" | "verify" | "pin" | "success";

export default function TechPortalPage() {
  const [step, setStep] = useState<Step>("identify");
  const [employeeId, setEmployeeId] = useState("");
  const [techData, setTechData] = useState<IdentifyResponse | null>(null);
  const [pin, setPin] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceMatched, setFaceMatched] = useState<boolean | null>(null);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedPunchType, setSelectedPunchType] = useState<PunchType | null>(null);
  const [lastPunchResult, setLastPunchResult] = useState<{
    type: PunchType;
    time: string;
    verified: boolean;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectionActiveRef = useRef(false);
  const referenceDescriptorRef = useRef<number[] | null>(null);
  const cameraReadySetRef = useRef(false);

  const identifyMutation = useIdentifyTech();
  const verifyPinMutation = useVerifyPin();
  const recordPunchMutation = useRecordPunch();

  const webcam = useWebcam({ width: 640, height: 480 });
  const geolocation = useGeolocation();

  // Load face models on mount
  useEffect(() => {
    const initModels = async () => {
      if (areModelsLoaded()) {
        setModelsLoaded(true);
        return;
      }
      setModelsLoading(true);
      try {
        await loadFaceModels();
        setModelsLoaded(true);
      } catch (error) {
        console.error("Failed to load face models:", error);
        toast.error("Failed to load face recognition. PIN mode only.");
      } finally {
        setModelsLoading(false);
      }
    };
    initModels();
  }, []);

  // Create detection canvas once
  useEffect(() => {
    if (!detectionCanvasRef.current) {
      detectionCanvasRef.current = document.createElement("canvas");
    }
  }, []);

  // Continuous video draw and face detection loop
  useEffect(() => {
    if (step !== "verify" || !webcam.isActive) return;

    detectionActiveRef.current = true;
    let animationFrameId: number;
    let lastDetectionTime = 0;
    let startTime = 0;

    const drawAndDetect = async (timestamp: number) => {
      if (!detectionActiveRef.current) return;

      // Track start time
      if (startTime === 0) startTime = timestamp;

      if (webcam.videoRef.current && canvasRef.current && detectionCanvasRef.current) {
        const video = webcam.videoRef.current;
        const displayCanvas = canvasRef.current;
        const detectionCanvas = detectionCanvasRef.current;

        // Draw video frame to canvas continuously
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          // Set canvas dimensions
          displayCanvas.width = video.videoWidth;
          displayCanvas.height = video.videoHeight;
          detectionCanvas.width = video.videoWidth;
          detectionCanvas.height = video.videoHeight;

          // Draw raw video to detection canvas (no overlay)
          const detectionCtx = detectionCanvas.getContext("2d");
          if (detectionCtx) {
            detectionCtx.drawImage(video, 0, 0);
          }

          // Draw video + overlay to display canvas
          const displayCtx = displayCanvas.getContext("2d");
          if (displayCtx) {
            displayCtx.drawImage(video, 0, 0);

            const centerX = displayCanvas.width / 2;
            const centerY = displayCanvas.height / 2;
            const ovalWidth = displayCanvas.width * 0.45;
            const ovalHeight = displayCanvas.height * 0.6;

            // Draw the oval guide
            displayCtx.beginPath();
            displayCtx.ellipse(centerX, centerY, ovalWidth / 2, ovalHeight / 2, 0, 0, 2 * Math.PI);
            displayCtx.strokeStyle = faceDetected ? "#22c55e" : "#ef4444";
            displayCtx.lineWidth = 3;
            displayCtx.stroke();
          }

          // Wait 1 second for camera to stabilize, then run detection every 500ms
          const timeSinceStart = timestamp - startTime;

          // Mark camera as ready after warmup (only once)
          if (timeSinceStart > 1000 && !cameraReadySetRef.current) {
            cameraReadySetRef.current = true;
            setCameraReady(true);
          }

          if (modelsLoaded && timeSinceStart > 1000 && timestamp - lastDetectionTime > 500) {
            lastDetectionTime = timestamp;

            try {
              // Detect directly from video element
              const detection = await detectFaceFromVideo(video);

              console.log("Face detection result:", detection);
              setFaceDetected(detection.detected);

              if (detection.detected && detection.descriptor && referenceDescriptorRef.current) {
                const comparison = compareFaceDescriptors(
                  detection.descriptor,
                  referenceDescriptorRef.current
                );

                console.log("Face comparison:", comparison);

                if (comparison.matched) {
                  setFaceMatched(true);
                  detectionActiveRef.current = false;

                  // Success! Record the punch
                  setTimeout(() => {
                    webcam.stopCamera();
                    handlePunch(VerificationMethod.FACE_VERIFIED, comparison.confidence);
                  }, 500);
                  return;
                } else {
                  setVerificationAttempts((prev) => {
                    const newCount = prev + 1;
                    if (newCount >= 5) {
                      setFaceMatched(false);
                    }
                    return newCount;
                  });
                }
              }
            } catch (error) {
              console.error("Detection error:", error);
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(drawAndDetect);
    };

    animationFrameId = requestAnimationFrame(drawAndDetect);

    return () => {
      detectionActiveRef.current = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [step, webcam.isActive, modelsLoaded, faceDetected]);

  // Handle employee ID submission
  const handleIdentify = async () => {
    if (!employeeId.trim()) {
      toast.error("Please enter your Employee ID");
      return;
    }

    try {
      const result = await identifyMutation.mutateAsync({ employeeId: employeeId.trim() });
      setTechData(result);

      // Store face descriptor if available
      if (result.enrollment.hasFaceDescriptor && result.enrollment.faceDescriptor) {
        referenceDescriptorRef.current = result.enrollment.faceDescriptor;
      }

      // Start getting location in background
      geolocation.getLocation();

      // Go to status screen to choose clock in or out
      setStep("status");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Employee not found");
    }
  };

  // Handle clock in/out button press - starts verification
  const handlePunchAction = async (punchType: PunchType) => {
    setSelectedPunchType(punchType);
    setVerificationAttempts(0);
    setFaceMatched(null);
    setFaceDetected(false);
    setCameraReady(false);
    cameraReadySetRef.current = false;

    // If face is enrolled and models loaded, do face verification
    if (techData?.enrollment.hasFaceDescriptor && modelsLoaded) {
      setStep("verify");
      await webcam.startCamera();
    } else {
      // Otherwise go to PIN
      setStep("pin");
    }
  };

  // Handle PIN fallback
  const handlePinFallback = () => {
    detectionActiveRef.current = false;
    webcam.stopCamera();
    setStep("pin");
  };

  // Handle PIN verification
  const handlePinVerify = async () => {
    if (!pin || pin.length < 4) {
      toast.error("Please enter your PIN (4-6 digits)");
      return;
    }

    if (!techData) return;

    try {
      await verifyPinMutation.mutateAsync({
        enrollmentId: techData.enrollment.id,
        pin,
      });

      // PIN verified, record the punch
      handlePunch(VerificationMethod.PIN_FALLBACK, null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid PIN");
      setPin("");
    }
  };

  // Handle punch recording
  const handlePunch = async (
    verificationMethod: VerificationMethod,
    confidence: number | null
  ) => {
    if (!techData || !selectedPunchType) return;

    try {
      const result = await recordPunchMutation.mutateAsync({
        enrollmentId: techData.enrollment.id,
        punchType: selectedPunchType,
        verificationMethod,
        faceConfidence: confidence ?? undefined,
        latitude: geolocation.location?.latitude,
        longitude: geolocation.location?.longitude,
        accuracy: geolocation.location?.accuracy,
      });

      setLastPunchResult({
        type: selectedPunchType,
        time: new Date(result.punchTime).toLocaleTimeString(),
        verified: verificationMethod === VerificationMethod.FACE_VERIFIED,
      });

      setStep("success");

      // Reset after 5 seconds
      setTimeout(() => {
        resetFlow();
      }, 5000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record punch");
    }
  };

  // Reset to start
  const resetFlow = () => {
    setStep("identify");
    setEmployeeId("");
    setTechData(null);
    setPin("");
    setFaceDetected(false);
    setFaceMatched(null);
    setVerificationAttempts(0);
    setSelectedPunchType(null);
    setLastPunchResult(null);
    setCameraReady(false);
    cameraReadySetRef.current = false;
    referenceDescriptorRef.current = null;
    detectionActiveRef.current = false;
    webcam.stopCamera();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-140px)]">
      <Card className="w-full max-w-md shadow-lg">
        {/* Step 1: Identify */}
        {step === "identify" && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <User className="h-6 w-6" />
                Employee Login
              </CardTitle>
              <CardDescription>
                Enter your Employee ID to clock in or out
              </CardDescription>
              {modelsLoading && (
                <p className="text-xs text-muted-foreground mt-2">
                  Loading face recognition...
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleIdentify()}
                  placeholder="Enter your ID"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleIdentify}
                disabled={identifyMutation.isPending || !employeeId.trim()}
                className="w-full"
              >
                {identifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 2: Status - Choose Clock In or Clock Out */}
        {step === "status" && techData && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                Welcome, {techData.enrollment.agent.firstName}!
              </CardTitle>
              <CardDescription>
                Choose an action below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current status display */}
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                <p className={`text-lg font-semibold ${
                  techData.currentStatus === "clocked_in" ? "text-green-600" : "text-gray-600"
                }`}>
                  {techData.currentStatus === "clocked_in" ? "Clocked In" : "Clocked Out"}
                </p>
                {techData.lastPunch && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last punch: {new Date(techData.lastPunch.punchTime).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Show only the relevant button */}
              {techData.currentStatus === "clocked_out" ? (
                <Button
                  onClick={() => handlePunchAction(PunchType.CLOCK_IN)}
                  className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Clock In
                </Button>
              ) : (
                <Button
                  onClick={() => handlePunchAction(PunchType.CLOCK_OUT)}
                  className="w-full h-16 text-lg bg-red-600 hover:bg-red-700"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Clock Out
                </Button>
              )}

              {geolocation.location && (
                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location: {formatCoordinates(geolocation.location.latitude, geolocation.location.longitude)}
                </p>
              )}

              <Button
                onClick={resetFlow}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 3: Face Verification */}
        {step === "verify" && techData && selectedPunchType && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                Verify Your Identity
              </CardTitle>
              <CardDescription>
                Position your face in the oval to {selectedPunchType === PunchType.CLOCK_IN ? "clock in" : "clock out"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Camera view */}
              <div className="relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={webcam.videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ position: 'absolute', zIndex: 1 }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ position: 'absolute', zIndex: 2 }}
                />

                {webcam.isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80" style={{ zIndex: 5 }}>
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  </div>
                )}

                {webcam.error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 p-4" style={{ zIndex: 5 }}>
                    <div className="text-center">
                      <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-400 text-sm">{webcam.error}</p>
                    </div>
                  </div>
                )}

                {/* Status indicator */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center" style={{ zIndex: 10 }}>
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      faceMatched
                        ? "bg-green-500 text-white"
                        : faceDetected
                        ? "bg-yellow-500 text-black"
                        : !modelsLoaded || !cameraReady
                        ? "bg-blue-500 text-white"
                        : "bg-gray-700 text-gray-300"
                    }`}
                  >
                    {faceMatched ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" /> Verified!
                      </span>
                    ) : !modelsLoaded ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading face recognition...
                      </span>
                    ) : !cameraReady ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Initializing camera...
                      </span>
                    ) : faceDetected ? (
                      <span className="flex items-center gap-2">
                        <Camera className="h-4 w-4" /> Verifying... ({verificationAttempts}/5)
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> No face detected
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action being performed */}
              <div className="text-center">
                <p className={`text-sm font-medium ${
                  selectedPunchType === PunchType.CLOCK_IN ? "text-green-600" : "text-red-600"
                }`}>
                  {selectedPunchType === PunchType.CLOCK_IN ? "Clocking In..." : "Clocking Out..."}
                </p>
              </div>

              {/* Failed verification - show PIN fallback */}
              {faceMatched === false && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-yellow-800 text-sm mb-3">
                    Face verification failed. Use your PIN instead.
                  </p>
                  <Button
                    onClick={handlePinFallback}
                    variant="outline"
                    className="border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Enter PIN
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={resetFlow}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePinFallback}
                  variant="secondary"
                  className="flex-1"
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  Use PIN
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 4: PIN Entry */}
        {step === "pin" && techData && selectedPunchType && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5" />
                Enter PIN
              </CardTitle>
              <CardDescription>
                Enter your PIN to {selectedPunchType === PunchType.CLOCK_IN ? "clock in" : "clock out"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (4-6 digits)</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && handlePinVerify()}
                  placeholder="Enter PIN"
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                  autoFocus
                />
              </div>
              <Button
                onClick={handlePinVerify}
                disabled={verifyPinMutation.isPending || pin.length < 4}
                className={`w-full ${
                  selectedPunchType === PunchType.CLOCK_IN
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {verifyPinMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : selectedPunchType === PunchType.CLOCK_IN ? (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Clock In
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Clock Out
                  </>
                )}
              </Button>
              <Button
                onClick={resetFlow}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </>
        )}

        {/* Step 5: Success */}
        {step === "success" && lastPunchResult && techData && (
          <>
            <CardHeader className="text-center">
              <div
                className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  lastPunchResult.verified ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                {lastPunchResult.verified ? (
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                ) : (
                  <AlertTriangle className="h-10 w-10 text-yellow-600" />
                )}
              </div>
              <CardTitle className="text-2xl">
                {lastPunchResult.type === "CLOCK_IN" ? "Clocked In!" : "Clocked Out!"}
              </CardTitle>
              <CardDescription>
                {techData.enrollment.agent.firstName} {techData.enrollment.agent.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{lastPunchResult.time}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Verification</span>
                  <span
                    className={`font-medium ${
                      lastPunchResult.verified ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {lastPunchResult.verified ? "Face Verified" : "PIN (Unverified)"}
                  </span>
                </div>
                {geolocation.location && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {formatCoordinates(geolocation.location.latitude, geolocation.location.longitude)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-center text-muted-foreground text-sm">
                Returning to login in 5 seconds...
              </p>

              <Button
                onClick={resetFlow}
                variant="outline"
                className="w-full"
              >
                Done
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
