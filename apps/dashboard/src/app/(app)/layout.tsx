import { AppShell } from "@/components/app/app-shell";
import { UserAvatar } from "@/components/app/user-avatar";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getSession();
  return (
    <AppShell profile={session ? <UserAvatar session={session} /> : null}>
      {children}
    </AppShell>
  );
}
