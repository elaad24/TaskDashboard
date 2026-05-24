import { Component, type ErrorInfo, type ReactNode } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info);
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null });
  };

  override render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <GlassCard variant="danger" glow className="max-w-lg p-6">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-danger-400">
            Navigator offline
          </div>
          <h1 className="mt-2 text-lg font-semibold text-text-main">Something went wrong.</h1>
          <p className="mt-2 text-sm text-text-soft">
            The dashboard hit an unexpected error. Try reloading. If it persists, check the
            backend logs.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded-md border border-border-subtle bg-black/30 p-3 font-mono text-[11px] text-text-soft">
            {this.state.error.message}
          </pre>
          <div className="mt-4 flex gap-2">
            <GlowButton onClick={this.handleReset}>Try again</GlowButton>
            <GlowButton variant="ghost" onClick={() => window.location.reload()}>
              Reload
            </GlowButton>
          </div>
        </GlassCard>
      </div>
    );
  }
}
