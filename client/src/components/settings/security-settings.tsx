import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheckIcon, KeyIcon, AlertTriangleIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface SecuritySettingsProps {
  user: User | null;
}

export function SecuritySettings({ user }: SecuritySettingsProps) {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessionAlertsEnabled, setSessionAlertsEnabled] = useState(true);
  
  const handleChangePassword = () => {
    // Validation
    if (!currentPassword) {
      toast({
        title: "Current password required",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }
    
    if (!newPassword) {
      toast({
        title: "New password required",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }
    
    // Password strength validation
    if (newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    // In a real implementation, this would call an API endpoint
    toast({
      title: "Password Updated",
      description: "Your password has been changed successfully.",
    });
    
    // Clear form
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };
  
  const lastLogin = new Date().toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Security Settings</h2>
        <p className="text-muted-foreground">
          Manage your account security and authentication settings.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6">
        {/* Password Change Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <KeyIcon className="w-5 h-5 mr-2 text-purple-600" />
              Change Password
            </CardTitle>
            <CardDescription>
              It's a good idea to use a strong password that you don't use elsewhere.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>
            
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangleIcon className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800">Password Requirements</AlertTitle>
              <AlertDescription className="text-amber-700">
                <ul className="list-disc pl-5 text-sm">
                  <li>At least 8 characters long</li>
                  <li>Contains at least one uppercase letter</li>
                  <li>Contains at least one number</li>
                  <li>Contains at least one special character (e.g., !@#$%)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleChangePassword} className="bg-purple-600 hover:bg-purple-700">
              Update Password
            </Button>
          </CardFooter>
        </Card>
        
        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2 text-purple-600" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account with two-factor authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Enable Two-Factor Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Receive a verification code via email when signing in from a new device.
                </p>
              </div>
              <Switch
                checked={twoFactorEnabled}
                onCheckedChange={setTwoFactorEnabled}
                disabled
              />
            </div>
            
            {!twoFactorEnabled && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-700">
                  Two-factor authentication will be available in a future update. Stay tuned!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        
        {/* Session Information */}
        <Card>
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>
              Manage your active sessions and security notifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Current Session</h4>
              <p className="text-sm text-muted-foreground mb-2">
                You're currently logged in from this device.
              </p>
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <div className="text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Last login:</span>
                    <span className="font-medium">{lastLogin}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Browser:</span>
                    <span className="font-medium">{navigator.userAgent.split(" ").slice(-1)[0]}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Session Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for new login sessions.
                </p>
              </div>
              <Switch
                checked={sessionAlertsEnabled}
                onCheckedChange={setSessionAlertsEnabled}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" disabled>
              Sign Out All Devices
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}