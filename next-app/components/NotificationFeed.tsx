"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, Settings, Check, ArrowRight, Circle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import NotificationSettings, { NotificationSettingsData } from "./NotificationSettings";
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/actions/in-app-notifications";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

interface NotificationFeedProps {
  userId: string;
  isTeacher: boolean;
  initialSettings: NotificationSettingsData | null;
}

export default function NotificationFeed({ userId, isTeacher, initialSettings }: NotificationFeedProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // 1. Initial Fetch
    const fetchInitial = async () => {
      try {
        const result = await getNotifications({});
        if (result.data) {
          setNotifications(result.data);
          setUnreadCount(result.data.filter((n: any) => !n.is_read).length);
        }
      } catch (err) {
        console.error("Failed to fetch initial notifications", err);
      }
    };
    fetchInitial();

    // 2. Realtime Subscription via Broadcast
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel(`user_notifications_${userId}`)
      .on('broadcast', { event: 'new_notification' }, (payload) => {
        const newNotif = payload.payload;
        setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAsRead = (notification: any) => {
    if (!notification.is_read) {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      // Background sync
      startTransition(() => {
        markAsRead({ notificationId: notification.id });
      });
    }

    if (notification.action_url) {
      setIsOpen(false);
      router.push(notification.action_url);
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    startTransition(() => {
      markAllAsRead({});
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setShowSettings(false); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="joyride-notif-bell relative h-10 w-10 rounded-full border bg-slate-50 text-slate-600 hover:text-primary hover:bg-primary/10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-1 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          {unreadCount === 0 && !initialSettings?.email && (
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end" sideOffset={8}>
        {showSettings ? (
          <div className="flex flex-col h-[400px]">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-semibold leading-none">Settings</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)} className="h-8 px-2 text-xs">
                Back to Feed
              </Button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <NotificationSettings initialSettings={initialSettings} isTeacher={isTeacher} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col max-h-[500px]">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold leading-none">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="icon" onClick={handleMarkAllAsRead} className="h-8 w-8 text-muted-foreground" title="Mark all as read">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} className="h-8 w-8 text-muted-foreground" title="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 overflow-y-auto max-h-[400px]">
              {notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                      onClick={() => handleMarkAsRead(n)}
                    >
                      <div className="mt-1 flex-shrink-0">
                        {!n.is_read ? (
                          <Circle className="h-2 w-2 fill-primary text-primary" />
                        ) : (
                          <div className="h-2 w-2" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className={`text-sm ${!n.is_read ? 'font-medium' : 'text-slate-600'}`}>
                          {n.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {n.action_url && (
                        <div className="flex-shrink-0 text-muted-foreground mt-1">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">You have no notifications yet.</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
