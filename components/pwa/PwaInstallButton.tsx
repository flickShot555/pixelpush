"use client";

import { Download } from "lucide-react";
import { useContext, useMemo, useState } from "react";

import { Btn } from "@/components/ui/Btn";
import { useTheme } from "@/lib/theme";
import { PwaInstallContext } from "@/components/pwa/PwaInstallProvider";

export type PwaInstallButtonProps = {
  mode?: "button" | "icon";
  label?: string;
};

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function PwaInstallButton({ mode = "button", label = "Download app" }: PwaInstallButtonProps) {
  const ctx = useContext(PwaInstallContext);
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);

  const disabled = useMemo(() => {
    if (!ctx) return true;
    if (ctx.isInstalled) return true;
    return busy;
  }, [busy, ctx]);

  async function handleClick() {
    if (!ctx) return;

    if (ctx.isInstalled) {
      window.alert("PixelPush is already installed on this device.");
      return;
    }

    setBusy(true);
    try {
      const outcome = await ctx.promptInstall();
      if (outcome !== "unavailable") return;

      if (isIOS()) {
        window.alert("To install on iPhone/iPad: tap Share in Safari, then ‘Add to Home Screen’. ");
        return;
      }

      window.alert(
        "To install: open your browser menu and choose ‘Install app’ / ‘Add to Home screen’."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!ctx) return null;

  if (mode === "icon") {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={handleClick}
        disabled={disabled}
        style={{
          width: 40,
          height: 40,
          borderRadius: theme.borderRadius,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${theme.border}`,
          background: theme.surface2,
          color: theme.text,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <Download aria-hidden size={18} color={theme.muted} />
      </button>
    );
  }

  return (
    <Btn variant="ghost" small onClick={handleClick} disabled={disabled}>
      <Download aria-hidden size={16} />
      {ctx.isInstalled ? "Installed" : label}
    </Btn>
  );
}
