import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { BellIcon, MailIcon, CalendarIcon, VoteIcon, AlertCircleIcon, MessageCircleIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface NotificationsSettingsProps {
  user: User | null;
}

export function NotificationsSettings({ user }: NotificationsSettingsProps) {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [electionStartNotifications, setElectionStartNotifications] = useState(true);
  const [electionEndNotifications, setElectionEndNotifications] = useState(true);
  const [voteConfirmationNotifications, setVoteConfirmationNotifications] = useState(true);
  const [resultsNotifications, setResultsNotifications] = useState(true);
  const [supportTicketNotifications, setSupportTicketNotifications] = useState(true);
  const [notificationFrequency, setNotificationFrequency] = useState("realtime");

  const handleSaveSettings = () => {
    // In a real implementation, this would call an API endpoint
    toast({
      title: "Notification Preferences Saved",
      description: "Your notification settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification Settings</h2>
        <p className="text-muted-foreground">
          Control how and when you receive notifications about elections and voting activities.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6">
        {/* Email Notification Master Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MailIcon className="w-5 h-5 mr-2 text-purple-600" />
              Email Notifications
            </CardTitle>
            <CardDescription>
              Receive email notifications for important election events and updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Enable Email Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Master toggle for all email notifications
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Select which events you want to be notified about.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-purple-600" />
                <div>
                  <h4 className="font-medium">Election Start</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified when an election starts
                  </p>
                </div>
              </div>
              <Switch
                checked={electionStartNotifications}
                onCheckedChange={setElectionStartNotifications}
                disabled={!emailNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CalendarIcon className="w-4 h-4 mr-2 text-purple-600" />
                <div>
                  <h4 className="font-medium">Election End Reminder</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive a reminder before an election ends
                  </p>
                </div>
              </div>
              <Switch
                checked={electionEndNotifications}
                onCheckedChange={setElectionEndNotifications}
                disabled={!emailNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <VoteIcon className="w-4 h-4 mr-2 text-purple-600" />
                <div>
                  <h4 className="font-medium">Vote Confirmation</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive confirmation after casting your vote
                  </p>
                </div>
              </div>
              <Switch
                checked={voteConfirmationNotifications}
                onCheckedChange={setVoteConfirmationNotifications}
                disabled={!emailNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircleIcon className="w-4 h-4 mr-2 text-purple-600" />
                <div>
                  <h4 className="font-medium">Results Announcement</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified when election results are announced
                  </p>
                </div>
              </div>
              <Switch
                checked={resultsNotifications}
                onCheckedChange={setResultsNotifications}
                disabled={!emailNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageCircleIcon className="w-4 h-4 mr-2 text-purple-600" />
                <div>
                  <h4 className="font-medium">Support Ticket Updates</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive updates on your support tickets
                  </p>
                </div>
              </div>
              <Switch
                checked={supportTicketNotifications}
                onCheckedChange={setSupportTicketNotifications}
                disabled={!emailNotifications}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Notification Frequency */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Frequency</CardTitle>
            <CardDescription>
              Control how often you receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={notificationFrequency} onValueChange={setNotificationFrequency} disabled={!emailNotifications}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="realtime" id="realtime" />
                <Label htmlFor="realtime" className="font-normal">Real-time</Label>
                <span className="text-sm text-muted-foreground ml-2">
                  Receive notifications immediately when events occur
                </span>
              </div>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="font-normal">Daily Digest</Label>
                <span className="text-sm text-muted-foreground ml-2">
                  Receive a daily summary of all notifications
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weekly" id="weekly" />
                <Label htmlFor="weekly" className="font-normal">Weekly Digest</Label>
                <span className="text-sm text-muted-foreground ml-2">
                  Receive a weekly summary of all notifications
                </span>
              </div>
            </RadioGroup>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSaveSettings} className="bg-purple-600 hover:bg-purple-700">
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}