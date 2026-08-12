import chalk from 'chalk';
import { createServer, startServer } from '../lib/server';

interface ServeOptions {
  port: string;
}

export async function serveCommand(options: ServeOptions): Promise<void> {
  const port = parseInt(options.port, 10);
  const app = createServer(process.cwd());
  await startServer(app, port);

  console.log(chalk.bold.green(`\nQA Architect Dashboard`));
  console.log(chalk.cyan(`  URL: http://localhost:${port}`));
  console.log(chalk.gray(`  API: http://localhost:${port}/api`));
  console.log(chalk.gray(`  SDK telemetry: POST http://localhost:${port}/api/traces`));
  console.log('');
  console.log(chalk.gray('  Press Ctrl+C to stop'));
}
