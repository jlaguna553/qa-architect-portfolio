import { QaArchitectConfig, NetworkTrace, UIEventTrace, TracePayload } from './types';
import { patchFetch, patchXHR, restoreNetwork } from './interceptors/network';
import { attachEventListeners, detachEventListeners } from './interceptors/events';
import { captureScreenshot } from './capture/screenshot';
import { sendTrace } from './transport/sender';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const DEFAULT_CONFIG: Required<QaArchitectConfig> = {
  endpoint: 'http://localhost:9000',
  captureNetwork: true,
  captureEvents: true,
  captureScreenshots: true,
  localFilter: 'localhost',
  retryAttempts: 2,
};

class QaArchitectSDK {
  private config: Required<QaArchitectConfig>;
  private active = false;

  constructor(config: QaArchitectConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    if (this.config.captureNetwork) {
      patchFetch(trace => void this.handleNetworkTrace(trace), this.config.localFilter);
      patchXHR(trace => void this.handleNetworkTrace(trace), this.config.localFilter);
    }
    if (this.config.captureEvents) attachEventListeners(event => void this.handleUIEvent(event));
    window.addEventListener('error', event => void this.handleJSError(event));
    window.addEventListener('unhandledrejection', event => void this.handleJSError(event));
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    restoreNetwork();
    detachEventListeners();
  }

  private async handleNetworkTrace(trace: NetworkTrace): Promise<void> {
    const isAnomaly = trace.responseStatus >= 400 || trace.error !== undefined;
    let screenshotBase64: string | undefined;
    if (isAnomaly && this.config.captureScreenshots) screenshotBase64 = await captureScreenshot() ?? undefined;

    await sendTrace({
      trace_id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'http',
      request: { url: trace.url, method: trace.method, headers: trace.requestHeaders, body: trace.requestBody },
      response: { status: trace.responseStatus, body: trace.responseBody, headers: trace.responseHeaders },
      screenshot_base64: screenshotBase64,
    }, { endpoint: this.config.endpoint, retryAttempts: this.config.retryAttempts });
  }

  private async handleUIEvent(event: UIEventTrace): Promise<void> {
    await sendTrace({
      trace_id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'ui_event',
      ui_event: event,
    }, { endpoint: this.config.endpoint, retryAttempts: this.config.retryAttempts });
  }

  private async handleJSError(event: ErrorEvent | PromiseRejectionEvent): Promise<void> {
    let screenshotBase64: string | undefined;
    if (this.config.captureScreenshots) screenshotBase64 = await captureScreenshot() ?? undefined;
    const isErrorEvent = event instanceof ErrorEvent;

    await sendTrace({
      trace_id: generateId(),
      timestamp: new Date().toISOString(),
      type: 'screenshot',
      request: {
        url: window.location.href,
        method: 'CLIENT_ERROR',
        headers: {},
        body: { type: isErrorEvent ? 'uncaught_error' : 'unhandled_rejection', message: isErrorEvent ? event.message : String(event.reason) },
      },
      response: { status: 0 },
      screenshot_base64: screenshotBase64,
    }, { endpoint: this.config.endpoint, retryAttempts: this.config.retryAttempts });
  }
}

let sdkInstance: QaArchitectSDK | null = null;

export function initQaArchitect(config?: QaArchitectConfig): QaArchitectSDK {
  if (sdkInstance) sdkInstance.stop();
  sdkInstance = new QaArchitectSDK(config);
  sdkInstance.start();
  return sdkInstance;
}

export { QaArchitectSDK };
export type { QaArchitectConfig };
