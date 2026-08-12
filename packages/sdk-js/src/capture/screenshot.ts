export async function captureScreenshot(): Promise<string | null> {
  // Prefer native Screen Capture API (requires user permission, best for tools)
  // Fallback to html2canvas if available in the environment
  try {
    if (typeof window === 'undefined') return null;

    // Try html2canvas if available (must be installed separately)
    const html2canvas = (window as unknown as Record<string, unknown>)['html2canvas'] as
      | ((el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>)
      | undefined;

    if (html2canvas) {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        scale: 0.75,
        logging: false,
      });
      return canvas.toDataURL('image/webp', 0.8);
    }

    return null;
  } catch {
    return null;
  }
}
