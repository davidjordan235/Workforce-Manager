"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Briefcase,
  Phone,
  Camera,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Upload,
  Trash2,
} from "lucide-react";
import { DepartmentSelect } from "./DepartmentSelect";
import { EmploymentTypeSelect } from "./EmploymentTypeSelect";
import { ManagerSelect } from "./ManagerSelect";
import { useWebcam } from "@/hooks/useWebcam";
import { useFaceRecognition } from "@/hooks/useFaceRecognition";
import { detectFaceFromCanvas, canvasToBase64 } from "@/lib/face-recognition";
import { toast } from "sonner";
import { agentColors, getRandomAgentColor } from "@/types/agent";
import { EmergencyContact } from "@/types/employee";

type Step = "basic" | "employment" | "emergency" | "photo";

interface EmployeeFormData {
  // Basic Info
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  hireDate: string;
  color: string;

  // Employment Details
  title: string;
  dateOfBirth: string;
  departmentId: string | null;
  employmentTypeId: string | null;
  reportsToId: string | null;
  isActive: boolean;

  // Emergency Contact
  emergencyContact: EmergencyContact | null;

  // Photo Enrollment
  enrollWithPhoto: boolean;
  pin: string;
  confirmPin: string;
  capturedPhoto: string | null;
  faceDescriptor: number[] | null;
  existingPhotoUrl?: string | null;
}

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  initialData?: Partial<EmployeeFormData>;
  isLoading?: boolean;
  editingId?: string;
  enrollmentId?: string;
  onDeletePhoto?: (enrollmentId: string) => Promise<void>;
}

const initialFormData: EmployeeFormData = {
  employeeId: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  hireDate: new Date().toISOString().split("T")[0],
  color: getRandomAgentColor(),
  title: "",
  dateOfBirth: "",
  departmentId: null,
  employmentTypeId: null,
  reportsToId: null,
  isActive: true,
  emergencyContact: null,
  enrollWithPhoto: false,
  pin: "",
  confirmPin: "",
  capturedPhoto: null,
  faceDescriptor: null,
  existingPhotoUrl: null,
};

const relationshipOptions = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Friend",
  "Other",
];

