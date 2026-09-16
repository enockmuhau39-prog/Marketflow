"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button || button.textContent?.trim() !== "Connect") return;
      if (pathname !== "/dashboard") return;
      event.preventDefault();
      router.push("/dashboard/connect");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname, router]);

  return <>{children}</>;
}
