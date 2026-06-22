'use client';

import { useTransition, useOptimistic } from 'react';
import { Bell, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { updateNotificationPreferences, unlinkEmail } from '@/lib/actions/notifications';
import toast from 'react-hot-toast';

export type NotificationSettingsData = {
  email: string | null;
  notify_new_assignment: boolean;
  notify_assignment_graded: boolean;
  notify_deadline_reminder: boolean;
  notify_submission_received: boolean;
};

interface NotificationSettingsProps {
  initialSettings: NotificationSettingsData | null;
  isTeacher?: boolean;
}

export default function NotificationSettings({ initialSettings, isTeacher }: NotificationSettingsProps) {
  const [isPending, startTransition] = useTransition();

  const [optimisticSettings, setOptimisticSettings] = useOptimistic(
    initialSettings || {
      email: null,
      notify_new_assignment: true,
      notify_assignment_graded: true,
      notify_deadline_reminder: true,
      notify_submission_received: true,
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
    startTransition(async () => {
      // Optimistically update the UI inside the transition
      setOptimisticSettings({ [key]: checked });

      // Run the server action
      const result = await updateNotificationPreferences({ [key]: checked });
      if (result.error) {
        toast.error(result.error);
      }
    });
  };

  const handleUnlink = () => {
    if (!window.confirm("Are you sure you want to unlink your email? You will no longer receive any notifications.")) {
      return;
    }

    startTransition(async () => {
      // Optimistically unlink
      setOptimisticSettings({ email: null });

      const result = await unlinkEmail();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Email unlinked successfully");
      }
    });
  };

  const hasEmailLinked = !!optimisticSettings.email;

  return (
    <div className="w-full">
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    Linked
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleUnlink}
                    disabled={isPending}
                    className="h-6 text-xs px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    Unlink
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {isTeacher ? (
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="notify-submissions" className="flex flex-col space-y-1 items-start text-left">
                      <span>Student Submissions</span>
                      <span className="font-normal text-xs text-muted-foreground">When a student completes an assignment.</span>
                    </Label>
                    <Switch
                      id="notify-submissions"
                      checked={optimisticSettings.notify_submission_received}
                      onCheckedChange={(checked) => handleToggle('notify_submission_received', checked)}
                      disabled={isPending}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="notify-new" className="flex flex-col space-y-1 items-start text-left">
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
                      <Label htmlFor="notify-graded" className="flex flex-col space-y-1 items-start text-left">
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
                      <Label htmlFor="notify-deadline" className="flex flex-col space-y-1 items-start text-left text-muted-foreground">
                        <span>Deadline Reminders</span>
                        <span className="font-normal text-xs text-muted-foreground">Coming soon.</span>
                      </Label>
                      <Switch
                        id="notify-deadline"
                        checked={false}
                        disabled={true}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
