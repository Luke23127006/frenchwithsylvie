import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export default async function Header() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl text-primary">French with Sylvie</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-right hidden md:block">
            <p className="font-medium leading-none">{payload.full_name as string}</p>
            <p className="text-muted-foreground capitalize mt-1 text-xs">{payload.role as string}</p>
          </div>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
