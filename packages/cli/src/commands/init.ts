import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createDefaultConfig } from '../lib/config';

export function initCommand(): void {
  const projectRoot = process.cwd();
  const configPath = path.join(projectRoot, 'qa-architect.config.json');

  if (fs.existsSync(configPath)) {
    console.log(chalk.yellow('⚠  qa-architect.config.json already exists.'));
    console.log(chalk.gray('   Edit it to adjust your project configuration.'));
    return;
  }

  createDefaultConfig(projectRoot);

  console.log(chalk.green('✔  Config created: qa-architect.config.json'));
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(chalk.gray('  1. Edit qa-architect.config.json with your project details'));
  console.log(chalk.gray('  2. Make sure Ollama is running: ollama serve'));
  console.log(chalk.gray('  3. Run: qa-architect analyze'));
  console.log(chalk.gray('  4. Run: qa-architect serve'));
}
