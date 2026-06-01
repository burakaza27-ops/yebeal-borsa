import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

/**
 * Granular Error Boundary — wraps individual dashboard sections so a crash
 * in one component doesn't blank out the entire application.
 * 
 * Usage:  <SectionErrorBoundary name="Marketplace">
 *           <Marketplace ... />
 *         </SectionErrorBoundary>
 */
class SectionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[SectionErrorBoundary:${this.props.name || 'unknown'}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 40, margin: 16, borderRadius: 16,
          background: 'hsla(0, 70%, 20%, 0.25)',
          border: '1px solid hsla(0, 60%, 50%, 0.4)',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
        }}>
          <AlertTriangle size={48} style={{ color: 'var(--red, #ef4444)', marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary, #fff)', marginBottom: 8 }}>
            {this.props.name ? `${this.props.name} failed to load` : 'Something went wrong'}
          </h2>
          <p style={{ color: 'var(--text-secondary, #aaa)', marginBottom: 24, maxWidth: 420, fontSize: '0.9rem', lineHeight: 1.6 }}>
            An unexpected error occurred in this section. Your data is safe. You can try again or refresh the page.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-gold"
              onClick={this.handleRetry}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <RefreshCcw size={16} />
              Retry
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
