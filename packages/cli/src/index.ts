#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { analyzeCommand } from './commands/analyze';
import { serveCommand } from './commands/serve';
import { startCommand } from './commands/start';
import { reportCommand } from './commands/report';
import { sdkInitCommand } from './commands/sdk';

const program = new Command();

program
  .name('qa-architect')
  .description('QA Architect — Local Telemetry and AI-powered Business Rules Mapping')
  .version('1.0.0');

program
  .command('init')
  .description('Create qa-architect.config.json in the current directory')
  .action(initCommand);

program
  .command('analyze')
  .description('Analyze source code with Ollama and extract business rules')
  .option('-c, --config <path>', 'Path to config file', 'qa-architect.config.json')
  .action(analyzeCommand);

program
  .command('serve')
  .description('Start the visualization dashboard at localhost:9000')
  .option('-p, --port <port>', 'Server port', '9000')
  .action(serveCommand);

program
  .command('start')
  .description('Analyze, serve the dashboard and watch for changes')
  .option('-c, --config <path>', 'Path to config file', 'qa-architect.config.json')
  .option('-p, --port <port>', 'Server port', '9000')
  .action(startCommand);

program
  .command('report')
  .description('Generate a business rules report in Markdown or HTML')
  .option('-f, --format <format>', 'Output format: markdown or html', 'markdown')
  .option('-o, --output <path>', 'Output file path', 'qa-architect-report.md')
  .action(reportCommand);

const sdk = program.command('sdk').description('SDK integration helpers');

sdk
  .command('init')
  .description('Generate integration files for your frontend project')
  .option('-f, --framework <name>', 'Framework: nextjs, react, vue (auto-detected if omitted)')
  .option('-p, --port <port>', 'Dashboard port', '9000')
  .action(sdkInitCommand);

program.parse();
