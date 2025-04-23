import { 
  ChartBarIcon, 
  CheckSquareIcon, 
  FileTextIcon, 
  HomeIcon, 
  LogOutIcon, 
  GraduationCapIcon,
  ExternalLinkIcon,
  VoteIcon,
  UserIcon,
  SearchIcon,
  ClipboardCheckIcon,
  MessageSquare
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getFacultyName } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  const getInitials = (email?: string) => {
    if (!email) return 'U';
    
    // Get username part (before @)
    const username = email.split('@')[0];
    
    // If it contains dots or underscores, get initials from parts
    if (username.includes('.') || username.includes('_')) {
      const parts = username.split(/[._]/);
      return parts.map(part => part[0]?.toUpperCase() || '').slice(0, 2).join('');
    }
    
    // Otherwise return first 2 letters (or 1 if only 1 character)
    return username.substring(0, Math.min(2, username.length)).toUpperCase();
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col shadow-sm">
      {/* Logo and title */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <img 
            src="/assets/univote_logo.png" 
            alt="UniVote Logo" 
            className="w-20 h-20"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.src = "/assets/ada-logo.svg";
            }}
          />
        </div>
      </div>
      
      {/* User info */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="bg-purple-100 shadow-sm border border-purple-200">
            <AvatarFallback className="text-purple-700 font-semibold">
              {getInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-800 truncate max-w-[160px]">
              {user?.email?.split('@')[0]}
            </p>
            <div className="flex items-center mt-0.5">
              <Badge variant="outline" className="text-xs px-1.5 bg-purple-50 border-purple-200 text-purple-700">
                {user?.faculty ? getFacultyName(user.faculty) : 'Student'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation links */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-4 mb-2">
            Main Menu
          </p>
          
          <nav className="space-y-1">
            <Link to="/">
              <span className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer ${
                isActive('/') 
                  ? 'bg-purple-100 text-purple-800 font-medium shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <HomeIcon className="w-5 h-5 mr-3" />
                <span>Elections</span>
                {isActive('/') && (
                  <div className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
                )}
              </span>
            </Link>
            
            <Link to="/results">
              <span className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer ${
                isActive('/results') 
                  ? 'bg-purple-100 text-purple-800 font-medium shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <ChartBarIcon className="w-5 h-5 mr-3" />
                <span>Results</span>
                {isActive('/results') && (
                  <div className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
                )}
              </span>
            </Link>
            
            <Link to="/guidelines">
              <span className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer ${
                isActive('/guidelines') 
                  ? 'bg-purple-100 text-purple-800 font-medium shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <FileTextIcon className="w-5 h-5 mr-3" />
                <span>Guidelines</span>
                {isActive('/guidelines') && (
                  <div className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
                )}
              </span>
            </Link>
            
            <Link to="/tickets">
              <span className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer ${
                isActive('/tickets') 
                  ? 'bg-purple-100 text-purple-800 font-medium shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <MessageSquare className="w-5 h-5 mr-3" />
                <span>Support Tickets</span>
                {isActive('/tickets') && (
                  <div className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
                )}
              </span>
            </Link>
            
            <Link to="/settings">
              <span className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer ${
                isActive('/settings') 
                  ? 'bg-purple-100 text-purple-800 font-medium shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <UserIcon className="w-5 h-5 mr-3" />
                <span>Settings</span>
                {isActive('/settings') && (
                  <div className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
                )}
              </span>
            </Link>
          </nav>
          
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider px-4 mt-6 mb-2">
            Resources
          </p>
          
          <nav className="space-y-1">
            <a 
              href="https://www.ada.edu.az" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100"
            >
              <GraduationCapIcon className="w-5 h-5 mr-3" />
              <span>ADA University</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 ml-auto opacity-70" />
            </a>
            
            <Link to="/verify-vote">
              <span className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer ${
                isActive('/verify-vote') 
                  ? 'bg-purple-100 text-purple-800 font-medium shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}>
                <SearchIcon className="w-5 h-5 mr-3" />
                <span>Verify Your Vote</span>
                {isActive('/verify-vote') && (
                  <div className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
                )}
              </span>
            </Link>
            
            <div className="mt-1 px-4 py-3 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-start mb-2">
                <ClipboardCheckIcon className="w-5 h-5 mr-2 text-purple-700 mt-0.5 flex-shrink-0" />
                <h3 className="font-medium text-purple-800">Blockchain Verification</h3>
              </div>
              <p className="text-xs text-purple-700 leading-relaxed mb-2">
                After voting, you'll receive an email with your transaction hash. 
                This provides proof that your vote is securely recorded on the blockchain.
              </p>
              <p className="text-xs text-purple-700 leading-relaxed">
                Click "Verify Your Vote" to access our verification tool where you can
                check your vote's status on the Ethereum Sepolia blockchain.
              </p>
            </div>
          </nav>
        </div>
      </ScrollArea>
      
      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <Button 
          onClick={handleLogout}
          variant="outline"
          className="flex items-center w-full text-gray-700 border-gray-300"
        >
          <LogOutIcon className="w-4 h-4 mr-2" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}