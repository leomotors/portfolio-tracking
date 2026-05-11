import { MobileNav, Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { UserAvatar } from "@/components/app/user-avatar";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <MobileNav />
        <Topbar profile={session ? <UserAvatar session={session} /> : null} />
        <div className="w-full max-w-[1320px] px-4 pt-6 pb-15 md:px-7 md:pt-8">
          {children}
        </div>
      </div>
    </div>
  );
}
