"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  User,
  KeyRound,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useAgents, Agent } from "@/hooks/useAgents";
import { useCreateTechEnrollment, useUploadTechPhoto } from "@/hooks/useTechEnrollment";
import { useWebcam } from "@/hooks/useWebcam";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useFaceRecognition } from "@/hooks/useFaceRecognition";
import { detectFaceFromCanvas, canvasToBase64 } from "@/lib/face-recognition";
import { formatCoordinates } from "@/lib/geolocation";

interface EnrollmentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = "select" | "photo" | "pin" | "confirm";

export function EnrollmentWizard({
  open,
  onOpenChange,
  onSuccess,
}: EnrollmentWizardProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: agents, isLoading: loadingAgents } = useAgents();
  const createEnrollment = useCreateTechEnrollment();
  const uploadPhoto = useUploadTechPhoto();
  const webcam = useWebcam();
  const geolocation = useGeolocation();
  const faceRecognition = useFaceRecognition();

  // Filter out already enrolled agents
  const availableAgents = agents?.filter((a) => a.isActive) || [];

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedAgentId("");
      setSelectedAgent(null);
      setPin("");
      setConfirmPin("");
      setCapturedPhoto(null);
      setFaceDescriptor(null);
      setEnrollmentId(null);
      webcam.stopCamera();
    }
  }, [open]);

  // Get location when dialog opens
  useEffect(() => {
    if (open) {
      geolocation.getLocation();
    }
  }, [open]);

  // Handle agent selection
  const handleAgentSelect = (agentId: string) => {
    setSelectedAgentId(agentId);
    const agent = availableAgents.find((a) => a.id === agentId);
    setSelectedAgent(agent || null);
  };

  // Move to photo step
  const handleToPhotoStep = async () => {
    if (!selectedAgent) {
      toast.error("Please select an employee");
      return;
    }
    setStep("photo");
    await webcam.startCamera();
  };

  // Capture photo
  const handleCapturePhoto = async () => {
    if (!webcam.videoRef.current) return;

    const canvas = webcam.captureFrame();
    if (!canvas) {
      toast.error("Failed to capture photo");
      return;
    }

    // Detect face and extract descriptor
    const detection = await detectFaceFromCanvas(canvas);

    if (!detection.detected || !detection.descriptor) {
      toast.error("No face detected. Please position your face in the camera and try again.");
      return;
    }

    // Store photo and descriptor
    const photoData = canvasToBase64(canvas, 0.85);
    setCapturedPhoto(photoData);
    setFaceDescriptor(detection.descriptor);

    webcam.stopCamera();
    setStep("pin");
  };

  // Skip photo (PIN only mode)
  const handleSkipPhoto = () => {
    webcam.stopCamera();
    setStep("pin");
  };

  // Handle PIN setup
  const handlePinSetup = () => {
    if (pin.length < 4 || pin.length > 6) {
      toast.error("PIN must be 4-6 digits");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }
    setStep("confirm");
  };

  // Complete enrollment
  const handleComplete = async () => {
    if (!selectedAgent) return;

    try {
      // Create enrollment
      const enrollment = await createEnrollment.mutateAsync({
        agentId: selectedAgent.id,
        pin,
        enrollmentLat: geolocation.location?.latitude,
        enrollmentLng: geolocation.location?.longitude,
      });

      setEnrollmentId(enrollment.id);

      // Upload photo if captured
      if (capturedPhoto && faceDescriptor) {
        await uploadPhoto.mutateAsync({
          id: enrollment.id,
          data: {
            imageData: capturedPhoto,
            faceDescriptor,
          },
        });
      }

      toast.success(`${selectedAgent.firstName} ${selectedAgent.lastName} enrolled successfully!`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create enrollment");
    }
  };

  // Draw video to canvas for preview
  useEffect(() => {
    if (step === "photo" && webcam.isActive && canvasRef.current && webcam.videoRef.current) {
      const video = webcam.videoRef.current;
      const canvas = canvasRef.current;

      const drawFrame = () => {
        if (!webcam.isActive) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);

          // Draw face guide oval
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          const ovalWidth = canvas.width * 0.45;
          const ovalHeight = canvas.height * 0.6;

          ctx.beginPath();
          ctx.ellipse(centerX, centerY, ovalWidth / 2, ovalHeight / 2, 0, 0, 2 * Math.PI);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
    }
  }, [step, webcam.isActive]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enroll Employee in Time Clock</DialogTitle>
          <DialogDescription>
            {step === "select" && "Select an employee to enroll in the time clock system."}
            {step === "photo" && "Capture a reference photo for facial verification."}
            {step === "pin" && "Set up a PIN for fallback authentication."}
            {step === "confirm" && "Review and confirm enrollment."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Employee */}
        {step === "select" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Employee</Label>
              <Select value={selectedAgentId} onValueChange={handleAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingAgents ? (
                    <div className="p-2 text-center text-muted-foreground">
                      Loading...
                    </div>
                  ) : availableAgents.length === 0 ? (
                    <div className="p-2 text-center text-muted-foreground">
                      No employees available
                    </div>
                  ) : (
                    availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName} ({agent.employeeId})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedAgent && (
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: selectedAgent.color || "#6366f1" }}
                  >
                    {selectedAgent.firstName[0]}
                    {selectedAgent.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedAgent.firstName} {selectedAgent.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAgent.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleToPhotoStep} disabled={!selectedAgent}>
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Capture Photo */}
        {step === "photo" && (
          <div className="space-y-4">
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video
                ref={webcam.videoRef}
                autoPlay
                playsInline
                muted
                className="hidden"
              />
              <canvas ref={canvasRef} className="w-full h-full object-cover" />

              {webcam.isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}

              {webcam.error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                  <p className="text-red-400 text-center">{webcam.error}</p>
                </div>
              )}
            </div>

            {faceRecognition.isLoadingModels && (
              <p className="text-sm text-muted-foreground text-center">
                Loading face recognition models...
              </p>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  webcam.stopCamera();
                  setStep("select");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <div className="space-x-2">
                <Button variant="ghost" onClick={handleSkipPhoto}>
                  Skip Photo
                </Button>
                <Button
                  onClick={handleCapturePhoto}
                  disabled={!webcam.isActive || faceRecognition.isLoadingModels}
                >
                  <Camera className="h-4 w-4 mr-2" /> Capture
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Set PIN */}
        {step === "pin" && (
          <div className="space-y-4">
            {capturedPhoto && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={capturedPhoto}
                    alt="Captured photo"
                    className="w-32 h-32 rounded-full object-cover border-4 border-green-500"
                  />
                  <CheckCircle2 className="absolute bottom-0 right-0 h-6 w-6 text-green-500 bg-white rounded-full" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="pin">PIN (4-6 digits)</Label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter PIN"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Confirm PIN"
                maxLength={6}
              />
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setCapturedPhoto(null);
                  setFaceDescriptor(null);
                  setStep("photo");
                  webcam.startCamera();
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handlePinSetup}
                disabled={pin.length < 4 || pin !== confirmPin}
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && selectedAgent && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                {capturedPhoto ? (
                  <img
                    src={capturedPhoto}
                    alt="Reference photo"
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-slate-300 flex items-center justify-center">
                    <User className="h-6 w-6 text-slate-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium">
                    {selectedAgent.firstName} {selectedAgent.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAgent.employeeId}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {capturedPhoto ? "Photo captured" : "No photo (PIN only)"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                  <span>PIN set ({pin.length} digits)</span>
                </div>
                {geolocation.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {formatCoordinates(
                        geolocation.location.latitude,
                        geolocation.location.longitude
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("pin")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={createEnrollment.isPending || uploadPhoto.isPending}
              >
                {createEnrollment.isPending || uploadPhoto.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Complete Enrollment
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
