import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-10 max-w-lg rounded-2xl bg-white p-6 text-center shadow-card">
          <h2 className="text-xl font-bold">Something went wrong</h2>
          <a className="mt-3 inline-block text-sage underline" href="/">Back Home</a>
        </div>
      )
    }
    return this.props.children
  }
}
