import React from "react";
import { Share2 } from "lucide-react";
import { GraphView } from "../graph/GraphView";
import { useInvGraph } from "../../hooks/useInvestigationDetail";

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {[1, 2, 3].map((i) => <div key={i} className="skel h-20 rounded-lg" />)}
    </div>
  );
}

interface Props {
  id: string;
  isActive: boolean;
}

export const GraphTab = React.memo(function GraphTab({ id, isActive }: Props) {
  const { data, isLoading } = useInvGraph(id, { enabled: isActive });

  if (isLoading) return <TabSkeleton />;
  if (!data || data.node_count === 0) {
    return (
      <div className="text-center py-16">
        <Share2 size={36} className="text-text-disabled block mx-auto mb-3" />
        <div className="text-sm font-semibold text-text-muted mb-1.5">No graph data</div>
        <div className="text-xs text-text-disabled">
          The attack graph will be generated as events are correlated
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs text-text-muted mb-3">
        {data.node_count} nodes · {data.edge_count} connections · depth {data.max_depth}
      </div>
      <GraphView nodes={data.nodes} edges={data.edges} />
    </div>
  );
});
