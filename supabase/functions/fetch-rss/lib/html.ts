// HTML utilities: strip HTML to plain text and extract first image URL
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc) {
      doc
        .querySelectorAll("script, style, noscript")
        .forEach((n) => n.remove());
      const text = doc.body?.textContent || "";
      return text.replace(/\s+/g, " ").trim() || null;
    }
  } catch (e) {
    // fallback
  }
  return (
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

export function extractFirstImageFromHtml(
  html: string | null | undefined,
  base?: string,
): string | null {
  if (!html) return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc) {
      const img = doc.querySelector("img[src]") as HTMLImageElement | null;
      if (img && img.getAttribute("src")) {
        const src = img.getAttribute("src")!;
        try {
          return base ? new URL(src, base).toString() : src;
        } catch {
          return src;
        }
      }
      const metaOg = doc.querySelector(
        'meta[property="og:image"]',
      ) as HTMLMetaElement | null;
      if (metaOg && (metaOg.getAttribute("content") || metaOg.content))
        return metaOg.getAttribute("content") || metaOg.content;
      const metaTw = doc.querySelector(
        'meta[name="twitter:image"]',
      ) as HTMLMetaElement | null;
      if (metaTw && (metaTw.getAttribute("content") || metaTw.content))
        return metaTw.getAttribute("content") || metaTw.content;
    }
  } catch (e) {
    // ignore
  }
  const m = html.match(/<img[^>]+src=["']?([^"' >]+)["']?/i);
  if (m && m[1]) {
    try {
      return base ? new URL(m[1], base).toString() : m[1];
    } catch {
      return m[1];
    }
  }
  return null;
}
