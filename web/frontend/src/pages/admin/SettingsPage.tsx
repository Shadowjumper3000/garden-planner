import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { useToast } from '../../components/ui/use-toast';
import { adminAPI } from '../../api';

const SettingsPage = () => {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Metric generation settings
  const [generateDailyMetrics, setGenerateDailyMetrics] = useState(true);
  const [metricRetentionDays, setMetricRetentionDays] = useState('90');
  const [isGeneratingMetrics, setIsGeneratingMetrics] = useState(false);

  const handleSaveMetricSettings = async () => {
    try {
      setIsSaving(true);
      // This would normally update settings on the backend
      
      toast({
        title: 'Settings Saved',
        description: 'Your metrics settings have been updated successfully.',
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateMetrics = async () => {
    try {
      setIsGeneratingMetrics(true);
      await adminAPI.generateDailyMetrics();
      toast({
        title: 'Metrics Generated',
        description: 'Daily metrics have been successfully generated.',
      });
    } catch (err) {
      console.error('Failed to generate metrics:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate metrics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingMetrics(false);
    }
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Settings</h1>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Metrics & Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        {/* Metrics & Analytics Settings */}
        <TabsContent value="metrics">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Metrics Settings</CardTitle>
                <CardDescription>
                  Configure how metrics are collected and processed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="daily-metrics">Generate Daily Metrics</Label>
                    <p className="text-sm text-slate-500">
                      Automatically aggregate user activity metrics daily
                    </p>
                  </div>
                  <Switch 
                    id="daily-metrics" 
                    checked={generateDailyMetrics} 
                    onCheckedChange={setGenerateDailyMetrics} 
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="metric-retention">Metric Retention (days)</Label>
                  <Input 
                    id="metric-retention"
                    type="number"
                    min="1"
                    value={metricRetentionDays}
                    onChange={(e) => setMetricRetentionDays(e.target.value)}
                  />
                  <p className="text-xs text-slate-500">
                    Number of days to keep detailed user activity records
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Reset to Defaults</Button>
                <Button 
                  onClick={handleSaveMetricSettings} 
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Manual Metrics Generation</CardTitle>
                <CardDescription>
                  Generate metrics on demand for the current period.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Use this option to manually generate daily metrics. This is useful if you've 
                  just set up the metrics system or if the automated generation failed.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleGenerateMetrics} 
                  disabled={isGeneratingMetrics}
                >
                  {isGeneratingMetrics ? 'Generating...' : 'Generate Metrics Now'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>System Information</CardTitle>
                  <CardDescription>
                    Details about your Garden Planner installation
                  </CardDescription>
                </div>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Online</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Application Version</h3>
                    <p className="text-sm text-slate-500">1.0.0</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Last Deployment</h3>
                    <p className="text-sm text-slate-500">April 27, 2025</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Database</h3>
                    <p className="text-sm text-slate-500">PostgreSQL</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Environment</h3>
                    <p className="text-sm text-slate-500">Production</p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-2">System Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-sm">API Status</span>
                      <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-sm">Database Status</span>
                      <Badge className="bg-green-100 text-green-800">Connected</Badge>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-sm">Scheduled Tasks</span>
                      <Badge className="bg-green-100 text-green-800">Running</Badge>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-sm">Storage</span>
                      <Badge className="bg-blue-100 text-blue-800">72% Free</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">Run System Diagnostics</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security settings for your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="two-factor">Require Two-Factor Authentication for Admins</Label>
                  <p className="text-sm text-slate-500">
                    Add an extra layer of security for admin accounts
                  </p>
                </div>
                <Switch id="two-factor" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                  <p className="text-sm text-slate-500">
                    How long before inactive users are logged out
                  </p>
                </div>
                <Input
                  id="session-timeout"
                  type="number"
                  min="5"
                  className="w-20"
                  defaultValue="30"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="failed-attempts">Failed Login Attempts</Label>
                  <p className="text-sm text-slate-500">
                    Number of failed attempts before account lockout
                  </p>
                </div>
                <Input
                  id="failed-attempts"
                  type="number"
                  min="1"
                  className="w-20"
                  defaultValue="5"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Security Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;