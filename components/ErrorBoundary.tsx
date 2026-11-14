import React, { ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
}

export class ErrorBoundary extends React.Component<Props, { hasError: boolean }> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="glass p-6 rounded-xl text-center text-cosmic-text">
          The voyage could not start. Try refreshing.
        </div>
      );
    }
    return this.props.children;
  }
}
