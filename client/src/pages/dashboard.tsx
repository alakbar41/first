import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogOut } from "lucide-react";

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
          <div className="flex items-center space-x-4">
            <div className="text-white text-sm hidden sm:block">
              {user?.email}
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="bg-[#004A80] hover:bg-[#2D4A70] text-white"
            >
              {logoutMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging out...
                </span>
              ) : (
                <span className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow container mx-auto px-4 py-12 bg-[#F8F9FA]">
        <Card className="max-w-4xl mx-auto p-8 bg-white shadow-lg">
          <CardContent className="pt-6">
            <h1 className="font-heading font-bold text-2xl text-gray-800 mb-6">Welcome to ADA University Voting System</h1>
            <p className="text-gray-600 mb-4">
              You have successfully logged in as {user?.isAdmin ? "an administrator" : "a student"}.
            </p>
            <p className="text-gray-500">
              This page is a placeholder for the voting system dashboard that will be implemented in future development phases.
            </p>
          </CardContent>
        </Card>
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
