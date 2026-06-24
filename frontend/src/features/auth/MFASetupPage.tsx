import { useState, useEffect, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, AlertCircle, Copy, CheckCircle2 } from "lucide-react";
import { authApi } from "@/api/auth";
import { isApiError } from "@/api/client";
import { extractApiError } from "@/lib/utils";
import type { MFASetupResponse } from "@/api/auth";

type Step = "setup" | "backup";

export function MFASetupPage() {
  const navigate = useNavigate();

  const [step, setStep]               = useState<Step>("setup");
  const [setup, setSetup]             = useState<MFASetupResponse | null>(null);
  const [code, setCode]               = useState("");
  const [isLoading, setIsLoading]     = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    authApi
      .mfaSetup()
      .then(setSetup)
      .catch((err) => setError(extractApiError(err)))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!setup) return;
    setError(null);
    setIsVerifying(true);
    try {
      const result = await authApi.mfaVerify(setup.encrypted_secret, code.trim());
      setBackupCodes(result.backup_codes);
      setStep("backup");
    } catch (err) {
      if (isApiError(err)) {
        setError(err.message || "Invalid code — try again");
      } else {
        setError(extractApiError(err));
      }
    } finally {
      setIsVerifying(false);
    }
  }

  function handleCopyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#000000" }}
    >
      <div
        className="fixed top-0 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: "rgba(15, 17, 21, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          {step === "setup" && (
            <>
              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)" }}
                >
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
                <h1 className="text-xl font-semibold text-white">Set up two-factor authentication</h1>
                <p className="text-sm mt-1 text-center" style={{ color: "#8B95A7" }}>
                  Scan the QR code with your authenticator app, then enter the 6-digit code to activate MFA.
                </p>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : setup ? (
                <>
                  {/* QR code rendered via Google Charts API — provisioning URI is not sensitive */}
                  <div className="flex justify-center mb-6">
                    <div
                      className="p-4 rounded-xl"
                      style={{ background: "#fff" }}
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(setup.provisioning_uri)}&size=200x200`}
                        alt="MFA QR Code"
                        width={200}
                        height={200}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-center mb-4" style={{ color: "#8B95A7" }}>
                    Can't scan? Copy the URI manually into your app:
                  </p>
                  <div
                    className="rounded-lg px-3 py-2 mb-6 text-xs font-mono break-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#8B95A7",
                    }}
                  >
                    {setup.provisioning_uri}
                  </div>

                  <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: "#CBD5E1" }}>
                        Verification code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        autoFocus
                        className="w-full px-4 py-2.5 rounded-xl text-center text-xl tracking-[0.4em] font-mono transition-all outline-none"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#F5F7FA",
                        }}
                        disabled={isVerifying}
                      />
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-start gap-2 text-sm rounded-xl px-3 py-2.5"
                        style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          color: "#FCA5A5",
                        }}
                      >
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={isVerifying || code.length < 6}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={{
                        background: isVerifying || code.length < 6
                          ? "rgba(59,130,246,0.3)"
                          : "rgba(59,130,246,0.8)",
                        color: "#fff",
                        cursor: isVerifying || code.length < 6 ? "not-allowed" : "pointer",
                      }}
                    >
                      {isVerifying ? "Activating…" : "Activate MFA"}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="w-full text-sm text-center"
                      style={{ color: "#8B95A7" }}
                    >
                      Cancel
                    </button>
                  </form>
                </>
              ) : (
                error && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: "#FCA5A5" }}>
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )
              )}
            </>
          )}

          {step === "backup" && (
            <>
              <div className="flex flex-col items-center mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }}
                >
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <h1 className="text-xl font-semibold text-white">MFA activated</h1>
                <p className="text-sm mt-1 text-center" style={{ color: "#8B95A7" }}>
                  Save these backup codes in a secure place. Each code can only be used once.
                </p>
              </div>

              <div
                className="rounded-xl p-4 mb-4 font-mono text-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#E2E8F0",
                }}
              >
                {backupCodes.map((c) => (
                  <div key={c} className="py-1">{c}</div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#CBD5E1",
                  }}
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy backup codes"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/settings")}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: "rgba(59,130,246,0.8)",
                    color: "#fff",
                  }}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
