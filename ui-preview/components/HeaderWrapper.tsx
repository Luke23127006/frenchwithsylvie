'use client';

import { usePathname } from 'next/navigation';

export default function HeaderWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  if (pathname === '/' || pathname === '/login') {
    return null;
  }
  
  return <>{children}</>;
}
