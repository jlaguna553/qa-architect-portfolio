import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { QaConfig } from '../types';

const LANGUAGE_PATTERNS: Record<string, string[]> = {
  PHP: ['**/*Controller.php', '**/*Service.php', '**/*Handler.php'],
  Python: ['**/*_controller.py', '**/*_service.py', '**/*router*.py', '**/routes*.py'],
  JavaScript: ['**/*controller*.js', '**/*router*.js', '**/*service*.js'],
  TypeScript: ['**/*controller*.ts', '**/*router*.ts', '**/*service*.ts'],
};

const FRAMEWORK_PATTERNS: Record<string, string[]> = {
  'Next.js': [
    '**/route.ts',
    '**/route.tsx',
    '**/actions.ts',
    '**/actions.tsx',
    '**/*service*.ts',
    '**/*helper*.ts',
    '**/*util*.ts',
    '**/*api*.ts',
  ],
};

// Patrones excluidos por defecto — nunca tienen reglas de negocio útiles
const DEFAULT_EXCLUDE_PATTERNS = [
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.d.ts',
  '**/node_modules/**',
  '**/manifest.ts',
  '**/globals.css',
  '**/*.css',
  '**/layout.tsx',
  '**/page.tsx',
  '**/loading.tsx',
  '**/error.tsx',
  '**/not-found.tsx',
];

export interface ScannedFile {
  absolutePath: string;
  relativePath: string;
  content: string;
  lineCount: number;
  segments?: string[];
}

function splitIntoSegments(content: string, maxLines: number = 500): string[] {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return [content];

  const segments: string[] = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    segments.push(lines.slice(i, i + maxLines).join('\n'));
  }
  return segments;
}

function isExcluded(relativePath: string, excludePatterns: string[]): boolean {
  const normalized = relativePath.replace(/\\/g, '/');
  for (const pattern of excludePatterns) {
    const regexPattern = pattern
      .replace(/\*\*\//g, '(.+/)?')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');
    if (new RegExp(`^${regexPattern}$`).test(normalized)) return true;
  }
  return false;
}

export async function scanSourceFiles(config: QaConfig, projectRoot: string = process.cwd()): Promise<ScannedFile[]> {
  const basePatterns = FRAMEWORK_PATTERNS[config.framework] ?? LANGUAGE_PATTERNS[config.language] ?? LANGUAGE_PATTERNS.PHP;
  const patterns = config.custom_patterns
    ? [...basePatterns, ...config.custom_patterns]
    : basePatterns;

  const excludePatterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...(config.exclude_patterns ?? []),
  ];

  const seenPaths = new Set<string>();
  const files: ScannedFile[] = [];

  for (const sourceDir of config.source_directories) {
    const absoluteDir = path.resolve(projectRoot, sourceDir);

    if (!fs.existsSync(absoluteDir)) {
      continue;
    }

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: absoluteDir,
        absolute: false,
        nodir: true,
      });

      for (const match of matches) {
        const absolutePath = path.join(absoluteDir, match);

        // Skip duplicates (mismo archivo desde múltiples directorios)
        if (seenPaths.has(absolutePath)) continue;

        const relativePath = path.join(sourceDir, match).replace(/\\/g, '/');

        if (isExcluded(relativePath, excludePatterns)) continue;

        seenPaths.add(absolutePath);

        const content = fs.readFileSync(absolutePath, 'utf-8');
        const lineCount = content.split('\n').length;

        const scanned: ScannedFile = {
          absolutePath,
          relativePath,
          content,
          lineCount,
        };

        if (lineCount > 500) {
          scanned.segments = splitIntoSegments(content);
        }

        files.push(scanned);
      }
    }
  }

  return files;
}
