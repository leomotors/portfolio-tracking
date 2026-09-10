/**
 * Blocking inline script that does not trip React 19's client-render warning.
 *
 * Next.js documents this type switch in "Preventing Flash": the browser
 * executes `text/javascript` from SSR HTML before paint; on the client the
 * same tag is `text/plain` so React will not try (and fail) to run it.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
