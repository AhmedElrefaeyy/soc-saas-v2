export interface HuntTemplate {
  id: string;
  name: string;
  description: string;
  tactic: string;
  kql: string;
  mode: "event" | "investigation";
  filters: Array<{ field: string; operator: string; value: string }>;
}

export const HUNT_TEMPLATES: HuntTemplate[] = [
  // Credential Access
  {
    id: "cred-brute-force",
    name: "Brute force success on high-value user",
    description: "Detects successful login following multiple failures — indicative of successful brute force.",
    tactic: "Credential Access",
    kql: "is_anomaly:true AND ueba_flags:brute_force_success",
    mode: "event",
    filters: [
      { field: "is_anomaly",   operator: "eq",  value: "true" },
      { field: "ueba_flags",   operator: "contains", value: "brute_force_success" },
    ],
  },
  {
    id: "cred-kerberoasting",
    name: "Kerberoasting activity",
    description: "Unusual Kerberos TGS requests targeting service accounts.",
    tactic: "Credential Access",
    kql: "category:authentication AND ueba_flags:kerberoasting",
    mode: "event",
    filters: [
      { field: "category",     operator: "eq",  value: "authentication" },
      { field: "ueba_flags",   operator: "contains", value: "kerberoasting" },
    ],
  },
  // Lateral Movement
  {
    id: "lateral-xdomain",
    name: "Cross-domain lateral movement",
    description: "User accessing resources across trust boundaries in unexpected patterns.",
    tactic: "Lateral Movement",
    kql: "ueba_flags:lateral_movement_xdomain",
    mode: "event",
    filters: [
      { field: "ueba_flags",   operator: "contains", value: "lateral_movement_xdomain" },
    ],
  },
  {
    id: "lateral-psexec",
    name: "PsExec lateral movement",
    description: "PsExec or similar remote execution tools used for lateral movement.",
    tactic: "Lateral Movement",
    kql: "process_name:psexec.exe OR process_name:psexesvc.exe",
    mode: "event",
    filters: [
      { field: "process_name", operator: "contains", value: "psexec" },
    ],
  },
  // Exfiltration
  {
    id: "exfil-afterhours",
    name: "After-hours data access",
    description: "Large data access or transfers occurring outside business hours.",
    tactic: "Exfiltration",
    kql: "ueba_flags:insider_offhours_data",
    mode: "event",
    filters: [
      { field: "ueba_flags",   operator: "contains", value: "insider_offhours_data" },
    ],
  },
  {
    id: "exfil-dns-tunnel",
    name: "DNS tunneling exfiltration",
    description: "High-volume or unusual DNS queries that may indicate DNS tunneling.",
    tactic: "Exfiltration",
    kql: "category:dns AND ueba_flags:dns_tunneling",
    mode: "event",
    filters: [
      { field: "category",     operator: "eq",  value: "dns" },
      { field: "ueba_flags",   operator: "contains", value: "dns_tunneling" },
    ],
  },
  // Execution
  {
    id: "exec-suspicious-ps",
    name: "Suspicious PowerShell execution",
    description: "PowerShell running with encoded commands or bypassing execution policy.",
    tactic: "Execution",
    kql: "process_name:powershell.exe AND severity:>=3",
    mode: "event",
    filters: [
      { field: "process_name", operator: "eq",  value: "powershell.exe" },
      { field: "severity",     operator: "gte", value: "3" },
    ],
  },
  {
    id: "exec-wmi",
    name: "WMI-based execution",
    description: "Suspicious WMI usage for remote command execution.",
    tactic: "Execution",
    kql: "process_name:wmic.exe AND is_anomaly:true",
    mode: "event",
    filters: [
      { field: "process_name", operator: "eq",  value: "wmic.exe" },
      { field: "is_anomaly",   operator: "eq",  value: "true" },
    ],
  },
  // Persistence
  {
    id: "persist-scheduled-task",
    name: "New scheduled task created",
    description: "Schtasks.exe or taskschd.msc used to create persistence.",
    tactic: "Persistence",
    kql: "category:process AND process_name:schtasks.exe",
    mode: "event",
    filters: [
      { field: "category",     operator: "eq",  value: "process" },
      { field: "process_name", operator: "eq",  value: "schtasks.exe" },
    ],
  },
  {
    id: "persist-registry-run",
    name: "Registry run key modification",
    description: "Modification of HKLM or HKCU Run keys for persistence.",
    tactic: "Persistence",
    kql: "category:registry AND ueba_flags:registry_persistence",
    mode: "event",
    filters: [
      { field: "category",     operator: "eq",  value: "registry" },
      { field: "ueba_flags",   operator: "contains", value: "registry_persistence" },
    ],
  },
  // Defense Evasion
  {
    id: "evasion-av-disable",
    name: "Antivirus/EDR disabled",
    description: "Attempts to stop or disable security tools.",
    tactic: "Defense Evasion",
    kql: "ueba_flags:av_disabled OR ueba_flags:edr_tamper",
    mode: "event",
    filters: [
      { field: "ueba_flags",   operator: "contains", value: "av_disabled" },
    ],
  },
  // Discovery
  {
    id: "discovery-net-scan",
    name: "Internal network scanning",
    description: "Host performing port scans or network enumeration of internal range.",
    tactic: "Discovery",
    kql: "ueba_flags:internal_scan AND is_threat_ip:false",
    mode: "event",
    filters: [
      { field: "ueba_flags",   operator: "contains", value: "internal_scan" },
      { field: "is_threat_ip", operator: "eq",  value: "false" },
    ],
  },
];
