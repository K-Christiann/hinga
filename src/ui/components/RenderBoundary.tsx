import { Component, type ReactNode } from "react";
import type { DiagnosticSink } from "../../domain/operations";

export class RenderBoundary extends Component<{ sink: DiagnosticSink; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.sink.capture("render_error"); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="startup-fallback"><h1>A little space is still here.</h1>
      <p>This page could not continue. An unconfirmed draft may be lost if you reload. You can still open Get Help.</p>
      <button type="button" onClick={() => window.location.reload()}>Reload this page</button>{" "}
      <a href="/help/">Open Get Help</a></main>;
  }
}
