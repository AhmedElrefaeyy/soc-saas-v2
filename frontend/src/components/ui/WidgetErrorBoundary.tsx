import React from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface State {
  hasError: boolean;
}

interface Props {
  children: ReactNode;
  title?: string;
}

export class WidgetErrorBoundary extends React.Component<Props, State> {
  displayName = "WidgetErrorBoundary";
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[120px] rounded-lg border border-border bg-bg-subtle p-4 gap-2">
          <AlertTriangle className="w-5 h-5 text-sev-medium" />
          <p className="text-xs text-text-muted">{this.props.title ?? "Widget"} unavailable</p>
          <button
            className="text-2xs text-accent hover:underline"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
