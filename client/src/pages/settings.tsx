import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { LanguageSettings } from "@/components/settings/language-settings";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { User } from "@shared/schema";

export function SettingsPage() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [activeSetting, setActiveSetting] = useState("profile");
  
  // Redirect if not authenticated
  if (!authLoading && !authUser) {
    return <Redirect to="/auth" />;
  }
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
  });
  
  // Render the appropriate settings component based on the active setting
  const renderSettingsContent = () => {
    switch (activeSetting) {
      case "profile":
        return <ProfileSettings user={user as User | null} />;
      case "security":
        return <SecuritySettings user={user as User | null} />;
      case "notifications":
        return <NotificationsSettings user={user as User | null} />;
      case "appearance":
        return <AppearanceSettings user={user as User | null} />;
      case "privacy":
        return <PrivacySettings user={user as User | null} />;
      case "language":
        return <LanguageSettings user={user as User | null} />;
      default:
        return <ProfileSettings user={user as User | null} />;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <SettingsSidebar
        user={user || null}
        activeSetting={activeSetting}
        setActiveSetting={setActiveSetting}
      />
      
      <main className="flex-1 overflow-y-auto bg-white p-8">
        {renderSettingsContent()}
      </main>
    </div>
  );
}