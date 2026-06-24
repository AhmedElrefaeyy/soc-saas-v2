import { useEffect, useRef } from "react";
import { useRealtimeStore } from "@/stores/realtimeStore";
import { useAuthStore } from "@/stores/authStore";
import type { PresenceState } from "@/types/realtime";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function AnalystAvatar({ analyst }: { analyst: PresenceState }) {
  const initial = analyst.display_name[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="relative w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0 border border-accent/30"
      title={analyst.display_name}
    >
      {initial}
      {!analyst.idle && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-status-online rounded-full border border-bg-card" />
      )}
    </div>
  );
}

// ─── CollaborativeWarRoom ─────────────────────────────────────────────────────

interface Props {
  investigationId: string;
  onTypingChange?: (isTyping: boolean) => void;
}

export function CollaborativeWarRoom({ investigationId, onTypingChange }: Props) {
  const currentUser    = useAuthStore((s) => s.user);
  const onlineAnalysts = useRealtimeStore((s) => s.onlineAnalysts);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only show analysts who are in this investigation
  const analysts = onlineAnalysts.filter(
    (a) => a.analyst_id !== (currentUser?.id ?? "") && a.investigation_id === investigationId,
  );

  const handleTypingStart = () => {
    onTypingChange?.(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => { onTypingChange?.(false); }, 2000);
  };

  useEffect(() => () => { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); }, []);

  // Show any active analysts on this tenant even without investigation filter as fallback
  const allActive = onlineAnalysts.filter((a) => a.analyst_id !== (currentUser?.id ?? ""));

  const visible = analysts.length > 0 ? analysts : allActive.slice(0, 0); // only show if in same inv

  if (visible.length === 0) return null;

  return (
    <div className="rounded-lg bg-bg-elevated border border-border px-3 py-2 flex items-center gap-3 mb-3">
      {/* Presence avatars */}
      <div className="flex items-center gap-1">
        {visible.slice(0, 5).map((a) => <AnalystAvatar key={a.analyst_id} analyst={a} />)}
        {visible.length > 5 && (
          <span className="text-2xs text-text-muted ml-1">+{visible.length - 5}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-secondary">
          {visible.slice(0, 2).map((a) => a.display_name).join(", ")}
          {visible.length > 2 ? ` and ${visible.length - 2} more ` : " "}
          {visible.length === 1 ? "is" : "are"} active
        </p>
      </div>

      {/* Hidden input for typing detection — parent can attach onInput */}
      <input type="hidden" data-typing-handler="true" onInput={handleTypingStart} />
    </div>
  );
}
