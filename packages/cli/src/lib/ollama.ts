import { QaConfig, BusinessFlow, FlowStep } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `You are a Senior Software Engineer and QA Architect specialized in Reverse Engineering.
Your task is to analyze the provided source code and deduce all implicit business rules, flow conditions, and final scenarios.
Ignore low-level implementation details and focus strictly on relational logic ("If X happens, the system responds with Y").
Return ONLY a valid JSON object with this exact structure:

{
  "flows": [
    {
      "id": "flow-1",
      "name": "Descriptive flow name",
      "source_file": "path/to/file.ts",
      "controller_method": "methodName",
      "route": "/api/endpoint/path",
      "http_method": "POST",
      "initial_step": "step-1",
      "steps": [
        {
          "id": "step-1",
          "type": "conditional",
          "description": "Does the condition evaluate to true?",
          "condition": "technical description of the condition",
          "true_branch": "step-2",
          "false_branch": "step-3"
        },
        {
          "id": "step-2",
          "type": "process",
          "description": "Description of what this step does",
          "next": "step-4"
        },
        {
          "id": "step-3",
          "type": "final_scenario",
          "description": "Description of the final outcome",
          "is_success": false,
          "expected_http_code": 400,
          "error_category": "VALIDATION_ERROR"
        },
        {
          "id": "step-4",
          "type": "final_scenario",
          "description": "Resource created successfully",
          "is_success": true,
          "expected_http_code": 201
        }
      ]
    }
  ]
}

STRICT RULES:
- Return ONLY the JSON object, no extra text, no markdown fences, no explanations
- Each id must be a unique string like "flow-1", "step-1", "step-2", etc.
- Steps of type "conditional" must have true_branch and false_branch pointing to existing step ids
- Steps of type "final_scenario" are terminal — they have no next step reference
- error_category only applies when is_success is false`;

interface OllamaResponse {
  response: string;
  done: boolean;
}

interface OllamaFlowsPayload {
  flows: BusinessFlow[];
}

function assignRealIds(rawFlow: BusinessFlow): BusinessFlow {
  const idMap = new Map<string, string>();

  const remap = (oldId: string): string => {
    if (!idMap.has(oldId)) idMap.set(oldId, uuidv4());
    return idMap.get(oldId)!;
  };

  const newSteps: FlowStep[] = rawFlow.steps.map(step => {
    const newId = remap(step.id);

    if (step.type === 'conditional') {
      return {
        ...step,
        id: newId,
        true_branch: remap(step.true_branch),
        false_branch: remap(step.false_branch),
      };
    }

    if (step.type === 'process') {
      return {
        ...step,
        id: newId,
        next: remap(step.next),
      };
    }

    return { ...step, id: newId };
  });

  return {
    ...rawFlow,
    id: uuidv4(),
    initial_step: remap(rawFlow.initial_step),
    steps: newSteps,
  };
}

export async function analyzeWithOllama(
  sourceCode: string,
  filePath: string,
  config: QaConfig
): Promise<BusinessFlow[]> {
  const userMessage = `File: ${filePath}\n\nSource code:\n\`\`\`\n${sourceCode}\n\`\`\``;

  const payload = {
    model: config.ollama.model,
    system: SYSTEM_PROMPT,
    prompt: userMessage,
    stream: false,
    format: 'json',
    options: {
      temperature: 0.1,
      num_predict: 4096,
    },
  };

  const response = await fetch(`${config.ollama.endpoint}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.ollama.timeout_ms ?? 300_000),
  });

  if (!response.ok) {
    throw new Error(`Ollama returned error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as OllamaResponse;

  let parsed: OllamaFlowsPayload;
  try {
    parsed = JSON.parse(data.response) as OllamaFlowsPayload;
  } catch {
    throw new Error(`Ollama returned invalid JSON for ${filePath}`);
  }

  if (!parsed.flows || !Array.isArray(parsed.flows)) return [];

  return parsed.flows.map(flow => assignRealIds({ ...flow, source_file: filePath }));
}

export async function checkOllamaAvailability(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
