import React from 'react';
import { ArrowClockwise, WarningCircle } from '@phosphor-icons/react';

const RELOAD_FLAG = 'eg_stale_reload';
// A null React dispatcher ("reading 'useState'") means the browser is holding a stale or
// mixed set of modules, for example after the dev server re-bundled. A reload fixes it.
const isStaleModuleError = (error) => /Cannot read properties of null \(reading 'use[A-Z]\w*'\)/.test(String((error && error.message) || error));

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ElderGuard React Boundary caught an error:", error, errorInfo);
    try {
      if (isStaleModuleError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
      }
    } catch (_) {}
  }

  componentDidMount() {
    // Allow another automatic recovery later, but never loop within a few seconds
    this.clearFlagTimer = setTimeout(() => {
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch (_) {}
    }, 5000);
  }

  componentWillUnmount() {
    clearTimeout(this.clearFlagTimer);
  }

  handleTryAgain = () => {
    if (isStaleModuleError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  handleReset = () => {
    try {
      localStorage.removeItem('elderguard_current_view');
      localStorage.removeItem('elderguard_active_tab');
    } catch (_) {}
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#2E2E2E] flex flex-col items-center justify-center p-6 text-center font-inter">
          <div className="bg-white border border-[#EBE3D5] rounded-3xl p-8 max-w-md w-full shadow-xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
              <WarningCircle size={32} weight="fill" aria-hidden="true" />
            </div>
            <h2 className="font-fraunces text-2xl font-bold text-[#2E2E2E]">Display Refresh Recovery</h2>
            <p className="text-sm text-[#6B7280]">
              An unexpected display error occurred during page view. Click below to safely retry or restore your view.
            </p>
            {this.state.error && (
              <p className="text-xs text-red-500 font-mono bg-red-50 p-2.5 rounded-xl text-left overflow-x-auto max-h-24">
                {this.state.error.toString()}
              </p>
            )}
            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleTryAgain}
                className="w-full py-3.5 rounded-2xl bg-[#1B6B93] hover:bg-[#155373] text-white font-bold text-sm shadow-md transition cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <ArrowClockwise size={18} weight="bold" aria-hidden="true" /> Try again
              </button>
              <button
                onClick={this.handleReset}
                className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
              >
                Reload Dashboard View
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
