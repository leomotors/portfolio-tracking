"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";

import { AiChat } from "./ai-chat";
import { MobileNav, Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({
  children,
  profile,
}: Readonly<{
  children: React.ReactNode;
  profile?: React.ReactNode;
}>) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(600);

  const startResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = chatWidth;

      const onMove = (moveEvent: PointerEvent) => {
        const nextWidth = startWidth + startX - moveEvent.clientX;
        setChatWidth(Math.min(760, Math.max(420, nextWidth)));
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [chatWidth],
  );

  return (
    <div
      className={`grid h-dvh w-full overflow-hidden ${
        chatOpen
          ? "md:grid-cols-[240px_minmax(0,1fr)_8px_var(--ai-chat-width)]"
          : "md:grid-cols-[240px_minmax(0,1fr)]"
      }`}
      style={
        {
          "--ai-chat-width": `${chatWidth}px`,
        } as React.CSSProperties
      }
    >
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <MobileNav />
        <Topbar
          profile={profile}
          aiTrigger={
            <Button
              type="button"
              variant={chatOpen ? "default" : "outline"}
              size="icon"
              title="AI Agent"
              aria-label="AI Agent"
              onClick={() => setChatOpen((value) => !value)}
            >
              <span aria-hidden="true" className="text-[15px] leading-none">
                ✨
              </span>
            </Button>
          }
        />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="w-full max-w-[1320px] px-4 pt-6 pb-15 md:px-7 md:pt-8">
            {children}
          </div>
        </div>
      </div>
      {chatOpen && (
        <div
          className="hidden cursor-col-resize touch-none border-x border-[var(--hairline)] bg-[var(--hairline-2)] hover:bg-[var(--accent-pri)] md:block"
          title="Resize AI panel"
          onPointerDown={startResize}
        />
      )}
      <AiChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
