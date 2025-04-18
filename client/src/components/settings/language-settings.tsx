import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { GlobeIcon, CheckIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface LanguageSettingsProps {
  user: User | null;
}

export function LanguageSettings({ user }: LanguageSettingsProps) {
  const { toast } = useToast();
  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [timeFormat, setTimeFormat] = useState("12h");

  const handleSaveSettings = () => {
    // In a real implementation, this would call an API endpoint
    toast({
      title: "Language Settings Saved",
      description: "Your language and localization preferences have been updated successfully.",
    });
  };

  const languages = [
    { id: "en", name: "English", flag: "🇺🇸" },
    { id: "az", name: "Azərbaycan", flag: "🇦🇿" },
    { id: "ru", name: "Русский", flag: "🇷🇺" },
    { id: "tr", name: "Türkçe", flag: "🇹🇷" }
  ];

  const dateFormats = [
    { id: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "04/18/2025" },
    { id: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "18/04/2025" },
    { id: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2025-04-18" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Language & Region</h2>
        <p className="text-muted-foreground">
          Change language and localization preferences.
        </p>
      </div>
      
      <Separator />
      
      <div className="grid gap-6">
        {/* Language Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GlobeIcon className="w-5 h-5 mr-2 text-purple-600" />
              Language
            </CardTitle>
            <CardDescription>
              Select your preferred language for the application interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {languages.map((lang) => (
                <div
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={`flex items-center p-4 rounded-md border-2 cursor-pointer relative ${
                    language === lang.id ? 'border-purple-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl mr-3">{lang.flag}</span>
                  <span className="font-medium">{lang.name}</span>
                  {language === lang.id && (
                    <CheckIcon className="absolute right-4 h-5 w-5 text-purple-600" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Date & Time Format */}
        <Card>
          <CardHeader>
            <CardTitle>Date & Time Format</CardTitle>
            <CardDescription>
              Choose how dates and times are displayed throughout the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium mb-3">Date Format</h4>
              <RadioGroup value={dateFormat} onValueChange={setDateFormat} className="space-y-2">
                {dateFormats.map((format) => (
                  <div key={format.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={format.id} id={`date-${format.id}`} />
                    <Label htmlFor={`date-${format.id}`} className="font-normal">
                      {format.label}
                      <span className="text-sm text-muted-foreground ml-2">
                        (Example: {format.example})
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Time Format</h4>
              <RadioGroup value={timeFormat} onValueChange={setTimeFormat} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="12h" id="time-12h" />
                  <Label htmlFor="time-12h" className="font-normal">
                    12-hour
                    <span className="text-sm text-muted-foreground ml-2">
                      (Example: 2:30 PM)
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="24h" id="time-24h" />
                  <Label htmlFor="time-24h" className="font-normal">
                    24-hour
                    <span className="text-sm text-muted-foreground ml-2">
                      (Example: 14:30)
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button onClick={handleSaveSettings} className="bg-purple-600 hover:bg-purple-700">
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
        
        {/* Translation Info */}
        <Card>
          <CardHeader>
            <CardTitle>Translation Support</CardTitle>
            <CardDescription>
              Help improve translations for the ADA University Voting System.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-purple-50 rounded-md border border-purple-100">
              <h4 className="font-medium text-purple-800 mb-2">Contribute to Translations</h4>
              <p className="text-sm text-purple-700 mb-3">
                We're working to make the voting system available in multiple languages.
                If you notice any incorrect translations or would like to contribute,
                please contact the administration team.
              </p>
              <div className="mt-4">
                <Button variant="outline" className="bg-white border-purple-200 text-purple-700 hover:bg-purple-50">
                  Report Translation Issue
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}