import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { loadRules, loadTraces, appendTrace, saveScreenshot, getScreenshotPath, updateStepDescription } from './storage';
import { TraceEvent } from '../types';

const DASHBOARD_BUILD_PATH = path.join(__dirname, '..', '..', 'dashboard-build');

export function createServer(projectRoot: string): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  if (fs.existsSync(DASHBOARD_BUILD_PATH)) {
    app.use(express.static(DASHBOARD_BUILD_PATH));
  }

  app.get('/api/rules', (_req, res) => {
    const rules = loadRules(projectRoot);
    if (!rules) return res.status(404).json({ error: 'No rules found. Run "qa-architect analyze" first.' });
    res.json(rules);
  });

  app.get('/api/traces', (_req, res) => {
    res.json(loadTraces(projectRoot));
  });

  app.post('/api/traces', (req, res) => {
    const trace = req.body as TraceEvent;
    if (!trace.trace_id) trace.trace_id = uuidv4();
    if (!trace.timestamp) trace.timestamp = new Date().toISOString();

    if (trace.screenshot_base64) {
      saveScreenshot(trace.trace_id, trace.screenshot_base64, projectRoot);
      trace.screenshot_base64 = undefined;
    }

    appendTrace(trace, projectRoot);
    res.status(201).json({ trace_id: trace.trace_id });
  });

  app.get('/api/screenshots/:traceId', (req, res) => {
    const filePath = getScreenshotPath(req.params.traceId, projectRoot);
    if (!filePath) return res.status(404).json({ error: 'Screenshot not found' });
    res.sendFile(filePath);
  });

  app.put('/api/rules/:flowId/steps/:stepId', (req, res) => {
    const { flowId, stepId } = req.params;
    const { description } = req.body as { description: string };
    if (!description) return res.status(400).json({ error: '"description" field is required' });
    const updated = updateStepDescription(flowId, stepId, description, projectRoot);
    if (!updated) return res.status(404).json({ error: 'Flow or step not found' });
    res.json({ success: true });
  });

  app.get('/api/status', (_req, res) => {
    const rules = loadRules(projectRoot);
    const traces = loadTraces(projectRoot);
    res.json({
      status: 'ok',
      rules_loaded: rules !== null,
      total_flows: rules?.flows.length ?? 0,
      total_traces: traces.traces.length,
    });
  });

  app.get('*', (_req, res) => {
    const indexPath = path.join(DASHBOARD_BUILD_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({
        message: 'QA Architect API running. Dashboard not available in dev mode.',
        endpoints: ['/api/rules', '/api/traces', '/api/status'],
      });
    }
  });

  return app;
}

export function startServer(app: express.Application, port: number): Promise<void> {
  return new Promise(resolve => {
    app.listen(port, '127.0.0.1', () => resolve());
  });
}
