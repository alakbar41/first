import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ResetPasswordModal } from "@/components/auth/reset-password-modal";

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  isAdmin: z.boolean().optional()
});

export default function AuthPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [, navigate] = useLocation();

  // Form setup
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      isAdmin: false
    }
  });

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    // Include isAdmin flag in login data
    console.log("Login with:", { email: values.email, password: values.password, isAdmin });
    await loginMutation.mutate({
      email: values.email,
      password: values.password,
      isAdmin
    });
  };

  // Redirect to appropriate dashboard if already logged in
  if (!isLoading && user) {
    if (user.isAdmin) {
      return <Redirect to="/admin" />;
    } else {
      return <Redirect to="/" />;
    }
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

        {/* Login Heading */}
        <h1 className="text-2xl font-bold mb-2 text-center">Log In to UniVote</h1>
        <p className="text-gray-500 mb-6 text-center">Enter your email and password below</p>

        {/* Login Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium uppercase">EMAIL</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email address"
              className="auth-input"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password" className="text-sm font-medium uppercase">PASSWORD</Label>
              <Button 
                type="button" 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={() => setResetPasswordOpen(true)}
              >
                Forgot password?
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
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

          <div className="flex items-center">
            <input 
              type="checkbox" 
              id="isAdmin" 
              className="rounded border-gray-300 text-primary focus:ring-primary/50 mr-2"
              checked={isAdmin}
              onChange={() => setIsAdmin(!isAdmin)}
            />
            <Label htmlFor="isAdmin" className="text-sm">Login as Administrator</Label>
          </div>

          <Button 
            type="submit"
            className="auth-button"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Logging in..." : "Log In"}
          </Button>
          
          <div className="text-center text-sm">
            Don't have an account? <Button variant="link" className="auth-link p-0 h-auto" onClick={() => navigate("/register")}>Sign up</Button>
          </div>
        </form>
      </div>
      
      {/* Reset Password Modal */}
      <ResetPasswordModal 
        open={resetPasswordOpen}
        onOpenChange={setResetPasswordOpen}
      />
    </div>
  );
}
