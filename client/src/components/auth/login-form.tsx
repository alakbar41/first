import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Invalid email address").refine(
    (email) => email.endsWith('@ada.edu.az') || email.includes('@admin'),
    { message: "Students must use ADA University email" }
  ),
  password: z.string().min(1, "Password is required"),
  userType: z.enum(["student", "admin"])
});

export default function LoginForm() {
  const { loginMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      userType: "student"
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoginError("");
    try {
      await loginMutation.mutateAsync({
        email: values.email,
        password: values.password,
        isAdmin: values.userType === "admin"
      });
    } catch (error) {
      if (error instanceof Error) {
        setLoginError(error.message);
      } else {
        setLoginError("An unknown error occurred. Please try again.");
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <h2 className="font-heading font-semibold text-xl text-gray-800 mb-6">Sign in to your account</h2>
        
        {/* User Type Selection */}
        <FormField
          control={form.control}
          name="userType"
          render={({ field }) => (
            <FormItem className="mb-6">
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex items-center space-x-4"
              >
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="student" id="student" />
                  </FormControl>
                  <FormLabel htmlFor="student" className="text-gray-700">Student</FormLabel>
                </FormItem>
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <RadioGroupItem value="admin" id="admin" />
                  </FormControl>
                  <FormLabel htmlFor="admin" className="text-gray-700">Admin</FormLabel>
                </FormItem>
              </RadioGroup>
            </FormItem>
          )}
        />
        
        {/* Email Field */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-gray-700">Email Address</FormLabel>
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
                    placeholder="Enter your password"
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
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Error Alert */}
        {loginError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{loginError}</AlertDescription>
          </Alert>
        )}
        
        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full bg-[#005A9C] hover:bg-[#004A80]"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>
    </Form>
  );
}
