import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCSRF } from "@/hooks/use-csrf";
import { useToast } from "@/hooks/use-toast";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

// Create password reset form schema
const resetPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useLocation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { csrfToken, refreshToken } = useCSRF();
  
  // Get token and email from URL query parameters
  const params = new URLSearchParams(searchParams);
  const token = params.get("token");
  const email = params.get("email");
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Set up form
  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    }
  });
  
  // Verify token when component mounts
  useEffect(() => {
    const verifyToken = async () => {
      // If missing token or email, invalid URL
      if (!token || !email) {
        toast({
          title: "Invalid Reset Link",
          description: "The password reset link is invalid or has expired.",
          variant: "destructive"
        });
        setIsVerifying(false);
        return;
      }
      
      try {
        // Ensure we have a CSRF token
        await refreshToken();
        
        // Verify token with backend
        const response = await apiRequest("POST", "/api/reset-password/verify-token", {
          email,
          token
        });
        
        if (response.ok) {
          setIsTokenValid(true);
        } else {
          const data = await response.json();
          toast({
            title: "Invalid Reset Link",
            description: data.message || "The password reset link is invalid or has expired.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Token verification error:", error);
        toast({
          title: "Verification Failed",
          description: "There was a problem verifying your reset link. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsVerifying(false);
      }
    };
    
    verifyToken();
  }, [token, email, toast, refreshToken]);
  
  // Handle form submission
  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token || !email || !csrfToken) {
      return;
    }
    
    setIsResetting(true);
    
    try {
      const response = await apiRequest("POST", "/api/reset-password/set-password", {
        email,
        token,
        newPassword: data.newPassword
      });
      
      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "Password Reset Successful",
          description: "Your password has been reset successfully. You can now log in with your new password.",
          variant: "default"
        });
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      } else {
        const result = await response.json();
        toast({
          title: "Password Reset Failed",
          description: result.message || "Failed to reset your password. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Password reset error:", error);
      toast({
        title: "Password Reset Failed",
        description: "There was a problem resetting your password. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  // Redirect to home if user is already logged in
  if (user) {
    return <Redirect to="/" />;
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            {isVerifying 
              ? "Verifying your reset link..." 
              : isSuccess 
                ? "Your password has been reset successfully!" 
                : isTokenValid 
                  ? "Create a new password for your account." 
                  : "Invalid or expired reset link."}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isVerifying ? (
            <div className="flex justify-center my-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isSuccess ? (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                Your password has been reset successfully. Redirecting to login page...
              </AlertDescription>
            </Alert>
          ) : isTokenValid ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Enter new password"
                            type={showPassword ? "text" : "password"}
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Confirm new password"
                          type={showPassword ? "text" : "password"}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invalid Link</AlertTitle>
              <AlertDescription>
                The password reset link is invalid or has expired. Please request a new password reset link.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/auth")}>
              Back to Login
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}