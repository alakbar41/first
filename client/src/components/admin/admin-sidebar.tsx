import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart, 
  Users, 
  FileText, 
  Vote, 
  Settings, 
  LogOut,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Network,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: User | null;
}

export function AdminSidebar({ user }: SidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  const navigationItems = [
    {
      title: "Dashboard",
      icon: BarChart,
      path: "/admin",
      active: location === "/admin"
    },
    {
      title: "Elections",
      icon: Vote,
      path: "/admin/elections",
      active: location.includes("/admin/elections")
    },
    {
      title: "Candidates",
      icon: Users,
      path: "/admin/candidates",
      active: location.includes("/admin/candidates")
    },
    {
      title: "Tickets",
      icon: MessageSquare,
      path: "/admin/tickets",
      active: location.includes("/admin/tickets")
    },
    {
      title: "Voters",
      icon: FileText,
      path: "/admin/voters",
      active: location.includes("/admin/voters")
    },
    {
      title: "Architecture",
      icon: Network,
      path: "/admin-architecture",
      active: location === "/admin-architecture"
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/admin/settings",
      active: location.includes("/admin/settings")
    }
  ];

  return (
    <div 
      className={cn(
        "h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        expanded ? "w-64" : "w-20"
      )}
    >
      {/* Logo and toggle */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <img 
            src="/assets/ada-logo.svg" 
            alt="ADA Logo" 
            className="h-8 w-8"
            onError={(e) => {
              // Fallback to local logo instead of external image
              e.currentTarget.src = "/assets/logo.png";
            }}
          />
          {expanded && <span className="font-semibold text-purple-900">ADA Admin</span>}
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500"
        >
          {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </Button>
      </div>

      {/* User info */}
      <div className={cn(
        "p-4 border-b border-gray-100",
        !expanded && "flex justify-center"
      )}>
        {expanded ? (
          <div>
            <p className="font-medium text-sm text-gray-900 truncate">{user?.email}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-800 font-medium text-sm">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navigationItems.map((item, index) => (
            <li key={index}>
              <Link href={item.path}>
                <div
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium cursor-pointer",
                    item.active 
                      ? "bg-purple-50 text-purple-900" 
                      : "text-gray-700 hover:bg-gray-100",
                    !expanded && "justify-center"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5",
                    item.active ? "text-purple-900" : "text-gray-500",
                    expanded && "mr-3"
                  )} />
                  {expanded && <span>{item.title}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto">
        <Separator className="mb-4" />
        <Button
          variant="outline"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className={cn(
            "w-full justify-center border-gray-200",
            expanded && "justify-start"
          )}
        >
          <LogOut className={cn("h-5 w-5 text-gray-700", expanded && "mr-2")} />
          {expanded && <span>Logout</span>}
        </Button>
      </div>
    </div>
  );
}