export function EmployeeForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
  editingId,
  enrollmentId,
  onDeletePhoto,
}: EmployeeFormProps) {
  const [step, setStep] = useState<Step>("basic");
  const [formData, setFormData] = useState<EmployeeFormData>({
    ...initialFormData,
    ...initialData,
  });
  const [emergencyName, setEmergencyName] = useState(
    initialData?.emergencyContact?.name || ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    initialData?.emergencyContact?.phone || ""
  );
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    initialData?.emergencyContact?.relationship || ""
  );

  const webcam = useWebcam();
  const faceRecognition = useFaceRecognition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  const handleDeleteExistingPhoto = async () => {
    if (!enrollmentId || !onDeletePhoto) return;

    setIsDeletingPhoto(true);
    try {
      await onDeletePhoto(enrollmentId);
      updateField("existingPhotoUrl", null);
    } finally {
      setIsDeletingPhoto(false);
    }
  };

  useEffect(() => {
    if (open) {
      setStep("basic");
      if (initialData) {
        setFormData({ ...initialFormData, ...initialData });
        setEmergencyName(initialData.emergencyContact?.name || "");
        setEmergencyPhone(initialData.emergencyContact?.phone || "");
        setEmergencyRelationship(initialData.emergencyContact?.relationship || "");
      } else {
        setFormData({ ...initialFormData, color: getRandomAgentColor() });
        setEmergencyName("");
        setEmergencyPhone("");
        setEmergencyRelationship("");
      }
    } else {
      webcam.stopCamera();
    }
  }, [open, initialData]);

  const updateField = <K extends keyof EmployeeFormData>(
    field: K,
    value: EmployeeFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateBasicInfo = () => {
    if (!formData.employeeId.trim()) {
      toast.error("Employee ID is required");
      return false;
    }
    if (!formData.firstName.trim()) {
      toast.error("First name is required");
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error("Last name is required");
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Valid email is required");
      return false;
    }
    if (!formData.hireDate) {
      toast.error("Hire date is required");
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === "basic") {
      if (!validateBasicInfo()) return;
      setStep("employment");
    } else if (step === "employment") {
      setStep("emergency");
    } else if (step === "emergency") {
      // Save emergency contact data
      if (emergencyName || emergencyPhone || emergencyRelationship) {
        updateField("emergencyContact", {
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRelationship,
        });
      } else {
        updateField("emergencyContact", null);
      }
      setStep("photo");
    }
  };

  const handleBack = () => {
    if (step === "employment") {
      setStep("basic");
    } else if (step === "emergency") {
      setStep("employment");
    } else if (step === "photo") {
      webcam.stopCamera();
      setStep("emergency");
    }
  };

  const handleStartCamera = async () => {
    await faceRecognition.loadModels();
    await webcam.startCamera();
  };

  const handleCapturePhoto = async () => {
    if (!webcam.videoRef.current) {
      toast.error("Camera not ready. Please try again.");
      return;
    }

    const video = webcam.videoRef.current;

    // Check if video is ready
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Video not ready. Please wait a moment and try again.");
      return;
    }

    // Create canvas and capture frame directly
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Failed to capture photo.");
      return;
    }
    ctx.drawImage(video, 0, 0);

    const detection = await detectFaceFromCanvas(canvas);

    if (!detection.detected || !detection.descriptor) {
      toast.error("No face detected. Please position your face in the camera.");
      return;
    }

    const photoData = canvasToBase64(canvas, 0.85);
    updateField("capturedPhoto", photoData);
    updateField("faceDescriptor", Array.from(detection.descriptor));
    webcam.stopCamera();
    toast.success("Photo captured successfully");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      await faceRecognition.loadModels();
      const detection = await detectFaceFromCanvas(canvas);

      if (!detection.detected || !detection.descriptor) {
        toast.error("No face detected in the uploaded image.");
        return;
      }

      const photoData = canvasToBase64(canvas, 0.85);
      updateField("capturedPhoto", photoData);
      updateField("faceDescriptor", Array.from(detection.descriptor));
      toast.success("Photo uploaded successfully");
    };
    img.src = URL.createObjectURL(file);
  };

  const handleSubmit = async () => {
    // Final validation
    if (formData.enrollWithPhoto) {
      if (!formData.pin || formData.pin.length < 4 || formData.pin.length > 6) {
        toast.error("PIN must be 4-6 digits");
        return;
      }
      if (formData.pin !== formData.confirmPin) {
        toast.error("PINs do not match");
        return;
      }
    }

    // Build final data
    const submitData: EmployeeFormData = {
      ...formData,
      emergencyContact:
        emergencyName || emergencyPhone || emergencyRelationship
          ? {
              name: emergencyName,
              phone: emergencyPhone,
              relationship: emergencyRelationship,
            }
          : null,
    };

    await onSubmit(submitData);
  };

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "basic", label: "Basic Info", icon: <User className="h-4 w-4" /> },
    { key: "employment", label: "Employment", icon: <Briefcase className="h-4 w-4" /> },
    { key: "emergency", label: "Emergency", icon: <Phone className="h-4 w-4" /> },
    { key: "photo", label: "Photo", icon: <Camera className="h-4 w-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit Employee" : "Add New Employee"}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2 border-b mb-4">
          {steps.map((s, index) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  index === currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : index < currentStepIndex
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <span className="w-4 text-center">{index + 1}</span>
                )}
                <span>{s.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-4 h-px mx-1 ${index < currentStepIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {step === "basic" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    value={formData.employeeId}
                    onChange={(e) => updateField("employeeId", e.target.value)}
                    placeholder="EMP001"
                    disabled={!!editingId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">Hire Date *</Label>
                  <Input
                    id="hireDate"
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => updateField("hireDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Agent Color</Label>
                <div className="flex flex-wrap gap-2">
                  {agentColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color
                          ? "border-foreground"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateField("color", color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === "employment" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Customer Service Representative"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => updateField("dateOfBirth", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <DepartmentSelect
                  value={formData.departmentId}
                  onChange={(val) => updateField("departmentId", val)}
                />
              </div>

              <div className="space-y-2">
                <Label>Employment Type</Label>
                <EmploymentTypeSelect
                  value={formData.employmentTypeId}
                  onChange={(val) => updateField("employmentTypeId", val)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reports To</Label>
                <ManagerSelect
                  value={formData.reportsToId}
                  onChange={(val) => updateField("reportsToId", val)}
                  excludeId={editingId}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => updateField("isActive", checked)}
                />
                <Label htmlFor="isActive">Active Employee</Label>
              </div>
            </div>
          )}

          {step === "emergency" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Emergency contact information (optional)
              </p>

              <div className="space-y-2">
                <Label htmlFor="emergencyName">Contact Name</Label>
                <Input
                  id="emergencyName"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Contact Phone</Label>
                <Input
                  id="emergencyPhone"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  placeholder="(555) 987-6543"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyRelationship">Relationship</Label>
                <select
                  id="emergencyRelationship"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select relationship</option>
                  {relationshipOptions.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === "photo" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Switch
                  id="enrollWithPhoto"
                  checked={formData.enrollWithPhoto}
                  onCheckedChange={(checked) => {
                    updateField("enrollWithPhoto", checked);
                    if (!checked) {
                      webcam.stopCamera();
                      updateField("capturedPhoto", null);
                      updateField("faceDescriptor", null);
                      updateField("pin", "");
                      updateField("confirmPin", "");
                    }
                  }}
                />
                <Label htmlFor="enrollWithPhoto">
                  Enable time clock enrollment with photo verification
                </Label>
              </div>

              {formData.enrollWithPhoto && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pin">PIN (4-6 digits) *</Label>
                      <Input
                        id="pin"
                        type="password"
                        value={formData.pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          updateField("pin", val);
                        }}
                        placeholder="Enter PIN"
                        maxLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPin">Confirm PIN *</Label>
                      <Input
                        id="confirmPin"
                        type="password"
                        value={formData.confirmPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          updateField("confirmPin", val);
                        }}
                        placeholder="Confirm PIN"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-4">
                    <Label>Photo for Face Verification</Label>

                    {formData.capturedPhoto ? (
                      <div className="text-center">
                        <img
                          src={formData.capturedPhoto}
                          alt="Captured"
                          className="w-48 h-48 object-cover rounded-lg mx-auto mb-2"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            updateField("capturedPhoto", null);
                            updateField("faceDescriptor", null);
                          }}
                        >
                          Take New Photo
                        </Button>
                      </div>
                    ) : formData.existingPhotoUrl && !webcam.isActive ? (
                      <div className="text-center">
                        <img
                          src={formData.existingPhotoUrl}
                          alt="Current Photo"
                          className="w-48 h-48 object-cover rounded-lg mx-auto mb-2"
                        />
                        <p className="text-sm text-muted-foreground mb-2">Current enrolled photo</p>
                        <div className="flex gap-2 justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleStartCamera}
                            disabled={faceRecognition.isLoadingModels || isDeletingPhoto}
                          >
                            {faceRecognition.isLoadingModels ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Camera className="h-4 w-4 mr-2" />
                                Retake Photo
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDeleteExistingPhoto}
                            disabled={isDeletingPhoto || !onDeletePhoto}
                          >
                            {isDeletingPhoto ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Photo
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : webcam.isActive ? (
                      <div className="relative">
                        <video
                          ref={webcam.videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full rounded-lg"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="flex gap-2 mt-2 justify-center">
                          <Button
                            type="button"
                            onClick={handleCapturePhoto}
                            disabled={!webcam.isVideoReady}
                          >
                            {!webcam.isVideoReady ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <Camera className="h-4 w-4 mr-2" />
                                Capture
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => webcam.stopCamera()}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleStartCamera}
                          disabled={faceRecognition.isLoadingModels}
                        >
                          {faceRecognition.isLoadingModels ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 mr-2" />
                              Use Camera
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {!formData.enrollWithPhoto && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Photo enrollment is optional. You can enroll the employee for time clock later.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t mt-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === "basic"}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {step === "photo" ? (
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {editingId ? "Update Employee" : "Create Employee"}
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
