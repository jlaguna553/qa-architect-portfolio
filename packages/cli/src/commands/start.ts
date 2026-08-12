import chalk from 'chalk';
import chokidar from 'chokidar';
import path from 'path';
import { analyzeCommand } from './analyze';
import { createServer, startServer } from '../lib/server';
import { loadConfig } from '../lib/config';

interface StartOptions {
  config: string;
  port: string;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const port = parseInt(options.port, 10);
  const projectRoot = process.cwd();
  const config = loadConfig(options.config);

  await analyzeCommand({ config: options.config });

  const app = createServer(projectRoot);
  await startServer(app, port);

  console.log(chalk.bold.green(`\nQA Architect running`));
  console.log(chalk.cyan(`  Dashboard: http://localhost:${port}`));
  console.log(chalk.gray(`  Watching:  ${config.source_directories.join(', ')}`));
  console.log('');

  const watchPaths = config.source_directories.map(d => path.resolve(projectRoot, d));
  const watcher = chokidar.watch(watchPaths, { ignoreInitial: true, persistent: true });

  let debounceTimer: NodeJS.Timeout | null = null;
  const triggerAnalysis = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      console.log(chalk.gray('\nChanges detected, re-analyzing...'));
      await analyzeCommand({ config: options.config });
    }, 2000);
  };

  watcher.on('change', triggerAnalysis);
  watcher.on('add', triggerAnalysis);
  watcher.on('unlink', triggerAnalysis);

  process.on('SIGINT', () => {
    watcher.close();
    console.log(chalk.gray('\nQA Architect stopped.'));
    process.exit(0);
  });

  await new Promise(() => {});
}
