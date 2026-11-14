"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class VoyageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("VoyageErrorBoundary caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[480px] flex items-center justify-center p-6">
          <div className="glass-panel p-8 max-w-md w-full text-center rounded-2xl border border-white/10 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-pastel-peach/15 border border-pastel-peach/30 flex items-center justify-center mx-auto text-pastel-peach">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold font-heading text-[#F1EEFF]">
              The voyage could not start. Try refreshing.
            </h2>
            <p className="text-sm text-cosmic-muted leading-relaxed">
              A 3D graphics context error occurred. Refreshing the mission or checking WebGL hardware acceleration usually resolves this.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-[#F1EEFF] text-sm font-semibold transition-all inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Canvas
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-sky text-cosmic-bg text-sm font-bold shadow-lg hover:opacity-95 transition-all inline-flex items-center justify-center gap-2"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
