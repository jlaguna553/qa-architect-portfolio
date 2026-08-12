import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

type Framework = 'nextjs' | 'react' | 'vue';

interface SdkInitOptions {
  framework?: string;
  port?: string;
}

const FRAMEWORK_ALIASES: Record<string, Framework> = {
  nextjs: 'nextjs',
  'next.js': 'nextjs',
  next: 'nextjs',
  react: 'react',
  vite: 'react',
  vue: 'vue',
  'vue3': 'vue',
};

// ─── Templates ────────────────────────────────────────────────────────────────
// All providers are env-var gated: inert unless the endpoint var is set, so the
// file is always safe to commit. Dev sets the var in .env.local (gitignored);
// production only traces when you deliberately set it in your host's env vars.

function nextjsProvider(): string {
  return `'use client';

import { useEffect } from 'react';

const ENDPOINT = process.env.NEXT_PUBLIC_QA_ARCHITECT_ENDPOINT;

export function QaArchitectProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!ENDPOINT) return;

    import('@qa-architect/sdk-js').then(({ initQaArchitect }) => {
      initQaArchitect({
        endpoint: ENDPOINT,
        captureNetwork: true,
        captureEvents: true,
        captureScreenshots: true,
        localFilter: 'localhost',
      });
    });
  }, []);

  return <>{children}</>;
}
`;
}

function reactProvider(): string {
  return `import { useEffect } from 'react';

const ENDPOINT = import.meta.env.VITE_QA_ARCHITECT_ENDPOINT as string | undefined;

export function QaArchitectProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!ENDPOINT) return;

    import('@qa-architect/sdk-js').then(({ initQaArchitect }) => {
      initQaArchitect({
        endpoint: ENDPOINT,
        captureNetwork: true,
        captureEvents: true,
        captureScreenshots: true,
        localFilter: 'localhost',
      });
    });
  }, []);

  return <>{children}</>;
}
`;
}

function vuePlugin(): string {
  return `import type { App } from 'vue';

const ENDPOINT = import.meta.env.VITE_QA_ARCHITECT_ENDPOINT as string | undefined;

export const QaArchitectPlugin = {
  install(_app: App) {
    if (!ENDPOINT) return;

    import('@qa-architect/sdk-js').then(({ initQaArchitect }) => {
      initQaArchitect({
        endpoint: ENDPOINT,
        captureNetwork: true,
        captureEvents: true,
        captureScreenshots: true,
        localFilter: 'localhost',
      });
    });
  },
};
`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectFramework(projectRoot: string): Framework {
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'react';
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
  const deps = { ...pkg.dependencies as object, ...pkg.devDependencies as object } as Record<string, string>;
  if (deps['next']) return 'nextjs';
  if (deps['vue']) return 'vue';
  return 'react';
}

function localSdkPath(): string | null {
  const candidate = path.resolve(__dirname, '../../../sdk-js');
  return fs.existsSync(candidate) ? candidate : null;
}

function sdkInstallInstruction(projectRoot: string): string {
  const local = localSdkPath();
  if (local) {
    const relative = path.relative(projectRoot, local);
    return `npm install ${relative}\n  ${chalk.gray('# local monorepo link — once published, switch to: npm install @qa-architect/sdk-js')}`;
  }
  return `npm install @qa-architect/sdk-js`;
}

function ensureEnvVar(projectRoot: string, key: string, value: string): void {
  const envPath = path.join(projectRoot, '.env.local');
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

  if (existing.includes(`${key}=`)) {
    console.log(chalk.gray(`  ${key} already set in .env.local — left untouched.`));
    return;
  }

  const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(envPath, `${existing}${separator}${key}=${value}\n`, 'utf-8');
  console.log(chalk.green(`  ✔  Added ${key} to .env.local`));
}

function warnIfEnvNotIgnored(projectRoot: string): void {
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    console.log(chalk.yellow(`  ⚠  No .gitignore found — make sure .env.local is not committed.`));
    return;
  }
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  if (!/(^|\n)\.env(\*|\.local)?(\s|$)/.test(content)) {
    console.log(chalk.yellow(`  ⚠  .env.local doesn't look ignored by .gitignore — verify it before committing.`));
  }
}

// ─── Command ──────────────────────────────────────────────────────────────────

export function sdkInitCommand(options: SdkInitOptions): void {
  const projectRoot = process.cwd();
  const port = parseInt(options.port ?? '9000', 10);
  const devEndpoint = `http://localhost:${port}`;

  const rawFramework = (options.framework ?? '').toLowerCase();
  const framework: Framework = FRAMEWORK_ALIASES[rawFramework] ?? detectFramework(projectRoot);

  console.log(chalk.bold(`\nQA Architect — SDK Integration`));
  console.log(chalk.gray(`Framework: ${framework}  |  Dashboard port: ${port}`));
  console.log('');

  switch (framework) {
    case 'nextjs':
      generateNextjs(projectRoot, devEndpoint);
      break;
    case 'vue':
      generateVue(projectRoot, devEndpoint);
      break;
    default:
      generateReact(projectRoot, devEndpoint);
  }

  console.log('');
  console.log(chalk.bold('Install the SDK:'));
  console.log(chalk.cyan(`  ${sdkInstallInstruction(projectRoot)}`));
  console.log('');
  console.log(chalk.bold('Production tracing:'));
  console.log(chalk.gray(`  The provider is inert unless its endpoint env var is set.`));
  console.log(chalk.gray(`  To trace production too, set the same var in your host's env vars`));
  console.log(chalk.gray(`  (e.g. Vercel project settings) pointing at a reachable endpoint —`));
  console.log(chalk.gray(`  localhost won't work there, so this is opt-in per deployment.`));
  console.log('');
  console.log(chalk.gray('  Start the dashboard locally:  qa-architect serve'));
  console.log('');
}

