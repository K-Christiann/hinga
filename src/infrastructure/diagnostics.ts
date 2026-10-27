import type { DiagnosticCode, DiagnosticSink } from "../domain/operations";

/** Fixed codes only: no error object, stack, URL, user ID or content can cross
 * this port. Best-effort reporting must never interfere with saving or help. */
export function diagnosticSink(send: (code: DiagnosticCode) => Promise<void>, now = Date.now): DiagnosticSink {
  let nextAt = 0; let hour = -1; let count = 0;
  return { capture(code) {
    if (!["render_error", "unhandled_error", "unhandled_rejection"].includes(code)) return;
    const time = now(); const currentHour = Math.floor(time / 3600000);
    if (hour !== currentHour) { hour = currentHour; count = 0; }
    if (time < nextAt || count >= 10) return;
    nextAt = time + 30000; count++;
    void Promise.resolve().then(() => send(code)).catch(() => undefined);
  } };
}
export function installGlobalDiagnostics(sink: DiagnosticSink) {
  const error = () => sink.capture("unhandled_error");
  const rejection = () => sink.capture("unhandled_rejection");
  window.addEventListener("error", error); window.addEventListener("unhandledrejection", rejection);
  return () => { window.removeEventListener("error", error); window.removeEventListener("unhandledrejection", rejection); };
}
