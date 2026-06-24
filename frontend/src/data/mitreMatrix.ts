// MITRE ATT&CK Enterprise Matrix v14 — key tactics and representative techniques
// Full matrix: https://attack.mitre.org/matrices/enterprise/

export interface MitreTechnique {
  id: string;
  name: string;
  tacticId: string;
}

export interface MitreTactic {
  id: string;
  shortId: string;
  name: string;
  techniques: MitreTechnique[];
}

export const MITRE_TACTICS: MitreTactic[] = [
  {
    id: "TA0043", shortId: "TA0043", name: "Reconnaissance",
    techniques: [
      { id: "T1595", name: "Active Scanning",        tacticId: "TA0043" },
      { id: "T1592", name: "Gather Victim Host Info", tacticId: "TA0043" },
      { id: "T1589", name: "Gather Victim Identity",  tacticId: "TA0043" },
      { id: "T1590", name: "Gather Victim Network",   tacticId: "TA0043" },
      { id: "T1591", name: "Gather Victim Org Info",  tacticId: "TA0043" },
      { id: "T1598", name: "Phishing for Info",       tacticId: "TA0043" },
      { id: "T1597", name: "Search Closed Sources",   tacticId: "TA0043" },
      { id: "T1596", name: "Search Open Sources",     tacticId: "TA0043" },
      { id: "T1593", name: "Search Open Websites",    tacticId: "TA0043" },
      { id: "T1594", name: "Search Victim-Owned Sites", tacticId: "TA0043" },
    ],
  },
  {
    id: "TA0042", shortId: "TA0042", name: "Resource Development",
    techniques: [
      { id: "T1583", name: "Acquire Infrastructure",  tacticId: "TA0042" },
      { id: "T1586", name: "Compromise Accounts",     tacticId: "TA0042" },
      { id: "T1584", name: "Compromise Infrastructure", tacticId: "TA0042" },
      { id: "T1587", name: "Develop Capabilities",    tacticId: "TA0042" },
      { id: "T1585", name: "Establish Accounts",      tacticId: "TA0042" },
      { id: "T1588", name: "Obtain Capabilities",     tacticId: "TA0042" },
      { id: "T1608", name: "Stage Capabilities",      tacticId: "TA0042" },
    ],
  },
  {
    id: "TA0001", shortId: "TA0001", name: "Initial Access",
    techniques: [
      { id: "T1189", name: "Drive-by Compromise",     tacticId: "TA0001" },
      { id: "T1190", name: "Exploit Public-Facing App", tacticId: "TA0001" },
      { id: "T1133", name: "External Remote Services", tacticId: "TA0001" },
      { id: "T1200", name: "Hardware Additions",      tacticId: "TA0001" },
      { id: "T1566", name: "Phishing",                tacticId: "TA0001" },
      { id: "T1091", name: "Replication via Removable Media", tacticId: "TA0001" },
      { id: "T1195", name: "Supply Chain Compromise", tacticId: "TA0001" },
      { id: "T1199", name: "Trusted Relationship",    tacticId: "TA0001" },
      { id: "T1078", name: "Valid Accounts",          tacticId: "TA0001" },
    ],
  },
  {
    id: "TA0002", shortId: "TA0002", name: "Execution",
    techniques: [
      { id: "T1059", name: "Command and Scripting Interpreter", tacticId: "TA0002" },
      { id: "T1609", name: "Container Admin Command", tacticId: "TA0002" },
      { id: "T1610", name: "Deploy Container",        tacticId: "TA0002" },
      { id: "T1203", name: "Exploitation for Client Execution", tacticId: "TA0002" },
      { id: "T1559", name: "Inter-Process Comm",      tacticId: "TA0002" },
      { id: "T1106", name: "Native API",              tacticId: "TA0002" },
      { id: "T1053", name: "Scheduled Task/Job",      tacticId: "TA0002" },
      { id: "T1129", name: "Shared Modules",          tacticId: "TA0002" },
      { id: "T1072", name: "Software Deployment Tools", tacticId: "TA0002" },
      { id: "T1569", name: "System Services",         tacticId: "TA0002" },
      { id: "T1204", name: "User Execution",          tacticId: "TA0002" },
      { id: "T1047", name: "WMI",                     tacticId: "TA0002" },
    ],
  },
  {
    id: "TA0003", shortId: "TA0003", name: "Persistence",
    techniques: [
      { id: "T1098", name: "Account Manipulation",    tacticId: "TA0003" },
      { id: "T1197", name: "BITS Jobs",               tacticId: "TA0003" },
      { id: "T1547", name: "Boot/Logon Autostart",    tacticId: "TA0003" },
      { id: "T1037", name: "Boot/Logon Init Scripts", tacticId: "TA0003" },
      { id: "T1176", name: "Browser Extensions",      tacticId: "TA0003" },
      { id: "T1554", name: "Compromise Client Binary", tacticId: "TA0003" },
      { id: "T1136", name: "Create Account",          tacticId: "TA0003" },
      { id: "T1543", name: "Create/Modify System Process", tacticId: "TA0003" },
      { id: "T1546", name: "Event Triggered Execution", tacticId: "TA0003" },
      { id: "T1133", name: "External Remote Services", tacticId: "TA0003" },
      { id: "T1574", name: "Hijack Execution Flow",   tacticId: "TA0003" },
      { id: "T1525", name: "Implant Internal Image",  tacticId: "TA0003" },
    ],
  },
  {
    id: "TA0004", shortId: "TA0004", name: "Privilege Escalation",
    techniques: [
      { id: "T1548", name: "Abuse Elevation Control", tacticId: "TA0004" },
      { id: "T1134", name: "Access Token Manipulation", tacticId: "TA0004" },
      { id: "T1068", name: "Exploitation for Privilege Escalation", tacticId: "TA0004" },
      { id: "T1484", name: "Domain Policy Modification", tacticId: "TA0004" },
      { id: "T1611", name: "Escape to Host",          tacticId: "TA0004" },
      { id: "T1546", name: "Event Triggered Execution", tacticId: "TA0004" },
      { id: "T1055", name: "Process Injection",       tacticId: "TA0004" },
      { id: "T1053", name: "Scheduled Task/Job",      tacticId: "TA0004" },
      { id: "T1078", name: "Valid Accounts",          tacticId: "TA0004" },
    ],
  },
  {
    id: "TA0005", shortId: "TA0005", name: "Defense Evasion",
    techniques: [
      { id: "T1548", name: "Abuse Elevation Control", tacticId: "TA0005" },
      { id: "T1134", name: "Access Token Manipulation", tacticId: "TA0005" },
      { id: "T1197", name: "BITS Jobs",               tacticId: "TA0005" },
      { id: "T1622", name: "Debugger Evasion",        tacticId: "TA0005" },
      { id: "T1140", name: "Deobfuscate/Decode Files", tacticId: "TA0005" },
      { id: "T1006", name: "Direct Volume Access",    tacticId: "TA0005" },
      { id: "T1484", name: "Domain Policy Modification", tacticId: "TA0005" },
      { id: "T1480", name: "Execution Guardrails",    tacticId: "TA0005" },
      { id: "T1211", name: "Exploitation for Defense Evasion", tacticId: "TA0005" },
      { id: "T1222", name: "File/Directory Permissions", tacticId: "TA0005" },
      { id: "T1564", name: "Hide Artifacts",          tacticId: "TA0005" },
      { id: "T1574", name: "Hijack Execution Flow",   tacticId: "TA0005" },
    ],
  },
  {
    id: "TA0006", shortId: "TA0006", name: "Credential Access",
    techniques: [
      { id: "T1110", name: "Brute Force",             tacticId: "TA0006" },
      { id: "T1555", name: "Credentials from Password Stores", tacticId: "TA0006" },
      { id: "T1212", name: "Exploitation for Credential Access", tacticId: "TA0006" },
      { id: "T1187", name: "Forced Authentication",   tacticId: "TA0006" },
      { id: "T1606", name: "Forge Web Credentials",   tacticId: "TA0006" },
      { id: "T1056", name: "Input Capture",           tacticId: "TA0006" },
      { id: "T1557", name: "Adversary-in-the-Middle", tacticId: "TA0006" },
      { id: "T1556", name: "Modify Auth Process",     tacticId: "TA0006" },
      { id: "T1040", name: "Network Sniffing",        tacticId: "TA0006" },
      { id: "T1003", name: "OS Credential Dumping",   tacticId: "TA0006" },
      { id: "T1528", name: "Steal Application Token", tacticId: "TA0006" },
      { id: "T1558", name: "Steal/Forge Kerberos",    tacticId: "TA0006" },
    ],
  },
  {
    id: "TA0007", shortId: "TA0007", name: "Discovery",
    techniques: [
      { id: "T1087", name: "Account Discovery",       tacticId: "TA0007" },
      { id: "T1010", name: "Application Window Discovery", tacticId: "TA0007" },
      { id: "T1217", name: "Browser Bookmark Discovery", tacticId: "TA0007" },
      { id: "T1580", name: "Cloud Infrastructure Discovery", tacticId: "TA0007" },
      { id: "T1538", name: "Cloud Service Dashboard", tacticId: "TA0007" },
      { id: "T1526", name: "Cloud Service Discovery", tacticId: "TA0007" },
      { id: "T1613", name: "Container/Resource Discovery", tacticId: "TA0007" },
      { id: "T1622", name: "Debugger Evasion",        tacticId: "TA0007" },
      { id: "T1482", name: "Domain Trust Discovery",  tacticId: "TA0007" },
      { id: "T1083", name: "File/Directory Discovery", tacticId: "TA0007" },
      { id: "T1046", name: "Network Service Discovery", tacticId: "TA0007" },
      { id: "T1135", name: "Network Share Discovery", tacticId: "TA0007" },
    ],
  },
  {
    id: "TA0008", shortId: "TA0008", name: "Lateral Movement",
    techniques: [
      { id: "T1210", name: "Exploitation of Remote Services", tacticId: "TA0008" },
      { id: "T1534", name: "Internal Spearphishing",  tacticId: "TA0008" },
      { id: "T1570", name: "Lateral Tool Transfer",   tacticId: "TA0008" },
      { id: "T1563", name: "Remote Service Session Hijacking", tacticId: "TA0008" },
      { id: "T1021", name: "Remote Services",         tacticId: "TA0008" },
      { id: "T1091", name: "Replication via Removable Media", tacticId: "TA0008" },
      { id: "T1072", name: "Software Deployment Tools", tacticId: "TA0008" },
      { id: "T1080", name: "Taint Shared Content",    tacticId: "TA0008" },
      { id: "T1550", name: "Use Alternate Auth Material", tacticId: "TA0008" },
    ],
  },
  {
    id: "TA0009", shortId: "TA0009", name: "Collection",
    techniques: [
      { id: "T1560", name: "Archive Collected Data",  tacticId: "TA0009" },
      { id: "T1123", name: "Audio Capture",           tacticId: "TA0009" },
      { id: "T1119", name: "Automated Collection",    tacticId: "TA0009" },
      { id: "T1115", name: "Clipboard Data",          tacticId: "TA0009" },
      { id: "T1213", name: "Data from Info Repositories", tacticId: "TA0009" },
      { id: "T1005", name: "Data from Local System",  tacticId: "TA0009" },
      { id: "T1039", name: "Data from Network Share", tacticId: "TA0009" },
      { id: "T1025", name: "Data from Removable Media", tacticId: "TA0009" },
      { id: "T1074", name: "Data Staged",             tacticId: "TA0009" },
      { id: "T1114", name: "Email Collection",        tacticId: "TA0009" },
      { id: "T1056", name: "Input Capture",           tacticId: "TA0009" },
      { id: "T1185", name: "Browser Session Hijacking", tacticId: "TA0009" },
    ],
  },
  {
    id: "TA0011", shortId: "TA0011", name: "Command and Control",
    techniques: [
      { id: "T1071", name: "Application Layer Protocol", tacticId: "TA0011" },
      { id: "T1092", name: "Communication via Removable Media", tacticId: "TA0011" },
      { id: "T1659", name: "Content Injection",       tacticId: "TA0011" },
      { id: "T1132", name: "Data Encoding",           tacticId: "TA0011" },
      { id: "T1001", name: "Data Obfuscation",        tacticId: "TA0011" },
      { id: "T1568", name: "Dynamic Resolution",      tacticId: "TA0011" },
      { id: "T1573", name: "Encrypted Channel",       tacticId: "TA0011" },
      { id: "T1008", name: "Fallback Channels",       tacticId: "TA0011" },
      { id: "T1105", name: "Ingress Tool Transfer",   tacticId: "TA0011" },
      { id: "T1104", name: "Multi-Stage Channels",    tacticId: "TA0011" },
      { id: "T1095", name: "Non-Application Layer Protocol", tacticId: "TA0011" },
      { id: "T1571", name: "Non-Standard Port",       tacticId: "TA0011" },
    ],
  },
  {
    id: "TA0010", shortId: "TA0010", name: "Exfiltration",
    techniques: [
      { id: "T1020", name: "Automated Exfiltration",  tacticId: "TA0010" },
      { id: "T1030", name: "Data Transfer Size Limits", tacticId: "TA0010" },
      { id: "T1048", name: "Exfiltration Over Alt Protocol", tacticId: "TA0010" },
      { id: "T1041", name: "Exfiltration Over C2 Channel", tacticId: "TA0010" },
      { id: "T1011", name: "Exfiltration Over Other Network", tacticId: "TA0010" },
      { id: "T1052", name: "Exfiltration Over Physical Medium", tacticId: "TA0010" },
      { id: "T1567", name: "Exfiltration Over Web Service", tacticId: "TA0010" },
      { id: "T1029", name: "Scheduled Transfer",      tacticId: "TA0010" },
      { id: "T1537", name: "Transfer Data to Cloud Account", tacticId: "TA0010" },
    ],
  },
  {
    id: "TA0040", shortId: "TA0040", name: "Impact",
    techniques: [
      { id: "T1531", name: "Account Access Removal",  tacticId: "TA0040" },
      { id: "T1485", name: "Data Destruction",        tacticId: "TA0040" },
      { id: "T1486", name: "Data Encrypted for Impact", tacticId: "TA0040" },
      { id: "T1565", name: "Data Manipulation",       tacticId: "TA0040" },
      { id: "T1491", name: "Defacement",              tacticId: "TA0040" },
      { id: "T1561", name: "Disk Wipe",               tacticId: "TA0040" },
      { id: "T1499", name: "Endpoint Denial of Service", tacticId: "TA0040" },
      { id: "T1495", name: "Firmware Corruption",     tacticId: "TA0040" },
      { id: "T1490", name: "Inhibit System Recovery", tacticId: "TA0040" },
      { id: "T1498", name: "Network Denial of Service", tacticId: "TA0040" },
      { id: "T1496", name: "Resource Hijacking",      tacticId: "TA0040" },
      { id: "T1489", name: "Service Stop",            tacticId: "TA0040" },
    ],
  },
];

export const ALL_TECHNIQUES: MitreTechnique[] = MITRE_TACTICS.flatMap((t) => t.techniques);
