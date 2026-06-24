import { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Brain, X, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import { cn } from "@/lib/utils";
import { extractApiError } from "@/lib/utils";
import type { InvestigationDetail } from "../hooks/useInvestigationDetail";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AlertContext {
  type: "alert";
  title: string;
  hostname?: string;
  severity?: string;
  lastSeenAt?: string;
  uebaScore?: number;
  isThreatIp?: boolean;
  mitreTechniqueId?: string;
  mitreTechniqueName?: string;
}

interface InvestigationContext {
  type: "investigation";
  inv: InvestigationDetail;
}

type TriageContext = AlertContext | InvestigationContext;

// ─── Build prompt ─────────────────────────────────────────────────────────────

function buildPrompt(ctx: TriageContext): string {
  if (ctx.type === "alert") {
    const { title, hostname, severity, lastSeenAt, uebaScore, isThreatIp, mitreTechniqueId, mitreTechniqueName } = ctx;
    return [
      `This alert '${title}' triggered on ${hostname ?? "unknown host"} at ${lastSeenAt ?? "unknown time"}.`,
      `Severity: ${severity ?? "unknown"}.`,
      uebaScore !== undefined ? `UEBA score: ${uebaScore}.` : "",
      isThreatIp !== undefined ? `Threat IP: ${isThreatIp}.` : "",
      mitreTechniqueId ? `MITRE: ${mitreTechniqueId} ${mitreTechniqueName ?? ""}.` : "",
      `Explain why this is classified as ${severity ?? "this severity"} and what the analyst should investigate first.`,
    ].filter(Boolean).join(" ");
  }

  const { inv } = ctx;
  const tactics = Array.isArray(inv.attack_progression) ? (inv.attack_progression as string[]).join(" → ") : "";
  return [
    `Investigation '${inv.title ?? "Investigation"}' has threat score ${inv.threat_score}.`,
    tactics ? `Attack chain: ${tactics}.` : "",
    inv.executive_summary ? `Executive summary: ${inv.executive_summary}` : "",
    "What are the 3 most important immediate actions?",
  ].filter(Boolean).join(" ");
}

// ─── AITriageAssistant ────────────────────────────────────────────────────────

interface Props {
  context: TriageContext;
}

export function AITriageAssistant({ context }: Props) {
  const navigate = useNavigate();
  const [open,   setOpen]   = useState(false);
  const [stream, setStream] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,  setError]   = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  const prompt = buildPrompt(context);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [stream]);

  const runAnalysis = async () => {
    setLoading(true);
    setStream("");
    setError(null);
    abortRef.current = new AbortController();

    try {
      // Use existing copilot endpoint
      const resp = await apiClient.post(
        "/copilot/chat",
        { message: prompt, stream: true },
        { signal: abortRef.current.signal, responseType: "stream" },
      );

      // Read streaming response
      const reader = (resp.data as ReadableStream<Uint8Array>).getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const text = decoder.decode(value, { stream: true });
          // Parse SSE lines
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") { done = true; break; }
              try {
                const parsed = JSON.parse(payload) as { content?: string; delta?: string };
                const token = parsed.delta ?? parsed.content ?? "";
                setStream((s) => s + token);
              } catch { setStream((s) => s + payload.replace(/^"|"$/g, "")); }
            }
          }
        }
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        // Non-streaming fallback
        try {
          const res = await apiClient.post<{ content: string }>("/copilot/chat", { message: prompt });
          setStream(res.data.content);
        } catch (e2) {
          setError(extractApiError(e2));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => { setOpen(true); if (!stream && !loading) void runAnalysis(); };

  const handleClose = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
          "bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20",
        )}
        aria-label="AI Triage Assistant"
      >
        <Brain size={13} />
        AI Triage
      </button>

      <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content
            role="dialog" aria-modal="true" onEscapeKeyDown={handleClose}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl rounded-xl border border-border bg-bg-card shadow-elevated flex flex-col"
            style={{ maxHeight: "80vh" }}
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border flex-shrink-0">
              <Brain size={14} className="text-accent" />
              <Dialog.Title className="text-sm font-bold text-text-primary">AI Triage Assistant</Dialog.Title>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => navigate("/copilot", { state: { initialMessage: prompt } })}
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors"
                >
                  <ExternalLink size={11} /> Open in Copilot
                </button>
                <Dialog.Close asChild>
                  <button onClick={handleClose} className="text-text-muted hover:text-text-primary transition-colors">
                    <X size={14} />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Prompt preview */}
            <div className="px-5 pt-3 pb-2 flex-shrink-0">
              <p className="text-2xs text-text-muted leading-relaxed bg-bg-elevated rounded-lg px-3 py-2 border border-border">{prompt}</p>
            </div>

            {/* Response */}
            <div ref={streamRef} className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
              {error ? (
                <p className="text-sm text-severity-critical">{error}</p>
              ) : loading && !stream ? (
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <Loader2 size={14} className="animate-spin" />
                  Analyzing threat context…
                </div>
              ) : stream ? (
                <div className="prose-sm text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {stream}
                  {loading && <span className="inline-block w-1.5 h-3.5 bg-accent animate-pulse ml-0.5 align-middle" />}
                </div>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-border flex-shrink-0">
              <button
                onClick={() => void runAnalysis()}
                disabled={loading}
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                {loading ? "Analyzing…" : "Re-analyze"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
