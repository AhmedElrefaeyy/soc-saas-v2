import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { Toaster } from "@/components/ui/Toaster";
import { ShortcutsModal } from "@/components/ui/ShortcutsModal";
import { KeyboardShortcuts } from "@/hooks/useKeyboard";
import { useTenantInit } from "@/hooks/useTenantInit";
import { useTenantCacheReset } from "@/hooks/useTenantCacheReset";

export function AppShell() {
  useTenantInit();
  useTenantCacheReset();
  return (
    <div style={{ display: "flex", height: "100vh", background: "#000000", overflow: "hidden" }}>
      {/* Skip navigation — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-text-primary focus:bg-bg-elevated focus:border focus:border-accent focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main column — offset by sidebar width */}
      <div style={{
        flex: 1,
        marginLeft: 220,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        overflow: "hidden",
      }}>
        {/* Fixed-height topbar */}
        <TopBar />

        {/* Scrollable page area */}
        <main
          id="main-content"
          tabIndex={-1}
          className="page-in"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Global overlays */}
      <CommandPalette />
      <Toaster />
      <ShortcutsModal />
      <KeyboardShortcuts />
    </div>
  );
}
