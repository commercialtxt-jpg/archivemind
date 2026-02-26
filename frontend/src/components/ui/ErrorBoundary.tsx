import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  isServerError: boolean;
}

/** Returns true when the error looks like a network / circuit-breaker failure. */
function detectServerError(error: Error): boolean {
  const msg = error.message?.toLowerCase() ?? '';
  return (
    msg.includes('circuit breaker') ||
    msg.includes('network error') ||
    msg.includes('server unavailable') ||
    msg.includes('econnrefused') ||
    msg.includes('econnaborted')
  );
}

/**
 * ErrorBoundary — wraps the entire app to prevent white-screen crashes.
 *
 * Two display modes:
 *  1. Server-error screen  — when the error looks like a connectivity failure.
 *  2. Generic error screen — for all other JS runtime errors.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isServerError: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      isServerError: detectServerError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isServerError: false,
    });
  };

  handleRetryConnection = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isServerError: false,
    });
  };

  toggleDetails = () => {
    this.setState((s) => ({ showDetails: !s.showDetails }));
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo, showDetails, isServerError } = this.state;

    // -----------------------------------------------------------------------
    // Server / network error screen
    // -----------------------------------------------------------------------
    if (isServerError) {
      return (
        <div
          className="flex items-center justify-center h-screen"
          style={{ background: 'var(--color-cream)', fontFamily: 'var(--font-sans)' }}
          role="alert"
          aria-live="assertive"
        >
          <div
            className="max-w-[480px] w-full mx-4 rounded-2xl p-8 text-center"
            style={{
              background: 'var(--color-card-bg)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl"
              style={{ background: 'rgba(196,132,74,0.08)' }}
              aria-hidden="true"
            >
              📡
            </div>

            <h1
              className="text-[22px] font-semibold mb-2"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}
            >
              Server Unavailable
            </h1>

            <p
              className="text-[14px] mb-6 leading-relaxed"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Unable to reach the server. Your data is safe — check your connection
              and try again.
            </p>

            <button
              onClick={this.handleRetryConnection}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all hover:opacity-90"
              style={{
                background: 'var(--color-coral)',
                boxShadow: '0 2px 8px rgba(207,106,76,0.3)',
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      );
    }

    // -----------------------------------------------------------------------
    // Generic error screen
    // -----------------------------------------------------------------------
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: 'var(--color-cream)', fontFamily: 'var(--font-sans)' }}
        role="alert"
        aria-live="assertive"
      >
        <div
          className="max-w-[480px] w-full mx-4 rounded-2xl p-8 text-center"
          style={{
            background: 'var(--color-card-bg)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl"
            style={{ background: 'rgba(207,106,76,0.08)' }}
            aria-hidden="true"
          >
            ⚠
          </div>

          {/* Heading */}
          <h1
            className="text-[22px] font-semibold mb-2"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-ink)' }}
          >
            Something went wrong
          </h1>

          <p
            className="text-[14px] mb-6 leading-relaxed"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            An unexpected error occurred. Your data is safe — this is likely a display
            issue that can be fixed by reloading.
          </p>

          {/* Actions */}
          <div className="flex gap-3 justify-center mb-4">
            <button
              onClick={this.handleReload}
              className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white cursor-pointer transition-all hover:opacity-90"
              style={{
                background: 'var(--color-coral)',
                boxShadow: '0 2px 8px rgba(207,106,76,0.3)',
              }}
            >
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-2 rounded-lg text-[13px] font-medium cursor-pointer transition-all hover:bg-sand"
              style={{
                background: 'var(--color-parchment)',
                color: 'var(--color-ink-soft)',
                border: '1px solid var(--color-border)',
              }}
            >
              Try Again
            </button>
          </div>

          {/* Error details — collapsible */}
          {error && (
            <div className="text-left mt-4">
              <button
                onClick={this.toggleDetails}
                className="text-[12px] cursor-pointer transition-colors"
                style={{ color: 'var(--color-ink-muted)' }}
                aria-expanded={showDetails}
                aria-controls="error-details"
              >
                {showDetails ? '▲ Hide details' : '▼ Show error details'}
              </button>

              {showDetails && (
                <div
                  id="error-details"
                  className="mt-3 p-3 rounded-lg overflow-auto max-h-48 text-[11px] leading-relaxed"
                  style={{
                    background: 'var(--color-parchment)',
                    color: 'var(--color-ink-soft)',
                    fontFamily: 'var(--font-mono)',
                    border: '1px solid var(--color-border-light)',
                  }}
                >
                  <div className="font-semibold mb-1" style={{ color: 'var(--color-coral)' }}>
                    {error.name}: {error.message}
                  </div>
                  {errorInfo?.componentStack && (
                    <pre
                      className="whitespace-pre-wrap break-words text-[10px] mt-2"
                      style={{ color: 'var(--color-ink-muted)' }}
                    >
                      {errorInfo.componentStack.trim()}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
