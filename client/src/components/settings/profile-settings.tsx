import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFacultyName } from "@shared/schema";

interface ProfileSettingsProps {
  user: User | null;
}

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState<string>(user?.email?.split("@")[0] || "");
  const [bio, setBio] = useState<string>("");
  const [faculty, setFaculty] = useState<string>(user?.faculty || "");

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

  const handleSaveProfile = () => {
    // In a real implementation, this would send data to the server
    toast({
      title: "Profile Updated",
      description: "Your profile information has been saved successfully.",
      variant: "default",
    });
  };

  const faculties = [
    { value: "SITE", label: "School of IT and Engineering" },
    { value: "SPIA", label: "School of Public and International Affairs" },
    { value: "SOBS", label: "School of Business" },
    { value: "SEDU", label: "School of Education" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Manage your account details and preferences.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6 grid-cols-1">
        {/* General Information */}
        <Card className="col-span-6">
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Update your basic profile information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                placeholder="Email address"
              />
              <p className="text-sm text-muted-foreground">
                Your ADA University email address cannot be changed.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you want to be addressed"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="faculty">Faculty/School</Label>
              <Select
                value={faculty}
                onValueChange={setFaculty}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((faculty) => (
                    <SelectItem key={faculty.value} value={faculty.value}>
                      {faculty.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Your faculty is set by the administrator and cannot be changed.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell others about yourself..."
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSaveProfile} className="bg-purple-600 hover:bg-purple-700">
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}