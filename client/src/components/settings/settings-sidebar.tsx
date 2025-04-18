import { 
  UserIcon, 
  KeyIcon, 
  BellIcon, 
  PaletteIcon, 
  ShieldIcon, 
  GlobeIcon,
  ArrowLeftIcon,
  SunIcon,
  MoonIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getFacultyName } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTheme } from "@/hooks/use-theme";

interface SettingsSidebarProps {
  user: User | null;
  activeSetting: string;
  setActiveSetting: (setting: string) => void;
}

export function SettingsSidebar({ user, activeSetting, setActiveSetting }: SettingsSidebarProps) {
  const [, navigate] = useLocation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
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

  const isActive = (setting: string) => {
    return activeSetting === setting;
  };

  const settings = [
    { 
      id: 'profile', 
      name: 'Profile', 
      icon: <UserIcon className="w-5 h-5 mr-3" />, 
      description: 'Manage your personal information'
    },
    { 
      id: 'security', 
      name: 'Security', 
      icon: <KeyIcon className="w-5 h-5 mr-3" />, 
      description: 'Update password and security settings'
    },
    { 
      id: 'notifications', 
      name: 'Notifications', 
      icon: <BellIcon className="w-5 h-5 mr-3" />, 
      description: 'Configure email notifications'
    },
    { 
      id: 'appearance', 
      name: 'Appearance', 
      icon: <PaletteIcon className="w-5 h-5 mr-3" />, 
      description: 'Customize theme and appearance'
    },
    { 
      id: 'privacy', 
      name: 'Privacy', 
      icon: <ShieldIcon className="w-5 h-5 mr-3" />, 
      description: 'Manage your privacy preferences'
    },
    { 
      id: 'language', 
      name: 'Language', 
      icon: <GlobeIcon className="w-5 h-5 mr-3" />, 
      description: 'Change language settings'
    }
  ];

  return (
    <div className="w-64 bg-card border-r border-border h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-800 to-purple-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            title="Back to Dashboard"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* User info */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <Avatar className="bg-primary/10 shadow-sm border border-border">
            <AvatarFallback className="text-primary font-semibold">
              {getInitials(user?.email)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground truncate max-w-[160px]">
              {user?.email?.split('@')[0]}
            </p>
            <p className="text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
      </div>
      
      {/* Settings navigation */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <nav className="space-y-1">
            {settings.map((setting) => (
              <div
                key={setting.id}
                onClick={() => setActiveSetting(setting.id)}
                className={`flex items-center px-4 py-2.5 rounded-lg cursor-pointer ${
                  isActive(setting.id) 
                    ? 'bg-primary/10 text-primary font-medium shadow-sm' 
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                {setting.icon}
                <span>{setting.name}</span>
                {isActive(setting.id) && (
                  <div className="ml-auto w-1.5 h-6 rounded-full bg-purple-600" />
                )}
              </div>
            ))}
          </nav>
        </div>
      </ScrollArea>
      
      {/* Theme Toggle */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <SunIcon className={`w-4 h-4 mr-2 ${resolvedTheme === 'light' ? 'text-amber-500' : 'text-muted-foreground'}`} />
            <span className={`text-sm ${resolvedTheme === 'light' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Light</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <span className="sr-only">Toggle theme</span>
            <div className="h-4 w-8 rounded-full bg-primary relative">
              <div 
                className={`h-3 w-3 rounded-full bg-white absolute top-0.5 transition-all ${
                  resolvedTheme === 'dark' ? 'left-[calc(100%-14px)]' : 'left-0.5'
                }`} 
              />
            </div>
          </Button>
          <div className="flex items-center">
            <span className={`text-sm ${resolvedTheme === 'dark' ? 'text-foreground font-medium' : 'text-muted-foreground'} mr-2`}>Dark</span>
            <MoonIcon className={`w-4 h-4 ${resolvedTheme === 'dark' ? 'text-indigo-400' : 'text-muted-foreground'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}