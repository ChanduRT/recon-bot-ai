import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { 
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Key,
  Database,
  Save,
  RefreshCw
} from "lucide-react";

interface UserProfile {
  id: string;
  username: string;
  api_quota: number;
  role: string;
  created_at: string;
  updated_at: string;
}

interface SettingsData {
  notifications: {
    scanComplete: boolean;
    threatDetected: boolean;
    agentErrors: boolean;
    weeklyReport: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
    apiKeyRotation: boolean;
  };
  scanning: {
    autoAnalysis: boolean;
    maxConcurrentScans: number;
    retentionDays: number;
    defaultThreatLevel: string;
  };
}

const Settings = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      scanComplete: true,
      threatDetected: true,
      agentErrors: true,
      weeklyReport: false
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: 30,
      apiKeyRotation: false
    },
    scanning: {
      autoAnalysis: true,
      maxConcurrentScans: 5,
      retentionDays: 90,
      defaultThreatLevel: 'medium'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();
    loadSettings();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    }
  };

  const loadSettings = () => {
    // Load settings from localStorage or API in the future
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now, later can be saved to database
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async () => {
    if (!profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetApiQuota = async () => {
    if (!profile) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          api_quota: 100,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, api_quota: 100 } : null);

      toast({
        title: "Success",
        description: "API quota has been reset to 100",
      });
    } catch (error) {
      console.error('Error resetting quota:', error);
      toast({
        title: "Error",
        description: "Failed to reset API quota",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account preferences and security settings
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="scanning">Scanning</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile?.username || ''}
                      onChange={(e) => setProfile(prev => 
                        prev ? { ...prev, username: e.target.value } : null
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profile?.role || 'user'}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiQuota">API Quota</Label>
                    <div className="flex gap-2">
                      <Input
                        id="apiQuota"
                        value={profile?.api_quota || 0}
                        disabled
                      />
                      <Button onClick={resetApiQuota} variant="outline" size="sm">
                        Reset
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="created">Member Since</Label>
                    <Input
                      id="created"
                      value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
                      disabled
                    />
                  </div>
                </div>
                <Button onClick={updateProfile} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Scan Completion</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when reconnaissance scans complete
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.scanComplete}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, scanComplete: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Threat Detection</p>
                      <p className="text-sm text-muted-foreground">
                        Immediate alerts for high/critical threats
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.threatDetected}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, threatDetected: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Agent Errors</p>
                      <p className="text-sm text-muted-foreground">
                        Notifications when AI agents encounter errors
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.agentErrors}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, agentErrors: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Weekly Reports</p>
                      <p className="text-sm text-muted-foreground">
                        Weekly summary of security activities
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.weeklyReport}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, weeklyReport: checked }
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.twoFactorEnabled}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, twoFactorEnabled: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settings.security.sessionTimeout}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, sessionTimeout: parseInt(e.target.value) || 30 }
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Automatic API Key Rotation</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically rotate API keys monthly
                      </p>
                    </div>
                    <Switch
                      checked={settings.security.apiKeyRotation}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({
                          ...prev,
                          security: { ...prev.security, apiKeyRotation: checked }
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scanning" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Scanning Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Automatic AI Analysis</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically analyze scan results with AI agents
                      </p>
                    </div>
                    <Switch
                      checked={settings.scanning.autoAnalysis}
                      onCheckedChange={(checked) =>
                        setSettings(prev => ({
                          ...prev,
                          scanning: { ...prev.scanning, autoAnalysis: checked }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxScans">Maximum Concurrent Scans</Label>
                    <Input
                      id="maxScans"
                      type="number"
                      value={settings.scanning.maxConcurrentScans}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          scanning: { ...prev.scanning, maxConcurrentScans: parseInt(e.target.value) || 5 }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retention">Data Retention (days)</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={settings.scanning.retentionDays}
                      onChange={(e) =>
                        setSettings(prev => ({
                          ...prev,
                          scanning: { ...prev.scanning, retentionDays: parseInt(e.target.value) || 90 }
                        }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;