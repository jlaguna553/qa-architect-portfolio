import fs from 'fs';
import path from 'path';
import { RulesFile, TracesFile, TraceEvent } from '../types';

const QA_DIR = '.qa-architect';

export function getQaDir(projectRoot: string = process.cwd()): string {
  return path.join(projectRoot, QA_DIR);
}

export function ensureQaDir(projectRoot: string = process.cwd()): string {
  const dir = getQaDir(projectRoot);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveRules(rules: RulesFile, projectRoot?: string): void {
  const dir = ensureQaDir(projectRoot);
  fs.writeFileSync(path.join(dir, 'rules.json'), JSON.stringify(rules, null, 2), 'utf-8');
}

export function loadRules(projectRoot?: string): RulesFile | null {
  const filePath = path.join(getQaDir(projectRoot), 'rules.json');
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RulesFile;
}

export function loadTraces(projectRoot?: string): TracesFile {
  const filePath = path.join(getQaDir(projectRoot), 'traces.json');
  if (!fs.existsSync(filePath)) return { traces: [] };
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TracesFile;
}

export function appendTrace(trace: TraceEvent, projectRoot?: string): void {
  const dir = ensureQaDir(projectRoot);
  const filePath = path.join(dir, 'traces.json');
  const current = loadTraces(projectRoot);
  current.traces.push(trace);
  if (current.traces.length > 500) current.traces = current.traces.slice(-500);
  fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
}

export function saveScreenshot(traceId: string, base64Data: string, projectRoot?: string): string {
  const dir = ensureQaDir(projectRoot);
  const screenshotsDir = path.join(dir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  const filePath = path.join(screenshotsDir, `${traceId}.webp`);
  const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getScreenshotPath(traceId: string, projectRoot?: string): string | null {
  const filePath = path.join(getQaDir(projectRoot), 'screenshots', `${traceId}.webp`);
  return fs.existsSync(filePath) ? filePath : null;
}

export function updateStepDescription(flowId: string, stepId: string, description: string, projectRoot?: string): boolean {
  const rules = loadRules(projectRoot);
  if (!rules) return false;
  const flow = rules.flows.find(f => f.id === flowId);
  if (!flow) return false;
  const step = flow.steps.find(s => s.id === stepId);
  if (!step) return false;
  step.description = description;
  saveRules(rules, projectRoot);
  return true;
}