function generateNextjs(projectRoot: string, devEndpoint: string): void {
  const hasSrc = fs.existsSync(path.join(projectRoot, 'src'));
  const componentDir = hasSrc
    ? path.join(projectRoot, 'src', 'components', 'ui')
    : path.join(projectRoot, 'components', 'ui');

  fs.mkdirSync(componentDir, { recursive: true });

  const providerPath = path.join(componentDir, 'QaArchitectProvider.tsx');
  if (fs.existsSync(providerPath)) {
    console.log(chalk.yellow(`  ⚠  ${path.relative(projectRoot, providerPath)} already exists — skipped.`));
  } else {
    fs.writeFileSync(providerPath, nextjsProvider(), 'utf-8');
    console.log(chalk.green(`  ✔  Created: ${path.relative(projectRoot, providerPath)}`));
  }

  ensureEnvVar(projectRoot, 'NEXT_PUBLIC_QA_ARCHITECT_ENDPOINT', devEndpoint);
  warnIfEnvNotIgnored(projectRoot);

  const layoutHint = hasSrc ? 'src/app/layout.tsx' : 'app/layout.tsx';

  console.log('');
  console.log(chalk.bold('Add to your root layout:'));
  console.log(chalk.gray(`  // ${layoutHint}`));
  console.log(chalk.cyan(`  import { QaArchitectProvider } from '@/components/ui/QaArchitectProvider';`));
  console.log('');
  console.log(chalk.gray('  export default function RootLayout({ children }) {'));
  console.log(chalk.gray('    return ('));
  console.log(chalk.gray('      <html><body>'));
  console.log(chalk.cyan('        <QaArchitectProvider>'));
  console.log(chalk.gray('          {children}'));
  console.log(chalk.cyan('        </QaArchitectProvider>'));
  console.log(chalk.gray('      </body></html>'));
  console.log(chalk.gray('    );'));
  console.log(chalk.gray('  }'));

  const configs = ['next.config.mjs', 'next.config.js', 'next.config.ts'];
  const configFile = configs.find(f => fs.existsSync(path.join(projectRoot, f)));
  if (configFile) {
    const content = fs.readFileSync(path.join(projectRoot, configFile), 'utf-8');
    if (!content.includes('transpilePackages')) {
      console.log('');
      console.log(chalk.yellow(`  ⚠  Add transpilePackages to ${configFile}:`));
      console.log(chalk.cyan(`     transpilePackages: ['@qa-architect/sdk-js']`));
    }
  }
}

function generateReact(projectRoot: string, devEndpoint: string): void {
  const hasSrc = fs.existsSync(path.join(projectRoot, 'src'));
  const outDir = hasSrc ? path.join(projectRoot, 'src') : projectRoot;
  const providerPath = path.join(outDir, 'QaArchitectProvider.tsx');

  if (fs.existsSync(providerPath)) {
    console.log(chalk.yellow(`  ⚠  ${path.relative(projectRoot, providerPath)} already exists — skipped.`));
  } else {
    fs.writeFileSync(providerPath, reactProvider(), 'utf-8');
    console.log(chalk.green(`  ✔  Created: ${path.relative(projectRoot, providerPath)}`));
  }

  ensureEnvVar(projectRoot, 'VITE_QA_ARCHITECT_ENDPOINT', devEndpoint);
  warnIfEnvNotIgnored(projectRoot);

  console.log('');
  console.log(chalk.bold('Wrap your app in App.tsx / main.tsx:'));
  console.log(chalk.cyan(`  import { QaArchitectProvider } from './QaArchitectProvider';`));
  console.log('');
  console.log(chalk.gray('  root.render('));
  console.log(chalk.cyan('    <QaArchitectProvider>'));
  console.log(chalk.gray('      <App />'));
  console.log(chalk.cyan('    </QaArchitectProvider>'));
  console.log(chalk.gray('  );'));
}

function generateVue(projectRoot: string, devEndpoint: string): void {
  const hasSrc = fs.existsSync(path.join(projectRoot, 'src'));
  const outDir = hasSrc ? path.join(projectRoot, 'src', 'plugins') : projectRoot;
  fs.mkdirSync(outDir, { recursive: true });
  const pluginPath = path.join(outDir, 'qaArchitect.ts');

  if (fs.existsSync(pluginPath)) {
    console.log(chalk.yellow(`  ⚠  ${path.relative(projectRoot, pluginPath)} already exists — skipped.`));
  } else {
    fs.writeFileSync(pluginPath, vuePlugin(), 'utf-8');
    console.log(chalk.green(`  ✔  Created: ${path.relative(projectRoot, pluginPath)}`));
  }

  ensureEnvVar(projectRoot, 'VITE_QA_ARCHITECT_ENDPOINT', devEndpoint);
  warnIfEnvNotIgnored(projectRoot);

  console.log('');
  console.log(chalk.bold('Register in main.ts:'));
  console.log(chalk.cyan(`  import { QaArchitectPlugin } from './plugins/qaArchitect';`));
  console.log('');
  console.log(chalk.gray('  const app = createApp(App);'));
  console.log(chalk.cyan('  app.use(QaArchitectPlugin);'));
  console.log(chalk.gray('  app.mount(\'#app\');'));
}
