import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { ProfileSettings } from "@/components/settings/profile-settings";
import { SecuritySettings } from "@/components/settings/security-settings";
import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { PrivacySettings } from "@/components/settings/privacy-settings";
import { LanguageSettings } from "@/components/settings/language-settings";
import { useRedirectUnauthenticated } from "@/hooks/use-auth";

export function SettingsPage() {
  useRedirectUnauthenticated();
  const [activeSetting, setActiveSetting] = useState("profile");
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
  });
  
  // Render the appropriate settings component based on the active setting
  const renderSettingsContent = () => {
    switch (activeSetting) {
      case "profile":
        return <ProfileSettings user={user} />;
      case "security":
        return <SecuritySettings user={user} />;
      case "notifications":
        return <NotificationsSettings user={user} />;
      case "appearance":
        return <AppearanceSettings user={user} />;
      case "privacy":
        return <PrivacySettings user={user} />;
      case "language":
        return <LanguageSettings user={user} />;
      default:
        return <ProfileSettings user={user} />;
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
        user={user}
        activeSetting={activeSetting}
        setActiveSetting={setActiveSetting}
      />
      
      <main className="flex-1 overflow-y-auto bg-white p-8">
        {renderSettingsContent()}
      </main>
    </div>
  );
}