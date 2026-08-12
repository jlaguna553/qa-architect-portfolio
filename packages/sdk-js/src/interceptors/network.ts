import { NetworkTrace } from '../types';

type NetworkCallback = (trace: NetworkTrace) => void;

const originalFetch = window.fetch.bind(window);
const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;

let patchedFetch = false;
let patchedXHR = false;

export function patchFetch(onCapture: NetworkCallback, localOnlyFilter: string): void {
  if (patchedFetch) return;
  patchedFetch = true;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (!url.includes(localOnlyFilter) && !url.startsWith('/')) {
      return originalFetch(input, init);
    }

    const startTime = Date.now();
    const method = (init?.method ?? 'GET').toUpperCase();

    let requestBody: unknown = undefined;
    if (init?.body) {
      try {
        requestBody = JSON.parse(init.body as string);
      } catch {
        requestBody = init.body;
      }
    }

    const requestHeaders: Record<string, string> = {};
    if (init?.headers) {
      const h = new Headers(init.headers);
      h.forEach((value, key) => { requestHeaders[key] = value; });
    }

    try {
      const response = await originalFetch(input, init);
      const cloned = response.clone();

      let responseBody: unknown = undefined;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        try { responseBody = await cloned.json(); } catch { /* ignore */ }
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => { responseHeaders[key] = value; });

      onCapture({
        url,
        method,
        requestHeaders,
        requestBody,
        responseStatus: response.status,
        responseBody,
        responseHeaders,
        durationMs: Date.now() - startTime,
      });

      return response;
    } catch (error) {
      onCapture({
        url,
        method,
        requestHeaders,
        requestBody,
        responseStatus: 0,
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}

export function patchXHR(onCapture: NetworkCallback, localOnlyFilter: string): void {
  if (patchedXHR) return;
  patchedXHR = true;

  XMLHttpRequest.prototype.open = function (
    this: XMLHttpRequest & { _qaMethod?: string; _qaUrl?: string },
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    this._qaMethod = method.toUpperCase();
    this._qaUrl = String(url);
    return (originalXHROpen as Function).call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (
    this: XMLHttpRequest & { _qaMethod?: string; _qaUrl?: string; _qaStartTime?: number },
    body?: Document | XMLHttpRequestBodyInit | null
  ) {
    const url = this._qaUrl ?? '';
    if (!url.includes(localOnlyFilter) && !url.startsWith('/')) {
      return (originalXHRSend as Function).call(this, body);
    }

    this._qaStartTime = Date.now();
    const method = this._qaMethod ?? 'GET';

    let requestBody: unknown;
    if (body) {
      try { requestBody = JSON.parse(body as string); } catch { requestBody = body; }
    }

    this.addEventListener('loadend', () => {
      let responseBody: unknown;
      const contentType = this.getResponseHeader('content-type') ?? '';
      if (contentType.includes('application/json')) {
        try { responseBody = JSON.parse(this.responseText); } catch { /* ignore */ }
      }

      onCapture({
        url,
        method,
        requestHeaders: {},
        requestBody,
        responseStatus: this.status,
        responseBody,
        durationMs: Date.now() - (this._qaStartTime ?? Date.now()),
      });
    });

    return (originalXHRSend as Function).call(this, body);
  };
}

export function restoreNetwork(): void {
  if (patchedFetch) {
    window.fetch = originalFetch;
    patchedFetch = false;
  }
  if (patchedXHR) {
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
    patchedXHR = false;
  }
}
