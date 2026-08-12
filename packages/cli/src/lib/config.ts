import fs from 'fs';
import path from 'path';
import { QaConfig } from '../types';

const DEFAULT_CONFIG: QaConfig = {
  project_name: 'Mi Proyecto',
  language: 'PHP',
  framework: 'Symfony',
  source_directories: ['src/Controller', 'src/Service'],
  ollama: {
    model: 'qwen2.5-coder:7b',
    endpoint: 'http://localhost:11434',
  },
  sdk: {
    port: 9000,
  },
};

export function loadConfig(configPath: string): QaConfig {
  const absolutePath = path.resolve(process.cwd(), configPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(
      `Archivo de configuración no encontrado: ${absolutePath}\n` +
      `Ejecuta "qa-architect init" para crear uno.`
    );
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<QaConfig>;

  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    ollama: { ...DEFAULT_CONFIG.ollama, ...parsed.ollama },
    sdk: { port: parsed.sdk?.port ?? 9000 },
  };
}

export function createDefaultConfig(projectPath: string): void {
  const configPath = path.join(projectPath, 'qa-architect.config.json');
  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
}
