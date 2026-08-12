export interface QaConfig {
  project_name: string;
  language: 'PHP' | 'Python' | 'JavaScript' | 'TypeScript';
  framework: string;
  source_directories: string[];
  custom_patterns?: string[];
  exclude_patterns?: string[];
  ollama: {
    model: string;
    endpoint: string;
    timeout_ms?: number;
    delay_between_ms?: number;
    retry_attempts?: number;
  };
  sdk?: {
    port: number;
  };
}

export interface ConditionalStep {
  id: string;
  type: 'conditional';
  description: string;
  condition: string;
  true_branch: string;
  false_branch: string;
}

export interface FinalScenarioStep {
  id: string;
  type: 'final_scenario';
  description: string;
  is_success: boolean;
  expected_http_code: number;
  error_category?: string;
}

export interface ProcessStep {
  id: string;
  type: 'process';
  description: string;
  next: string;
}

export type FlowStep = ConditionalStep | FinalScenarioStep | ProcessStep;

export interface BusinessFlow {
  id: string;
  name: string;
  source_file: string;
  controller_method: string;
  route: string;
  http_method: string;
  initial_step: string;
  steps: FlowStep[];
}

export interface RulesFile {
  generated_at: string;
  project_name: string;
  flows: BusinessFlow[];
  file_hashes?: Record<string, string>;
}

export interface TraceRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface TraceResponse {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface TraceException {
  class: string;
  message: string;
  file: string;
  line: number;
  stack_trace: string[];
}

export interface TraceContext {
  controller?: string;
  method?: string;
  route?: string;
  exception?: TraceException;
}

export interface TraceEvent {
  trace_id: string;
  timestamp: string;
  type: 'http' | 'ui_event' | 'screenshot';
  request?: TraceRequest;
  response?: TraceResponse;
  context?: TraceContext;
  screenshot_base64?: string;
  ui_event?: {
    type: string;
    selector: string;
    text: string;
    url: string;
  };
}

export interface TracesFile {
  traces: TraceEvent[];
}
