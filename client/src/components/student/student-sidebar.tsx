import { ChartBarIcon, CheckSquareIcon, FileTextIcon, HomeIcon, LogOutIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  user: User | null;
}

export function StudentSidebar({ user }: SidebarProps) {
  const { logoutMutation } = useAuth();
  const [location] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      {/* Logo and title */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <img 
            src="/ada-logo.png" 
            alt="ADA University Logo" 
            className="w-10 h-10 mr-3"
          />
          <h1 className="text-xl font-bold text-purple-800">
            ADA Vote
          </h1>
        </div>
      </div>
      
      {/* User info */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-700 font-semibold">
              {user?.email.substring(0, 1).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-800 truncate max-w-[160px]">
              {user?.email.split('@')[0]}
            </p>
            <p className="text-sm text-gray-500">
              {user?.faculty}
            </p>
          </div>
        </div>
      </div>
      
      {/* Navigation links */}
      <nav className="flex-1 p-4 space-y-1">
        <Link href="/">
          <a className={`flex items-center px-4 py-2.5 rounded-md ${
            isActive('/') 
              ? 'bg-purple-50 text-purple-700' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}>
            <HomeIcon className="w-5 h-5 mr-3" />
            <span>Elections</span>
          </a>
        </Link>
        
        <Link href="/results">
          <a className={`flex items-center px-4 py-2.5 rounded-md ${
            isActive('/results') 
              ? 'bg-purple-50 text-purple-700' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}>
            <ChartBarIcon className="w-5 h-5 mr-3" />
            <span>Results</span>
          </a>
        </Link>
        
        <Link href="/guidelines">
          <a className={`flex items-center px-4 py-2.5 rounded-md ${
            isActive('/guidelines') 
              ? 'bg-purple-50 text-purple-700' 
              : 'text-gray-700 hover:bg-gray-100'
          }`}>
            <FileTextIcon className="w-5 h-5 mr-3" />
            <span>Guidelines</span>
          </a>
        </Link>
      </nav>
      
      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          onClick={handleLogout}
          variant="ghost"
          className="flex items-center w-full text-gray-700"
        >
          <LogOutIcon className="w-5 h-5 mr-3" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}