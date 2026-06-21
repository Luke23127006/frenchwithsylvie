import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import ChangePasswordModal from "./ChangePasswordModal";
import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import NotificationSettings from "./NotificationSettings";
import { getNotificationSettings } from "@/lib/actions/notifications";

export default async function Header() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const settings = await getNotificationSettings();

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Image src="/logo.jpg" alt="French with Sylvie Logo" width={32} height={32} className="rounded-full shadow-sm" />
          <span className="font-bold text-xl text-primary">French with Sylvie</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 mr-2">
            <div className="text-right">
              <p className="font-semibold text-base leading-none text-foreground">{payload.full_name as string}</p>
              <p className="text-muted-foreground capitalize mt-1 text-sm">{payload.role as string}</p>
            </div>
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationSettings initialSettings={settings} isTeacher={payload.role === 'teacher'} />
            <ChangePasswordModal />
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                Logout
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
