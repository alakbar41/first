import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/use-theme";
import { 
  SunIcon, 
  MoonIcon, 
  MonitorIcon, 
  PaletteIcon, 
  ContrastIcon, 
  SparklesIcon,
  CheckIcon
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AppearanceSettingsProps {
  user: User | null;
}

export function AppearanceSettings({ user }: AppearanceSettingsProps) {
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [colorScheme, setColorScheme] = useState("purple");
  const [fontSize, setFontSize] = useState(16);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [selectedTab, setSelectedTab] = useState("theme");

  const handleSaveSettings = () => {
    // In a real implementation, this would call an API endpoint
    toast({
      title: "Appearance Settings Saved",
      description: "Your appearance preferences have been updated successfully.",
    });
  };

  const colorSchemes = [
    { id: "purple", name: "Purple", color: "#8B5CF6" },
    { id: "blue", name: "Blue", color: "#3B82F6" },
    { id: "green", name: "Green", color: "#10B981" },
    { id: "red", name: "Red", color: "#EF4444" },
    { id: "amber", name: "Amber", color: "#F59E0B" },
    { id: "pink", name: "Pink", color: "#EC4899" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Appearance Settings</h2>
        <p className="text-muted-foreground">
          Customize how the ADA University Voting System looks and feels.
        </p>
      </div>
      
      <Separator />
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid grid-cols-2 w-[400px] mb-6">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="color">Color & Typography</TabsTrigger>
        </TabsList>
        
        <TabsContent value="theme" className="space-y-6">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ContrastIcon className="w-5 h-5 mr-2 text-purple-600" />
                Theme Mode
              </CardTitle>
              <CardDescription>
                Choose between light and dark theme, or use your system preference.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={theme} 
                onValueChange={setTheme} 
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem value="light" id="light" className="sr-only" />
                  <Label 
                    htmlFor="light" 
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'light' ? 'border-purple-600' : ''}`}
                  >
                    <SunIcon className="mb-3 h-6 w-6 text-amber-500" />
                    <div className="mb-3 rounded-md bg-white p-2 shadow w-full h-20 relative">
                      <div className="absolute top-2 left-2 w-6 h-2 bg-gray-200 rounded"></div>
                      <div className="absolute top-6 left-2 w-8 h-2 bg-gray-200 rounded"></div>
                      <div className="absolute top-10 left-2 w-10 h-2 bg-gray-200 rounded"></div>
                      <div className="absolute top-14 left-2 w-8 h-2 bg-gray-200 rounded"></div>
                    </div>
                    <span className="font-medium">Light</span>
                    {theme === 'light' && (
                      <CheckIcon className="absolute top-2 right-2 h-4 w-4 text-purple-600" />
                    )}
                  </Label>
                </div>
                
                <div>
                  <RadioGroupItem value="dark" id="dark" className="sr-only" />
                  <Label 
                    htmlFor="dark" 
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'dark' ? 'border-purple-600' : ''}`}
                  >
                    <MoonIcon className="mb-3 h-6 w-6 text-indigo-400" />
                    <div className="mb-3 rounded-md bg-gray-900 p-2 shadow-sm w-full h-20 relative">
                      <div className="absolute top-2 left-2 w-6 h-2 bg-gray-700 rounded"></div>
                      <div className="absolute top-6 left-2 w-8 h-2 bg-gray-700 rounded"></div>
                      <div className="absolute top-10 left-2 w-10 h-2 bg-gray-700 rounded"></div>
                      <div className="absolute top-14 left-2 w-8 h-2 bg-gray-700 rounded"></div>
                    </div>
                    <span className="font-medium">Dark</span>
                    {theme === 'dark' && (
                      <CheckIcon className="absolute top-2 right-2 h-4 w-4 text-purple-600" />
                    )}
                  </Label>
                </div>
                
                <div>
                  <RadioGroupItem value="system" id="system" className="sr-only" />
                  <Label 
                    htmlFor="system" 
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${theme === 'system' ? 'border-purple-600' : ''}`}
                  >
                    <MonitorIcon className="mb-3 h-6 w-6 text-blue-500" />
                    <div className="mb-3 rounded-md bg-gradient-to-r from-white to-gray-900 p-2 shadow-sm w-full h-20 relative">
                      <div className="absolute top-2 left-2 w-6 h-2 bg-gray-400 rounded"></div>
                      <div className="absolute top-6 left-2 w-8 h-2 bg-gray-400 rounded"></div>
                      <div className="absolute top-10 left-2 w-10 h-2 bg-gray-400 rounded"></div>
                      <div className="absolute top-14 left-2 w-8 h-2 bg-gray-400 rounded"></div>
                    </div>
                    <span className="font-medium">System</span>
                    {theme === 'system' && (
                      <CheckIcon className="absolute top-2 right-2 h-4 w-4 text-purple-600" />
                    )}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
          
          {/* Animations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SparklesIcon className="w-5 h-5 mr-2 text-purple-600" />
                Animation Settings
              </CardTitle>
              <CardDescription>
                Control the use of animations throughout the interface.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={animationsEnabled ? "enabled" : "reduced"} 
                onValueChange={(value) => setAnimationsEnabled(value === "enabled")}
              >
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="enabled" id="animations-enabled" />
                  <Label htmlFor="animations-enabled" className="font-normal">Full Animations</Label>
                  <span className="text-sm text-muted-foreground ml-2">
                    Enable all animations and transitions
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reduced" id="animations-reduced" />
                  <Label htmlFor="animations-reduced" className="font-normal">Reduced Animations</Label>
                  <span className="text-sm text-muted-foreground ml-2">
                    Reduce or disable animations for improved performance and accessibility
                  </span>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="color" className="space-y-6">
          {/* Color Scheme */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PaletteIcon className="w-5 h-5 mr-2 text-purple-600" />
                Color Scheme
              </CardTitle>
              <CardDescription>
                Select a color scheme for the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {colorSchemes.map((scheme) => (
                  <div
                    key={scheme.id}
                    onClick={() => setColorScheme(scheme.id)}
                    className={`rounded-md border-2 p-4 cursor-pointer flex flex-col items-center transition-all ${
                      colorScheme === scheme.id ? 'border-purple-600' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full mb-2"
                      style={{ backgroundColor: scheme.color }}
                    />
                    <span className="font-medium">{scheme.name}</span>
                    {colorScheme === scheme.id && (
                      <CheckIcon className="absolute top-2 right-2 h-4 w-4 text-purple-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Font Size */}
          <Card>
            <CardHeader>
              <CardTitle>Text Size</CardTitle>
              <CardDescription>
                Adjust the size of text throughout the application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Small</span>
                    <span className="text-sm">Large</span>
                  </div>
                  <Slider
                    value={[fontSize]}
                    min={12}
                    max={20}
                    step={1}
                    onValueChange={(value) => setFontSize(value[0])}
                    className="w-full"
                  />
                </div>
                
                <div className="p-4 border rounded-md">
                  <h4 className="font-semibold mb-2" style={{ fontSize: `${fontSize}px` }}>
                    Sample Text
                  </h4>
                  <p className="text-gray-600" style={{ fontSize: `${fontSize - 2}px` }}>
                    This is an example of how text will appear throughout the application.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setFontSize(16)} 
                className="mr-2"
              >
                Reset to Default
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button onClick={handleSaveSettings} className="bg-purple-600 hover:bg-purple-700">
          Save Settings
        </Button>
      </div>
    </div>
  );
}