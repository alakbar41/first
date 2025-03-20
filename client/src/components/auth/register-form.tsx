import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Mail, Lock, School, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import OtpInput from "./otp-input";

const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(12, { message: "Password must be at most 12 characters" })
  .refine(val => /[A-Z]/.test(val), { message: "Password must contain an uppercase letter" })
  .refine(val => /[a-z]/.test(val), { message: "Password must contain a lowercase letter" })
  .refine(val => /[0-9]/.test(val), { message: "Password must contain a number" })
  .refine(val => /[^A-Za-z0-9]/.test(val), { message: "Password must contain a special character" });

const formSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .refine(email => email.endsWith('@ada.edu.az'), {
      message: "You must use your ADA University email address"
    }),
  faculty: z.string({
    required_error: "Please select your faculty",
  }),
  password: passwordSchema,
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { registerMutation, sendOtpMutation, verifyOtpMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(180); // 3 minutes
  const [userData, setUserData] = useState<z.infer<typeof formSchema> | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<number | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      faculty: "",
      password: "",
      confirmPassword: ""
    },
  });

  const startCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    setCountdown(180);
    const interval = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCountdownInterval(interval);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setRegisterError("");
    try {
      await registerMutation.mutateAsync({
        email: values.email,
        password: values.password,
        faculty: values.faculty,
        isAdmin: false
      });
      
      setUserData(values);
      setStep(2);
      startCountdown();
    } catch (error) {
      if (error instanceof Error) {
        setRegisterError(error.message);
      } else {
        setRegisterError("An unknown error occurred. Please try again.");
      }
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }

    setOtpError("");
    try {
      if (!userData) throw new Error("Missing user data");
      
      await verifyOtpMutation.mutateAsync({
        email: userData.email,
        otp
      });
      
      setStep(3);
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    } catch (error) {
      if (error instanceof Error) {
        setOtpError(error.message);
      } else {
        setOtpError("Invalid or expired verification code");
      }
    }
  }

  async function handleResendOtp() {
    if (!userData) return;
    
    try {
      await sendOtpMutation.mutateAsync({
        email: userData.email
      });
      
      setOtp("");
      startCountdown();
    } catch (error) {
      if (error instanceof Error) {
        setOtpError(error.message);
      } else {
        setOtpError("Failed to resend verification code");
      }
    }
  }

  const handleBackToStep1 = () => {
    setStep(1);
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
  };

  if (step === 3) {
    return (
      <div className="text-center py-4">
        <div className="mb-6 text-[#198754]">
          <CheckCircle2 className="mx-auto h-16 w-16" />
        </div>
        <h2 className="font-heading font-semibold text-xl text-gray-800 mb-2">Registration Successful!</h2>
        <p className="text-gray-500 text-sm mb-6">Your account has been created successfully.</p>
        <Button 
          onClick={onSuccess}
          className="w-full bg-[#005A9C] hover:bg-[#004A80]"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  if (step === 2) {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
      <div>
        <h2 className="font-heading font-semibold text-xl text-gray-800 mb-2">Verify your email</h2>
        <p className="text-gray-500 text-sm mb-6">
          We've sent a 6-digit verification code to <span className="font-medium text-gray-700">{userData?.email}</span>
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">Enter verification code</label>
          <OtpInput value={otp} onChange={setOtp} />
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              <span className="inline-block align-text-bottom mr-1">⏱️</span>
              Code expires in <span className="font-medium">{formattedTime}</span>
            </div>
            <Button 
              variant="link"
              size="sm"
              onClick={handleResendOtp}
              disabled={countdown > 0 || sendOtpMutation.isPending}
              className="text-sm text-[#005A9C] hover:text-[#004A80] disabled:text-gray-400"
            >
              Resend code
            </Button>
          </div>
          {otpError && <p className="mt-2 text-sm text-[#DC3545]">{otpError}</p>}
        </div>
        
        <Button 
          onClick={handleVerifyOtp}
          className="w-full bg-[#005A9C] hover:bg-[#004A80]"
          disabled={verifyOtpMutation.isPending}
        >
          {verifyOtpMutation.isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
          ) : (
            "Verify"
          )}
        </Button>
        
        <Button 
          variant="ghost"
          onClick={handleBackToStep1}
          className="w-full mt-3 hover:bg-gray-100 text-gray-700 font-medium"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <h2 className="font-heading font-semibold text-xl text-gray-800 mb-2">Create your account</h2>
        <p className="text-gray-500 text-sm mb-6">Fill in your details to get started</p>
        
        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">University Email Address</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <FormControl>
                  <Input
                    placeholder="yourname@ada.edu.az"
                    className="pl-10"
                    type="email"
                    {...field}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-xs text-gray-500">
                Must be a valid ADA University email address
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Faculty Selection */}
        <FormField
          control={form.control}
          name="faculty"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Faculty</FormLabel>
              <div className="relative">
                <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select your faculty" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="SITE">School of IT and Engineering</SelectItem>
                    <SelectItem value="SBBA">School of Business</SelectItem>
                    <SelectItem value="SPSS">School of Public and Social Sciences</SelectItem>
                    <SelectItem value="SED">School of Education</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Password Field */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <FormControl>
                  <Input
                    placeholder="Create a strong password"
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <p>Password must contain:</p>
                <ul className="pl-4 list-disc mt-1">
                  <li className={field.value && field.value.length >= 8 && field.value.length <= 12 ? "text-[#198754]" : "text-gray-500"}>
                    8-12 characters
                  </li>
                  <li className={field.value && /[A-Z]/.test(field.value) ? "text-[#198754]" : "text-gray-500"}>
                    Uppercase letter
                  </li>
                  <li className={field.value && /[a-z]/.test(field.value) ? "text-[#198754]" : "text-gray-500"}>
                    Lowercase letter
                  </li>
                  <li className={field.value && /[0-9]/.test(field.value) ? "text-[#198754]" : "text-gray-500"}>
                    Number
                  </li>
                  <li className={field.value && /[^A-Za-z0-9]/.test(field.value) ? "text-[#198754]" : "text-gray-500"}>
                    Special character
                  </li>
                </ul>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Confirm Password Field */}
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Confirm Password</FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <FormControl>
                  <Input
                    placeholder="Confirm your password"
                    className="pl-10 pr-10"
                    type={showConfirmPassword ? "text" : "password"}
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 text-gray-500"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Error Alert */}
        {registerError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{registerError}</AlertDescription>
          </Alert>
        )}
        
        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full bg-[#005A9C] hover:bg-[#004A80]"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </Form>
  );
}
