import { Component, type ErrorInfo, type ReactNode } from 'react';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  variant?: 'factory' | 'handheld';
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route render failed', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isHandheld = this.props.variant === 'handheld';

    return (
      <div className={isHandheld ? 'hh-route-error' : 'fx-route-error'} role="alert">
        <h2>{isHandheld ? 'โหลดหน้าไม่สำเร็จ' : 'Page failed to load'}</h2>
        <p>{error.message || 'Unexpected error'}</p>
        <div className={isHandheld ? 'hh-route-error__actions' : 'fx-route-error__actions'}>
          <button type="button" className="fx-btn fx-btn-secondary" onClick={this.handleRetry}>
            ลองอีกครั้ง
          </button>
          <button type="button" className="fx-btn fx-btn-primary" onClick={this.handleReload}>
            รีเฟรชหน้า
          </button>
        </div>
      </div>
    );
  }
}
