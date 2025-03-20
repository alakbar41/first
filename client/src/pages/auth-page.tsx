import { useAuth } from "@/hooks/use-auth";
import { Redirect, Link } from "wouter";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isAdmin: z.boolean().optional()
});

export default function AuthPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    await loginMutation.mutate({
      email: values.email,
      password: values.password,
      isAdmin
    });
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

        {/* Login Heading */}
        <h1 className="text-2xl font-bold mb-2 text-center">Log In to Decentralized</h1>
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
                onClick={() => {}}
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
    </div>
  );
}
