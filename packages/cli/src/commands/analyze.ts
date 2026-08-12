import crypto from 'crypto';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../lib/config';
import { scanSourceFiles } from '../lib/scanner';
import { analyzeWithOllama, checkOllamaAvailability } from '../lib/ollama';
import { saveRules, loadRules } from '../lib/storage';
import { RulesFile, BusinessFlow } from '../types';

interface AnalyzeOptions {
  config: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

async function analyzeWithRetry(
  segment: string,
  filePath: string,
  config: ReturnType<typeof loadConfig>,
  retries: number
): Promise<{ flows: BusinessFlow[]; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return { flows: await analyzeWithOllama(segment, filePath, config) };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt < retries) {
        await sleep(3000 * (attempt + 1));
      } else {
        return { flows: [], error: message };
      }
    }
  }
  return { flows: [] };
}

export async function analyzeCommand(options: AnalyzeOptions): Promise<void> {
  const config = loadConfig(options.config);
  const projectRoot = process.cwd();
  const retries = config.ollama.retry_attempts ?? 2;
  const delayBetween = config.ollama.delay_between_ms ?? 1500;

  console.log(chalk.bold(`\nQA Architect — Business Rules Analysis`));
  console.log(chalk.gray(`Project: ${config.project_name}`));
  console.log(chalk.gray(`Model:   ${config.ollama.model}`));
  console.log('');

  const ollamaSpinner = ora('Checking Ollama connection...').start();
  const ollamaAvailable = await checkOllamaAvailability(config.ollama.endpoint);

  if (!ollamaAvailable) {
    ollamaSpinner.fail(
      chalk.red(`Cannot connect to Ollama at ${config.ollama.endpoint}\n`) +
      chalk.gray('  Make sure Ollama is running: ollama serve')
    );
    process.exit(1);
  }
  ollamaSpinner.succeed(chalk.green('Ollama available'));

  const scanSpinner = ora('Scanning source files...').start();
  const files = await scanSourceFiles(config, projectRoot);

  if (files.length === 0) {
    scanSpinner.warn(
      chalk.yellow('No files found in the configured directories.\n') +
      chalk.gray(`  Directories: ${config.source_directories.join(', ')}`)
    );
    return;
  }
  scanSpinner.succeed(chalk.green(`${files.length} file(s) found`));

  // Load previous analysis for incremental mode
  const existingRules = loadRules(projectRoot);
  const existingHashes: Record<string, string> = existingRules?.file_hashes ?? {};
  const existingFlowsByFile = new Map<string, BusinessFlow[]>();
  if (existingRules) {
    for (const flow of existingRules.flows ?? []) {
      const arr = existingFlowsByFile.get(flow.source_file) ?? [];
      arr.push(flow);
      existingFlowsByFile.set(flow.source_file, arr);
    }
  }

  const allFlows: BusinessFlow[] = [];
  const newHashes: Record<string, string> = {};
  let totalSegments = 0;
  let errors = 0;
  let skipped = 0;

  for (const file of files) {
    const fileHash = hashContent(file.content);
    newHashes[file.relativePath] = fileHash;

    // Skip unchanged files that already have cached flows
    if (
      existingHashes[file.relativePath] === fileHash &&
      existingFlowsByFile.has(file.relativePath)
    ) {
      const cached = existingFlowsByFile.get(file.relativePath)!;
      allFlows.push(...cached);
      skipped++;
      console.log(
        chalk.gray(`  ↩ ${file.relativePath}`) +
        chalk.blue(` — unchanged (${cached.length} cached flow(s))`)
      );
      continue;
    }

    const segmentCount = file.segments?.length ?? 1;
    const segments = file.segments ?? [file.content];
    totalSegments += segmentCount;

    for (let i = 0; i < segments.length; i++) {
      const label = segmentCount > 1
        ? `Analyzing ${file.relativePath} (${i + 1}/${segmentCount})...`
        : `Analyzing ${file.relativePath}...`;

      const spinner = ora(label).start();
      const { flows, error } = await analyzeWithRetry(segments[i], file.relativePath, config, retries);

      if (error) {
        errors++;
        spinner.fail(chalk.red(`${file.relativePath}: ${error}`));
      } else {
        allFlows.push(...flows);
        spinner.succeed(chalk.green(`${file.relativePath}`) + chalk.gray(` — ${flows.length} flow(s)`));
      }

      await sleep(delayBetween);
    }
  }

  const rules: RulesFile = {
    generated_at: new Date().toISOString(),
    project_name: config.project_name,
    flows: allFlows,
    file_hashes: newHashes,
  };

  saveRules(rules, projectRoot);

  const analyzedCount = files.length - skipped;
  console.log('');
  console.log(chalk.bold.green(`✔ Analysis complete`));
  console.log(chalk.gray(`  Files analyzed:  ${analyzedCount} (${totalSegments} segment(s))`));
  if (skipped > 0) console.log(chalk.blue(`  Files skipped:   ${skipped} (unchanged)`));
  console.log(chalk.gray(`  Flows detected:  ${allFlows.length}`));
  if (errors > 0) console.log(chalk.yellow(`  Errors: ${errors} file(s) could not be analyzed`));
  console.log(chalk.gray(`  Saved to: .qa-architect/rules.json`));
  console.log('');
  console.log(chalk.gray('  Run "qa-architect serve" to open the dashboard.'));
}
