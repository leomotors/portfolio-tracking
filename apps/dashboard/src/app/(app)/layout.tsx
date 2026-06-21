import { redirect } from "next/navigation";

import { AppShell } from "@/components/app/app-shell";
import { UserAvatar } from "@/components/app/user-avatar";
import { getSession, isAllowedUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Defense in depth: the proxy already gates these routes, but verify the
  // session here too so app pages never render for an unauthorized user.
  const session = await getSession();
  if (!session || !isAllowedUser(session.uid)) {
    redirect("/login");
  }
  return (
    <AppShell profile={<UserAvatar session={session} />}>{children}</AppShell>
  );
}
