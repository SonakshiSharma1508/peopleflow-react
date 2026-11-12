import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="error-boundary">
          <h1>Let’s find our footing.</h1>
          <p>
            The interface could not finish rendering. Reload the page to return to your saved demo.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload PeopleFlow
          </button>
        </main>
      );
    return this.props.children;
  }
}
