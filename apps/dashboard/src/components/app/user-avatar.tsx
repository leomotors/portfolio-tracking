import Image from "next/image";

import { discordAvatarUrl, type SessionPayload } from "@/lib/auth";

export function UserAvatar({ session }: { session: SessionPayload }) {
  const src = discordAvatarUrl(session.uid, session.avatar, 64);
  const name = session.name ?? "Account";

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={30}
        height={30}
        className="h-[30px] w-[30px] rounded-full"
        unoptimized
      />
    );
  }

  const initial = (name.charAt(0) || "?").toUpperCase();
  return (
    <div
      className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[var(--accent-pri)] text-xs font-semibold text-white"
      aria-label={name}
      title={name}
    >
      {initial}
    </div>
  );
}
