// HTML utilities: strip HTML to plain text and extract first image URL
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc && doc.body) {
      doc
        .querySelectorAll("script, style, noscript")
        .forEach((n) => n.remove());
      const text = doc.body.textContent || "";
      return text.replace(/\s+/g, " ").trim() || null;
    }
  } catch (e) {
    // fallback
  }
  return (
    String(html)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}

export function decodeHtmlEntities(
  text: string | null | undefined,
): string | null {
  if (!text) return null;
  try {
    const doc = new DOMParser().parseFromString(
      `<div>${text}</div>`,
      "text/html",
    );
    return doc.body.textContent || text;
  } catch {
    // Fallback for environments without DOMParser (e.g. Deno Deploy)
    const entities: Record<string, string> = {
      "&amp;": "&",
      "&lt;": "<",
      "&gt;": ">",
      "&quot;": '"',
      "&apos;": "'",
      "&nbsp;": " ",
    };
    return text.replace(
      /&[a-z]+;/gi,
      (match) => entities[match.toLowerCase()] || match,
    );
  }
}

export function decodeNumericEntities(
  text: string | null | undefined,
): string | null {
  if (!text || typeof text !== "string") return null;
  return text.replace(/&#(x?[0-9a-f]+);/gi, (match, code) => {
    const base = code.startsWith("x") ? 16 : 10;
    const num = parseInt(code.replace(/^x/, ""), base);
    return String.fromCharCode(num);
  });
}

export function decodeText(text: string | null | undefined): string | null {
  if (!text) return null;
  return decodeHtmlEntities(decodeNumericEntities(text));
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
