import { useQuery } from "@tanstack/react-query";
import { Maximize2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { socMetricsApi } from "@/api/soc-metrics";
import type { GeoThreat } from "@/api/soc-metrics";
import type { DashboardTimeRange } from "../types/dashboard";

// ─── Sample fallback data ─────────────────────────────────────────────────────
// TODO: wire to /dashboard/geo-threats when backend endpoint is ready

const SAMPLE_THREATS: GeoThreat[] = [
  { lat: 37.77, lng: -122.41, severity: "critical", count: 12, country: "United States" },
  { lat: 51.50, lng: -0.12,   severity: "high",     count: 7,  country: "United Kingdom" },
  { lat: 48.85, lng: 2.35,    severity: "medium",   count: 4,  country: "France"         },
  { lat: 52.52, lng: 13.41,   severity: "low",      count: 2,  country: "Germany"        },
  { lat: 55.75, lng: 37.62,   severity: "high",     count: 9,  country: "Russia"         },
  { lat: 39.91, lng: 116.39,  severity: "critical", count: 18, country: "China"          },
  { lat: 35.68, lng: 139.69,  severity: "medium",   count: 5,  country: "Japan"          },
  { lat: -23.5, lng: -46.63,  severity: "low",      count: 3,  country: "Brazil"         },
  { lat: 1.35,  lng: 103.82,  severity: "medium",   count: 6,  country: "Singapore"      },
  { lat: 19.07, lng: 72.87,   severity: "high",     count: 8,  country: "India"          },
];

const SEV_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high:     "#F97316",
  medium:   "#F59E0B",
  low:      "#6B7280",
  info:     "#3B82F6",
};

// ─── Simple SVG world map approximation ──────────────────────────────────────
// Projects lat/lng to a simple Equirectangular projection on a 600×300 canvas.

function geoToSvg(lat: number, lng: number, w: number, h: number): [number, number] {
  const x = ((lng + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return [x, y];
}

interface Props {
  timeRange: DashboardTimeRange;
}

export function GeoThreatMap({ timeRange }: Props) {
  const navigate = useNavigate();
  void timeRange;

  const { data } = useQuery({
    queryKey: ["geo-threats", timeRange],
    queryFn: () => socMetricsApi.getGeoThreats(timeRange).catch(() => SAMPLE_THREATS),
    staleTime: 120_000,
    placeholderData: SAMPLE_THREATS,
  });

  const threats = (data ?? SAMPLE_THREATS);
  const W = 600, H = 280;

  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted">Geo Threat Map</h3>
        <button
          onClick={() => navigate("/geo-map")}
          aria-label="Full screen geo map"
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      <div className="relative rounded-lg overflow-hidden bg-[#0d1117]" style={{ height: H }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
          {/* Ocean background */}
          <rect width={W} height={H} fill="#0d1117" />
          {/* Grid lines (parallels & meridians) */}
          {[-60,-30,0,30,60].map((lat) => {
            const [,y] = geoToSvg(lat, 0, W, H);
            return <line key={`lat-${lat}`} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />;
          })}
          {[-120,-60,0,60,120].map((lng) => {
            const [x] = geoToSvg(0, lng, W, H);
            return <line key={`lng-${lng}`} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />;
          })}

          {/* Threat markers */}
          {threats.map((t, i) => {
            const [x, y] = geoToSvg(t.lat, t.lng, W, H);
            const r = Math.max(4, Math.min(18, Math.sqrt(t.count) * 2.5));
            const color = SEV_COLORS[t.severity] ?? SEV_COLORS.info;
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={r} fill={color} opacity={0.25} />
                <circle cx={x} cy={y} r={r * 0.5} fill={color} opacity={0.8} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        {Object.entries(SEV_COLORS).slice(0, 4).map(([sev, color]) => (
          <span key={sev} className="flex items-center gap-1 text-2xs text-text-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            {sev}
          </span>
        ))}
        <span className="ml-auto text-2xs text-text-muted">{threats.length} threat sources</span>
      </div>
    </div>
  );
}
