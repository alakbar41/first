import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ShieldIcon, LockIcon, CameraIcon, UserIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PrivacySettingsProps {
  user: User | null;
}

export function PrivacySettings({ user }: PrivacySettingsProps) {
  const { toast } = useToast();
  const [profileVisibility, setProfileVisibility] = useState(true);
  const [voteHistoryVisible, setVoteHistoryVisible] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);

  const handleSaveSettings = () => {
    // In a real implementation, this would call an API endpoint
    toast({
      title: "Privacy Settings Saved",
      description: "Your privacy preferences have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Privacy Settings</h2>
        <p className="text-muted-foreground">
          Manage your privacy preferences and data settings.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6">
        {/* Profile Visibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-purple-600" />
              Profile Visibility
            </CardTitle>
            <CardDescription>
              Control who can see your profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Public Profile</h4>
                <p className="text-sm text-muted-foreground">
                  Make your profile visible to other university students
                </p>
              </div>
              <Switch
                checked={profileVisibility}
                onCheckedChange={setProfileVisibility}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Voting History</h4>
                <p className="text-sm text-muted-foreground">
                  Allow others to see which elections you've participated in
                </p>
              </div>
              <Switch
                checked={voteHistoryVisible}
                onCheckedChange={setVoteHistoryVisible}
              />
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-700">
                Your specific vote choices are always private and secured by blockchain technology.
                This setting only controls whether others can see which elections you've participated in.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        
        {/* Data Collection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldIcon className="w-5 h-5 mr-2 text-purple-600" />
              Data Collection & Usage
            </CardTitle>
            <CardDescription>
              Control how your data is collected and used.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Usage Analytics</h4>
                <p className="text-sm text-muted-foreground">
                  Allow anonymous usage data collection to help improve the platform
                </p>
              </div>
              <Switch
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Data Sharing</h4>
                <p className="text-sm text-muted-foreground">
                  Allow sharing anonymized data with third parties for research purposes
                </p>
              </div>
              <Switch
                checked={dataSharing}
                onCheckedChange={setDataSharing}
              />
            </div>
            
            <div className="mt-2">
              <h4 className="font-medium mb-2">Your Data Rights</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center">
                  <LockIcon className="w-4 h-4 mr-2 text-purple-600" />
                  Right to access your personal data
                </li>
                <li className="flex items-center">
                  <EyeIcon className="w-4 h-4 mr-2 text-purple-600" />
                  Right to know how your data is being used
                </li>
                <li className="flex items-center">
                  <EyeOffIcon className="w-4 h-4 mr-2 text-purple-600" />
                  Right to be forgotten (data deletion)
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
              Request Data Export
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
        
        {/* Blockchain & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CameraIcon className="w-5 h-5 mr-2 text-purple-600" />
              Blockchain Privacy
            </CardTitle>
            <CardDescription>
              Information about how your voting data is secured on the blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-purple-50 rounded-md border border-purple-100">
              <h4 className="font-medium text-purple-800 mb-2">Blockchain Privacy Information</h4>
              <p className="text-sm text-purple-700 mb-3">
                The ADA University Voting System uses Ethereum Sepolia blockchain technology
                to ensure the integrity and anonymity of your votes.
              </p>
              <ul className="space-y-2 text-sm text-purple-700">
                <li className="flex items-start">
                  <div className="min-w-4 min-h-4 w-4 h-4 mr-2 mt-0.5 rounded-full bg-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>Your vote choices are stored securely on the blockchain</span>
                </li>
                <li className="flex items-start">
                  <div className="min-w-4 min-h-4 w-4 h-4 mr-2 mt-0.5 rounded-full bg-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>Your identity is not linked to your vote on the blockchain</span>
                </li>
                <li className="flex items-start">
                  <div className="min-w-4 min-h-4 w-4 h-4 mr-2 mt-0.5 rounded-full bg-purple-600 flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span>Only you can verify your own votes using your personal voting token</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}