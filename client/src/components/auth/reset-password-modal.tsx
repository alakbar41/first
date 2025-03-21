import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, EyeOff } from "lucide-react";
import OtpInput from "./otp-input";

// Step 1 schema - email input
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Step 2 schema - OTP and password input
const resetSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters").max(100),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type Step1Data = z.infer<typeof emailSchema>;
type Step2Data = z.infer<typeof resetSchema>;

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPasswordModal({ open, onOpenChange }: ResetPasswordModalProps) {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const { resetPasswordSendOtpMutation, resetPasswordVerifyMutation } = useAuth();

  // Form for email step
  const emailForm = useForm<Step1Data>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Form for reset step
  const resetForm = useForm<Step2Data>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Handle requesting a reset code
  const handleRequestReset = async (data: Step1Data) => {
    setEmail(data.email);
    await resetPasswordSendOtpMutation.mutate({ 
      email: data.email 
    });
    
    // Move to reset step
    setStep("reset");
  };

  // Handle reset password submission
  const handleReset = async (data: Step2Data) => {
    await resetPasswordVerifyMutation.mutate({
      email,
      otp: data.otp,
      newPassword: data.newPassword,
    });
    
    // Close modal and reset step
    onOpenChange(false);
    setStep("email");
    emailForm.reset();
    resetForm.reset();
    setOtpValue("");
  };

  // Handle OTP input change
  const handleOtpChange = (value: string) => {
    setOtpValue(value);
    resetForm.setValue("otp", value);
  };

  // Handle form close
  const handleClose = () => {
    onOpenChange(false);
    setStep("email");
    emailForm.reset();
    resetForm.reset();
    setOtpValue("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {step === "email" ? "Reset Your Password" : "Enter Reset Code"}
          </DialogTitle>
          <DialogDescription>
            {step === "email" 
              ? "Enter your email to receive a password reset code." 
              : "Check your email for a 6-digit code and enter your new password."}
          </DialogDescription>
        </DialogHeader>

        {step === "email" ? (
          <form onSubmit={emailForm.handleSubmit(handleRequestReset)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your registered email"
                {...emailForm.register("email")}
              />
              {emailForm.formState.errors.email && (
                <p className="text-sm text-red-500">
                  {emailForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={resetPasswordSendOtpMutation.isPending}
              >
                {resetPasswordSendOtpMutation.isPending ? "Sending..." : "Send Reset Code"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={resetForm.handleSubmit(handleReset)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <div className="my-4">
                <OtpInput 
                  value={otpValue} 
                  onChange={handleOtpChange} 
                  length={6} 
                />
              </div>
              {resetForm.formState.errors.otp && (
                <p className="text-sm text-red-500">
                  {resetForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  className="pr-10"
                  {...resetForm.register("newPassword")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {resetForm.formState.errors.newPassword && (
                <p className="text-sm text-red-500">
                  {resetForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                className="pr-10"
                {...resetForm.register("confirmPassword")}
              />
              {resetForm.formState.errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {resetForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep("email")}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                disabled={resetPasswordVerifyMutation.isPending}
              >
                {resetPasswordVerifyMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}