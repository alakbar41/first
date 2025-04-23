import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Eye, EyeOff, ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OtpInput from "@/components/auth/otp-input";
import { FACULTY_CODES, FACULTY_ABBREVIATIONS } from "@shared/schema";

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

  // Password validation states
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false
  });
  
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
  
  // Update password validation criteria
  useEffect(() => {
    const password = form.watch("password");
    const confirmPassword = form.watch("confirmPassword");
    
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password),
      match: password === confirmPassword && password.length > 0 && confirmPassword.length > 0
    });
  }, [form.watch("password"), form.watch("confirmPassword")]);

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
        {/* ADA Logo */}
        <div className="mb-4 flex flex-col items-center">
          <img 
            src="/assets/ada_university_logo.png" 
            alt="ADA University" 
            className="h-24 mb-2"
            onError={(e) => {
              // Fallback if the new logo doesn't load
              e.currentTarget.src = "/images/adalogo.svg";
            }}
          />
          <h3 className="text-lg text-gray-400 font-medium">UniVote</h3>
        </div>

        {currentStep === "form" ? (
          <>
            {/* Registration Heading */}
            <h1 className="text-2xl font-bold mb-2 text-center">Sign Up for UniVote</h1>
            <p className="text-gray-500 mb-6 text-center">Create your account to participate in university elections</p>

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
                    {FACULTY_CODES.map(code => (
                      <SelectItem key={code} value={code}>
                        {FACULTY_ABBREVIATIONS[code]}
                      </SelectItem>
                    ))}
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
                <div className="text-xs space-y-1 mt-1">
                  <p className="text-gray-500">Password requirements:</p>
                  <ul className="space-y-1">
                    <li className={`password-requirement ${passwordCriteria.length ? 'met' : 'not-met'}`}>
                      {passwordCriteria.length ? <Check size={12} /> : <X size={12} />}
                      At least 8 characters long
                    </li>
                    <li className={`password-requirement ${passwordCriteria.uppercase ? 'met' : 'not-met'}`}>
                      {passwordCriteria.uppercase ? <Check size={12} /> : <X size={12} />}
                      Include at least one uppercase letter
                    </li>
                    <li className={`password-requirement ${passwordCriteria.lowercase ? 'met' : 'not-met'}`}>
                      {passwordCriteria.lowercase ? <Check size={12} /> : <X size={12} />}
                      Include at least one lowercase letter
                    </li>
                    <li className={`password-requirement ${passwordCriteria.number ? 'met' : 'not-met'}`}>
                      {passwordCriteria.number ? <Check size={12} /> : <X size={12} />}
                      Include at least one number
                    </li>
                    <li className={`password-requirement ${passwordCriteria.special ? 'met' : 'not-met'}`}>
                      {passwordCriteria.special ? <Check size={12} /> : <X size={12} />}
                      Include at least one special character
                    </li>
                  </ul>
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
                <div className="mt-1">
                  {form.watch("confirmPassword") && (
                    <div className={`password-requirement ${passwordCriteria.match ? 'met' : 'not-met'}`}>
                      {passwordCriteria.match ? <Check size={12} /> : <X size={12} />}
                      {passwordCriteria.match ? "Passwords match" : "Passwords don't match"}
                    </div>
                  )}
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