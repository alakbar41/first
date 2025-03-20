import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useState } from "react";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OtpInput from "@/components/auth/otp-input";

// Registration form schema
const registerSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .refine(
      (value) => value.endsWith('@ada.edu.az'),
      { message: "Please use your ADA University email address" }
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must include at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: z.string(),
  faculty: z.string({
    required_error: "Please select your faculty",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationStep = "form" | "verify";

export default function RegisterPage() {
  const { user, isLoading, registerMutation, sendOtpMutation, verifyOtpMutation } = useAuth();
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState<RegistrationStep>("form");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  // Form setup
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      faculty: "",
    }
  });

  // Handle registration form submission
  const onSubmit = async (values: z.infer<typeof registerSchema>) => {
    setEmail(values.email);
    
    try {
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        faculty: values.faculty,
        isAdmin: false
      });
      
      // Move to verification step
      setCurrentStep("verify");
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async () => {
    if (otp.length === 6) {
      try {
        await verifyOtpMutation.mutateAsync({
          email,
          otp
        });
        
        // Redirect to login after successful verification
        navigate("/auth");
      } catch (error) {
        console.error("OTP verification error:", error);
      }
    }
  };

  // Handle resend OTP
  const handleResendOtp = async () => {
    try {
      await sendOtpMutation.mutateAsync({
        email
      });
    } catch (error) {
      console.error("Resend OTP error:", error);
    }
  };

  // Redirect to dashboard if already logged in
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="auth-card flex flex-col items-center">
        {/* Logo */}
        <div className="mb-4 flex flex-col items-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <svg 
              className="w-8 h-8 text-primary" 
              fill="currentColor" 
              viewBox="0 0 20 20" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
            </svg>
          </div>
          <h3 className="text-lg text-gray-400 font-medium">Decentralized Voting</h3>
        </div>

        {currentStep === "form" ? (
          <>
            {/* Registration Heading */}
            <h1 className="text-2xl font-bold mb-2 text-center">Sign Up for Decentralized</h1>
            <p className="text-gray-500 mb-6 text-center">Create your account to start voting</p>

            {/* Registration Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium uppercase">ADA EMAIL</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@ada.edu.az"
                  className="auth-input"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="faculty" className="text-sm font-medium uppercase">FACULTY</Label>
                <Select 
                  onValueChange={(value) => form.setValue("faculty", value)}
                  defaultValue={form.getValues("faculty")}
                >
                  <SelectTrigger className="auth-input">
                    <SelectValue placeholder="Select your faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BSCS">School of Business</SelectItem>
                    <SelectItem value="SITE">School of IT and Engineering</SelectItem>
                    <SelectItem value="SPSS">School of Public and Social Sciences</SelectItem>
                    <SelectItem value="SEDU">School of Education</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.faculty && (
                  <p className="text-red-500 text-sm">{form.formState.errors.faculty.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium uppercase">PASSWORD</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="auth-input pr-10"
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-red-500 text-sm">{form.formState.errors.password.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium uppercase">CONFIRM PASSWORD</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="auth-input pr-10"
                    {...form.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-red-500 text-sm">{form.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button 
                type="submit"
                className="auth-button"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Signing up..." : "Sign Up"}
              </Button>
              
              <div className="text-center text-sm">
                <Button 
                  variant="link" 
                  className="auth-link p-0 h-auto" 
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft size={16} className="mr-1" /> Back to login
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* OTP Verification Heading */}
            <h1 className="text-2xl font-bold mb-2 text-center">Verify Your Email</h1>
            <p className="text-gray-500 mb-6 text-center">
              We've sent a verification code to<br />
              <span className="font-medium text-primary">{email}</span>
            </p>

            {/* OTP Input */}
            <div className="w-full space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Label htmlFor="otp" className="text-sm font-medium uppercase">ENTER VERIFICATION CODE</Label>
                <OtpInput 
                  value={otp} 
                  onChange={setOtp} 
                  length={6} 
                />
              </div>
              
              <Button 
                type="button"
                className="auth-button"
                onClick={handleVerifyOtp}
                disabled={verifyOtpMutation.isPending || otp.length !== 6}
              >
                {verifyOtpMutation.isPending ? "Verifying..." : "Verify"}
              </Button>
              
              <div className="text-center text-sm">
                Didn't receive a code?{" "}
                <Button 
                  variant="link" 
                  className="auth-link p-0 h-auto" 
                  onClick={handleResendOtp}
                  disabled={sendOtpMutation.isPending}
                >
                  {sendOtpMutation.isPending ? "Resending..." : "Resend"}
                </Button>
              </div>
              
              <div className="text-center text-sm">
                <Button 
                  variant="link" 
                  className="auth-link p-0 h-auto" 
                  onClick={() => setCurrentStep("form")}
                >
                  <ArrowLeft size={16} className="mr-1" /> Back to registration
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}