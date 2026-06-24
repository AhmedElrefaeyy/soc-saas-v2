import React, { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils";
import { useInvNotes, useInvCreateNote } from "../../hooks/useInvestigationDetail";
import type { InvestigationDetail } from "../../hooks/useInvestigationDetail";

// ─── Shared skeleton ──────────────────────────────────────────────────────────

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skel h-16 rounded-lg" />
      ))}
    </div>
  );
}

// ─── WarRoomTab ───────────────────────────────────────────────────────────────

interface Props {
  id: string;
  inv: InvestigationDetail;
  isActive: boolean;
}

export const WarRoomTab = React.memo(function WarRoomTab({ id, inv, isActive }: Props) {
  const { data: notes, isLoading } = useInvNotes(id, { enabled: isActive });
  const createNote = useInvCreateNote(id);
  const [content, setContent] = useState("");

  const submit = async () => {
    if (!content.trim()) return;
    await createNote.mutateAsync(content.trim());
    setContent("");
  };

  const systemEvents = [
    {
      ts: new Date(inv.created_at).getTime(),
      msg: `Investigation created — ${inv.source === "manual" ? "manually opened" : "auto-correlated from alerts"}`,
      color: "#60A5FA",
    },
    ...(inv.ai_analysis_json
      ? [{
          ts: new Date(inv.updated_at).getTime(),
          msg: `AI analysis completed — verdict suggestion: ${inv.ai_analysis_json.verdict_suggestion?.replace(/_/g, " ")}`,
          color: "#818CF8",
        }]
      : []),
  ];

  return (
    <div className="max-w-[760px]">
      {/* Composer */}
      <div className="bg-bg-subtle border border-border rounded-lg p-3.5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <MessagesSquare size={13} className="text-text-muted" />
          <span className="text-2xs font-bold uppercase tracking-wider text-text-muted">
            Add to War Room
          </span>
        </div>
        <textarea
          className="w-full bg-transparent border-none outline-none text-text-primary text-sm font-sans resize-none leading-relaxed min-h-[68px] box-border"
          placeholder="Post a note, observation, or action taken..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-2xs text-text-disabled">Ctrl+Enter to post</span>
          <Button
            variant="primary"
            size="sm"
            disabled={!content.trim()}
            loading={createNote.isPending}
            onClick={submit}
          >
            Post
          </Button>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <TabSkeleton />
      ) : (
        <>
          {/* Analyst notes */}
          {(notes ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((note) => (
            <div key={note.note_id} className="flex gap-3 mb-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-2xs font-bold text-white flex-shrink-0 mt-0.5">
                {note.analyst_name
                  ? note.analyst_name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
                  : (note.analyst_id?.[0]?.toUpperCase() ?? "A")}
              </div>
              <div className="flex-1">
                <div className="bg-accent/6 border border-accent/15 rounded-tl-none rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-blue-300">
                      {note.analyst_name ?? note.analyst_id?.slice(0, 8)}
                    </span>
                    {note.pinned && (
                      <span className="text-2xs px-1.5 py-px rounded bg-accent/10 text-accent font-mono">PINNED</span>
                    )}
                    <span className="text-2xs text-text-muted ml-auto font-mono">
                      {formatRelativeTime(note.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-tx-2 leading-relaxed m-0">{note.content}</p>
                </div>
              </div>
            </div>
          ))}

          {/* System events */}
          {systemEvents.sort((a, b) => b.ts - a.ts).map((item, i) => (
            <div key={i} className="flex gap-3 mb-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${item.color}10`, border: `1px solid ${item.color}25` }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
              </div>
              <div className="flex-1 pt-2">
                <span className="text-xs text-text-muted italic">{item.msg}</span>
                <span className="text-2xs text-text-disabled ml-2.5 font-mono">
                  {formatRelativeTime(new Date(item.ts).toISOString())}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
});
