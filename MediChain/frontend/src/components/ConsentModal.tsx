"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  FileText,
  Check,
  AlertTriangle,
  Loader2,
  X,
  Lock,
  Eye,
  Fingerprint,
  FileCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";

interface ConsentDocument {
  id: string;
  title: string;
  version: string;
  url: string;
  type: "informed_consent" | "hipaa" | "privacy" | "data_sharing";
  required: boolean;
}

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (consentData: ConsentData) => Promise<void>;
  trialTitle: string;
  trialId: string;
  documents: ConsentDocument[];
  patientName: string;
  walletAddress?: string;
}

interface ConsentData {
  trialId: string;
  documentsAgreed: string[];
  signature: string;
  timestamp: string;
  walletAddress?: string;
  txHash?: string;
}

const documentTypeInfo = {
  informed_consent: { label: "Informed Consent", icon: FileText, color: "text-blue-600" },
  hipaa: { label: "HIPAA Authorization", icon: Shield, color: "text-green-600" },
  privacy: { label: "Privacy Policy", icon: Lock, color: "text-purple-600" },
  data_sharing: { label: "Data Sharing Agreement", icon: Eye, color: "text-amber-600" },
};

export function ConsentModal({
  isOpen,
  onClose,
  onSubmit,
  trialTitle,
  trialId,
  documents,
  patientName,
  walletAddress,
}: ConsentModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [agreedDocuments, setAgreedDocuments] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { title: "Review Documents", icon: FileText },
    { title: "Agree to Terms", icon: Check },
    { title: "Digital Signature", icon: Fingerprint },
    { title: "Blockchain Record", icon: Shield },
  ];

  const requiredDocs = documents.filter((d) => d.required);
  const allRequiredAgreed = requiredDocs.every((d) => agreedDocuments.has(d.id));

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setAgreedDocuments(new Set());
      setSignatureConfirmed(false);
      setError(null);
    }
  }, [isOpen]);

  const handleAgreeDocument = (docId: string) => {
    const newAgreed = new Set(agreedDocuments);
    if (newAgreed.has(docId)) {
      newAgreed.delete(docId);
    } else {
      newAgreed.add(docId);
    }
    setAgreedDocuments(newAgreed);
  };

  const handleSubmit = async () => {
    if (!signatureConfirmed) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const consentData: ConsentData = {
        trialId,
        documentsAgreed: Array.from(agreedDocuments),
        signature: `${patientName}_${Date.now()}`,
        timestamp: new Date().toISOString(),
        walletAddress,
      };

      await onSubmit(consentData);
      setCurrentStep(3); // Move to success step
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit consent");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <CardHeader className="border-b bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Consent for Clinical Trial
              </CardTitle>
              <CardDescription className="mt-1">{trialTitle}</CardDescription>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-white/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isComplete = idx < currentStep;

              return (
                <div key={idx} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                      isComplete
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-cyan-500 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium hidden sm:block ${
                      isActive ? "text-cyan-700" : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </span>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-8 sm:w-12 h-1 mx-2 rounded ${
                        idx < currentStep ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Step 1: Review Documents */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please review the following documents carefully before proceeding. These documents explain the trial procedures, risks, and your rights as a participant.
              </p>

              <div className="space-y-3">
                {documents.map((doc) => {
                  const typeInfo = documentTypeInfo[doc.type];
                  const TypeIcon = typeInfo.icon;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-gray-100 ${typeInfo.color}`}>
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{doc.title}</h4>
                          <p className="text-xs text-gray-500">
                            {typeInfo.label} • Version {doc.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.required && (
                          <Badge variant="outline" className="text-red-600 border-red-200">
                            Required
                          </Badge>
                        )}
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-500" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Agree to Terms */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Please check each document you have read and agree to. All required documents must be agreed to before proceeding.
              </p>

              <div className="space-y-3">
                {documents.map((doc) => {
                  const typeInfo = documentTypeInfo[doc.type];
                  const isAgreed = agreedDocuments.has(doc.id);

                  return (
                    <button
                      key={doc.id}
                      onClick={() => handleAgreeDocument(doc.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                        isAgreed
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isAgreed
                            ? "bg-green-500 text-white"
                            : "border-2 border-gray-300"
                        }`}
                      >
                        {isAgreed && <Check className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-medium text-gray-900">{doc.title}</h4>
                        <p className="text-xs text-gray-500">
                          I have read and agree to the {typeInfo.label}
                        </p>
                      </div>
                      {doc.required && !isAgreed && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200">
                          Required
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>

              <Progress
                value={(agreedDocuments.size / documents.length) * 100}
                className="h-2"
              />
              <p className="text-sm text-gray-500 text-center">
                {agreedDocuments.size} of {documents.length} documents agreed
              </p>
            </div>
          )}

          {/* Step 3: Digital Signature */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Fingerprint className="w-8 h-8 text-cyan-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Digital Signature</h3>
                <p className="text-sm text-gray-600 mt-1">
                  By signing, you confirm your identity and consent to participate.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 border space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Full Name:</span>
                  <span className="font-medium text-gray-900">{patientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium text-gray-900">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                {walletAddress && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Wallet:</span>
                    <span className="font-mono text-xs text-gray-900">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                )}
              </div>

              <label className="flex items-start gap-3 p-4 rounded-lg border bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={signatureConfirmed}
                  onChange={(e) => setSignatureConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    I confirm my digital signature
                  </p>
                  <p className="text-gray-500 mt-1">
                    I understand that this digital signature is legally binding and equivalent to a handwritten signature.
                  </p>
                </div>
              </label>

              {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Success */}
          {currentStep === 3 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
                <FileCheck className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Consent Recorded Successfully
              </h3>
              <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
                Your consent has been securely recorded on the blockchain. You will receive a confirmation email shortly.
              </p>

              <div className="mt-6 p-4 rounded-lg bg-gray-50 border">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Immutably stored on Base L2</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t bg-gray-50 flex justify-between">
          {currentStep < 3 ? (
            <>
              <Button
                variant="outline"
                onClick={() => (currentStep === 0 ? onClose() : setCurrentStep(currentStep - 1))}
              >
                {currentStep === 0 ? "Cancel" : "Back"}
              </Button>

              {currentStep < 2 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={currentStep === 1 && !allRequiredAgreed}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!signatureConfirmed || isSubmitting}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recording on Blockchain...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Submit Consent
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              Done
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
