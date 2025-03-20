import { Link, useLocation } from "wouter";
import { LayoutDashboard, Vote, Users, FileText, Settings, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { User } from "@shared/schema";

interface SidebarProps {
  user: User | null;
}

export function AdminSidebar({ user }: SidebarProps) {
  const [location] = useLocation();

  const menuItems = [
    {
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
      href: "/admin",
      active: location === "/admin"
    },
    {
      icon: <Vote className="h-5 w-5" />,
      label: "Elections",
      href: "/admin/elections",
      active: location === "/admin/elections"
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Candidates",
      href: "/admin/candidates",
      active: location === "/admin/candidates"
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Voters",
      href: "/admin/voters",
      active: location === "/admin/voters"
    },
  ];

  const settingsItems = [
    {
      icon: <Settings className="h-5 w-5" />,
      label: "Main Settings",
      href: "/admin/settings",
      active: location === "/admin/settings"
    },
    {
      icon: <Bell className="h-5 w-5" />,
      label: "Notifications",
      href: "/admin/notifications",
      active: location === "/admin/notifications"
    },
  ];

  if (!user) return null;

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 truncate max-w-[180px]">
              {user.email.split('@')[0]}
            </h3>
            <div className="text-sm text-gray-500 truncate max-w-[180px]">
              {user.email}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto pt-5 pb-4">
        <nav className="px-2 space-y-1">
          {menuItems.map((item) => (
            <Link href={item.href} key={item.href}>
              <a
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                  item.active 
                    ? "bg-purple-100 text-purple-700" 
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <span className={cn(
                  "mr-3",
                  item.active ? "text-purple-700" : "text-gray-500"
                )}>
                  {item.icon}
                </span>
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
        
        <div className="mt-8">
          <h3 className="px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Settings
          </h3>
          <nav className="mt-1 px-2 space-y-1">
            {settingsItems.map((item) => (
              <Link href={item.href} key={item.href}>
                <a
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    item.active 
                      ? "bg-purple-100 text-purple-700" 
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <span className={cn(
                    "mr-3",
                    item.active ? "text-purple-700" : "text-gray-500"
                  )}>
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}