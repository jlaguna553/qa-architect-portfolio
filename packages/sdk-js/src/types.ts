export interface NetworkTrace {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  durationMs: number;
  error?: string;
}

export interface UIEventTrace {
  type: 'click' | 'submit';
  selector: string;
  text: string;
  url: string;
}

export interface TracePayload {
  trace_id: string;
  timestamp: string;
  type: 'http' | 'ui_event' | 'screenshot';
  request?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: unknown;
  };
  response?: {
    status: number;
    body?: unknown;
    headers?: Record<string, string>;
  };
  ui_event?: UIEventTrace;
  screenshot_base64?: string;
}

export interface QaArchitectConfig {
  endpoint?: string;
  captureNetwork?: boolean;
  captureEvents?: boolean;
  captureScreenshots?: boolean;
  localFilter?: string;
  retryAttempts?: number;
}
