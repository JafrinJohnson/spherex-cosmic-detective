"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ThreeErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ThreeErrorBoundary caught an error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="w-full h-full min-h-[360px] rounded-2xl bg-[#0B0B1E]/80 border border-white/15 p-6 flex flex-col items-center justify-center text-center gap-3">
          <AlertCircle className="w-8 h-8 text-pastel-peach" />
          <div className="space-y-1">
            <h3 className="font-heading text-base font-bold text-cosmic-text">
              3D Sky Globe Offline
            </h3>
            <p className="text-xs text-cosmic-muted max-w-sm">
              The 3D canvas encountered an issue. You can still search coordinates and investigate any sky target directly.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="mt-2 min-h-[44px] px-4 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-cosmic-text border border-white/15 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry 3D Globe</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
