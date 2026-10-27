import { ConfigurationError } from "../../application/configuration";

export function StartupFailure({ error }: { error: unknown }) {
  return <main className="startup-fallback">
    <h1>{error instanceof ConfigurationError ? "A setup step needs attention." : "A little space is still here."}</h1>
    <p>{error instanceof ConfigurationError ? error.message : "The interactive application could not start. You can still open our lightweight help page."}</p>
    <a href="/help/">Open Get Help</a>
  </main>;
}
