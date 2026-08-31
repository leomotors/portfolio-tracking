"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { togglePrivacyMode, usePrivacyHidden } from "@/lib/privacy-mode";

export function PrivacyToggle() {
  const hidden = usePrivacyHidden();

  return (
    <Button
      type="button"
      variant={hidden ? "default" : "outline"}
      size="icon"
      title={hidden ? "Show balances" : "Hide balances"}
      aria-label={hidden ? "Show balances" : "Hide balances"}
      aria-pressed={hidden}
      onClick={togglePrivacyMode}
    >
      {hidden ? (
        <EyeOff size={16} strokeWidth={2} />
      ) : (
        <Eye size={16} strokeWidth={2} />
      )}
    </Button>
  );
}
