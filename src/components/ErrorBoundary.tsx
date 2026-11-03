import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/** Last line of defence: shows a recovery screen instead of a blank page if rendering crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('DzSuya crashed', error, info.componentStack)
  }

  private reset = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('suya:') && !key.startsWith('suya:claim:')) localStorage.removeItem(key)
      }
    } catch {
      /* storage unavailable */
    }
    window.location.assign('/')
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="flex min-h-dvh items-center justify-center bg-coal-900 p-6 text-center">
        <div className="surface max-w-sm rounded-3xl p-8">
          <h1 className="display text-2xl font-bold text-cream-50">Something went wrong</h1>
          <p className="mt-2 text-sm text-cream-300">
            The page hit a problem. Your payments and orders are safe onchain. Reload to try again, or clear the saved cart
            on this device if it keeps happening.
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary focus-ring mt-5 min-h-[52px] w-full rounded-2xl text-sm">
            Reload
          </button>
          <button onClick={this.reset} className="btn-ghost focus-ring mt-2 min-h-[48px] w-full rounded-2xl text-sm">
            Clear saved cart and reload
          </button>
        </div>
      </div>
    )
  }
}
