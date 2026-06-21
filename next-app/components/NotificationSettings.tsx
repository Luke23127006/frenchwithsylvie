'use client';

import { useTransition, useOptimistic } from 'react';
import { Bell, Mail } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateNotificationPreferences } from '@/lib/actions/notifications';
import toast from 'react-hot-toast';

export type NotificationSettingsData = {
  email: string | null;
  notify_new_assignment: boolean;
  notify_assignment_graded: boolean;
  notify_deadline_reminder: boolean;
};

interface NotificationSettingsProps {
  initialSettings: NotificationSettingsData | null;
}

export default function NotificationSettings({ initialSettings }: NotificationSettingsProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticSettings, setOptimisticSettings] = useOptimistic(
    initialSettings || {
      email: null,
      notify_new_assignment: true,
      notify_assignment_graded: true,
      notify_deadline_reminder: true,
    },
    (state, newSettings: Partial<NotificationSettingsData>) => ({ ...state, ...newSettings })
  );

  const handleLinkGoogle = () => {
    // Construct the manual OAuth URL
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    
    if (!clientId) {
      toast.error('Google Client ID is missing in environment variables.');
      return;
    }

    // Run transition to get a secure state token
    startTransition(async () => {
      const { generateOAuthState } = await import('@/lib/actions/notifications');
      const stateToken = await generateOAuthState();
      
      if (!stateToken) {
        toast.error('Failed to generate secure OAuth state.');
        return;
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile&state=${encodeURIComponent(stateToken)}`;
      
      // Redirect
      window.location.href = authUrl;
    });
  };

  const handleToggle = (key: keyof NotificationSettingsData, checked: boolean) => {
    // Optimistically update the UI
    setOptimisticSettings({ [key]: checked });

    // Run the server action in a transition
    startTransition(async () => {
      const result = await updateNotificationPreferences({ [key]: checked });
      if (result.error) {
        toast.error(result.error);
      }
    });
  };

  const hasEmailLinked = !!optimisticSettings.email;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full border bg-slate-50 text-slate-600 hover:text-primary hover:bg-primary/10">
          <Bell className="h-5 w-5" />
          {/* Subtle indicator if not linked, so users know they can set it up */}
          {!hasEmailLinked && (
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end" sideOffset={8}>
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <h4 className="font-semibold leading-none">Email Notifications</h4>
              <p className="text-sm text-muted-foreground mt-1">Manage your email alerts.</p>
            </div>
          </div>

          {!hasEmailLinked ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-4 text-center">
              <p className="text-sm text-slate-600">
                You haven&apos;t linked an email address yet. Connect your Google account to receive important alerts.
              </p>
              <Button onClick={handleLinkGoogle} className="w-full">
                Link with Google
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border">
                <span className="text-sm font-medium text-slate-700 truncate mr-2" title={optimisticSettings.email!}>
                  {optimisticSettings.email}
                </span>
                <span className="text-xs font-semibold uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  Linked
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="notify-new" className="flex flex-col space-y-1">
                    <span>New Assignments</span>
                    <span className="font-normal text-xs text-muted-foreground">When you receive new homework.</span>
                  </Label>
                  <Switch
                    id="notify-new"
                    checked={optimisticSettings.notify_new_assignment}
                    onCheckedChange={(checked) => handleToggle('notify_new_assignment', checked)}
                    disabled={isPending}
                  />
                </div>
                
                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="notify-graded" className="flex flex-col space-y-1">
                    <span>Grades & Feedback</span>
                    <span className="font-normal text-xs text-muted-foreground">When your teacher grades your work.</span>
                  </Label>
                  <Switch
                    id="notify-graded"
                    checked={optimisticSettings.notify_assignment_graded}
                    onCheckedChange={(checked) => handleToggle('notify_assignment_graded', checked)}
                    disabled={isPending}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <Label htmlFor="notify-deadline" className="flex flex-col space-y-1">
                    <span>Deadline Reminders</span>
                    <span className="font-normal text-xs text-muted-foreground">Before an assignment is due.</span>
                  </Label>
                  <Switch
                    id="notify-deadline"
                    checked={optimisticSettings.notify_deadline_reminder}
                    onCheckedChange={(checked) => handleToggle('notify_deadline_reminder', checked)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
