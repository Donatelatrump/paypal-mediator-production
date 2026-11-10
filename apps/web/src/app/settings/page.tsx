'use client';

import { useState } from 'react';
import { useMe, useIntegrations, useCheckPayPal, useUpdateMerchant } from '@/hooks/useApi';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/useToast';

export default function SettingsPage() {
  const { data: me, isLoading: meLoading } = useMe();
  const { data: integration, isLoading: intLoading } = useIntegrations();
  const checkPayPalMutation = useCheckPayPal();
  const updateMutation = useUpdateMerchant();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    displayName: '',
    contactName: '',
    email: '',
    phone: '',
    timezone: '',
  });

  const [policy, setPolicy] = useState({
    allowInvestigations: false,
    allowSubmissions: false,
    requireMerchantApproval: true,
  });

  if (meLoading || intLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Initialize form data
  if (me && Object.keys(formData).every((k) => !formData[k as keyof typeof formData])) {
    setFormData({
      displayName: me.displayName || '',
      contactName: '',
      email: '',
      phone: '',
      timezone: '',
    });
    setPolicy(me.policy || { allowInvestigations: false, allowSubmissions: false, requireMerchantApproval: true });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(formData);
      toast({ title: 'Settings saved', description: 'Merchant settings have been updated.' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handlePolicyChange = (key: keyof typeof policy, value: boolean) => {
    setPolicy((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure your merchant account, PayPal integration, and dispute policies.
          </p>
        </div>

        {/* Merchant Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Merchant Profile</CardTitle>
            <CardDescription>Basic information about your merchant account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* PayPal Integration */}
        <Card>
          <CardHeader>
            <CardTitle>PayPal Integration</CardTitle>
            <CardDescription>Configure and test your PayPal Sandbox connection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Connection Status</p>
                <p className="text-sm text-muted-foreground">
                  PayPal Sandbox API connection
                </p>
              </div>
              <Badge variant={integration?.connectionStatus === 'CONNECTED' ? 'default' : 'secondary'}>
                {integration?.connectionStatus || 'NOT_CONFIGURED'}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div>
                <p className="text-muted-foreground">Disputes Read Status</p>
                <p className="font-medium">{integration?.disputesReadStatus || 'NOT_CHECKED'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Checked</p>
                <p className="font-medium">
                  {integration?.lastCheckedAt ? new Date(integration.lastCheckedAt).toLocaleString() : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Webhook Configured</p>
                <p className="font-medium">{integration?.webhookConfigured ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Credentials Configured</p>
                <p className="font-medium">{integration?.credentialsConfigured ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={async () => {
                try {
                  await checkPayPalMutation.mutateAsync();
                  toast({ title: 'PayPal check completed', description: 'Connection and disputes access verified.' });
                } catch (error: any) {
                  toast({ title: 'Check failed', description: error.message, variant: 'destructive' });
                }
              }} disabled={checkPayPalMutation.isPending}>
                {checkPayPalMutation.isPending ? 'Checking...' : 'Check PayPal Connection'}
              </Button>
              <Button variant="outline">Configure Credentials</Button>
            </div>
          </CardContent>
        </Card>

        {/* Dispute Policies */}
        <Card>
          <CardHeader>
            <CardTitle>Dispute Policies</CardTitle>
            <CardDescription>Configure how disputes are handled automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Investigations</p>
                  <p className="text-sm text-muted-foreground">
                    Enable AI-powered evidence gathering for disputes
                  </p>
                </div>
                <Switch
                  checked={policy.allowInvestigations}
                  onCheckedChange={(checked) => handlePolicyChange('allowInvestigations', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Allow Submissions</p>
                  <p className="text-sm text-muted-foreground">
                    Allow automatic evidence submission to PayPal (requires Verifier approval)
                  </p>
                </div>
                <Switch
                  checked={policy.allowSubmissions}
                  onCheckedChange={(checked) => handlePolicyChange('allowSubmissions', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Merchant Approval</p>
                  <p className="text-sm text-muted-foreground">
                    Require manual approval before submitting evidence to PayPal
                  </p>
                </div>
                <Switch
                  checked={policy.requireMerchantApproval}
                  onCheckedChange={(checked) => handlePolicyChange('requireMerchantApproval', checked)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Note: Policy changes require backend implementation to take effect.
            </p>
          </CardContent>
        </Card>

        {/* Environment Info */}
        <Card>
          <CardHeader>
            <CardTitle>Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">API Base URL: </span>
                <code className="text-primary">https://resolve-ai-api-ybmj.onrender.com/api</code>
              </div>
              <div>
                <span className="text-muted-foreground">Supabase Project: </span>
                <code>cauossdmfgvbyjyjcdyz</code>
              </div>
              <div>
                <span className="text-muted-foreground">Environment: </span>
                <Badge variant="secondary">sandbox</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Merchant ID: </span>
                <code>{me?.id}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}