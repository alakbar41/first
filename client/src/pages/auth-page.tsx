import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect to dashboard if already logged in
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#005A9C] shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <img 
              src="https://ada.edu.az/wp-content/uploads/2021/02/ADA_ED_LOGO_E_H1.png" 
              alt="ADA University Logo" 
              className="h-10"
            />
            <h1 className="text-white font-heading font-bold text-xl hidden md:block">Voting System</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow flex items-center justify-center px-4 py-12 bg-[#F8F9FA]">
        <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8">
          {/* Auth Form */}
          <Card className="overflow-hidden bg-white shadow-lg">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger 
                  value="login"
                  className="font-medium py-3 px-4 data-[state=active]:bg-[#005A9C] data-[state=active]:text-white"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="font-medium py-3 px-4 data-[state=active]:bg-[#005A9C] data-[state=active]:text-white"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="p-6">
                <LoginForm />
              </TabsContent>
              
              <TabsContent value="register" className="p-6">
                <RegisterForm onSuccess={() => setActiveTab("login")} />
              </TabsContent>
            </Tabs>
          </Card>

          {/* Hero Section */}
          <div className="flex flex-col justify-center bg-[#3D5A80] text-white p-10 rounded-lg shadow-lg hidden md:flex">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4 font-heading">ADA University Voting System</h2>
              <p className="text-gray-100 mb-6">
                Your secure platform for university elections. Register with your university email to participate in votes that shape our community.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Secure ADA University authentication
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Email verification for student safety
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  Easy participation in campus elections
                </li>
              </ul>
            </div>
            <div className="mt-auto text-sm text-gray-300">
              &copy; {new Date().getFullYear()} ADA University Voting System
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#E9ECEF] border-t border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center text-[#6C757D] text-sm">
            &copy; {new Date().getFullYear()} ADA University Voting System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
