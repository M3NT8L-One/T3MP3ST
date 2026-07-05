import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const configSource = readFileSync(join(process.cwd(), 'src/config/index.ts'), 'utf8');
const serverSource = readFileSync(join(process.cwd(), 'src/server.ts'), 'utf8');
const setupScript = readFileSync(join(process.cwd(), 'scripts/setup-api.sh'), 'utf8');

function sourceBlock(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  expect(start, `missing start marker ${startMarker}`).toBeGreaterThanOrEqual(0);
  const end = source.indexOf(endMarker, start);
  expect(end, `missing end marker ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
}

function configBlock(startMarker: string, endMarker: string): string {
  return sourceBlock(configSource, startMarker, endMarker);
}

function configLoadEnvBlock(): string {
  return configBlock('private loadEnvVariables(): void', '\n  /**\n   * Get all settings');
}

function exportConfigBlock(): string {
  return configBlock('exportConfig(filePath: string): void', '\n  /**\n   * Create a .env template file');
}

function envTemplateBlock(): string {
  return configBlock('createEnvTemplate(filePath:', '\n    writeFileSync(filePath, template);');
}

describe('API key environment handling hardening', () => {
  it('ConfigManager does not implicitly read .env from the caller working directory', () => {
    const block = configLoadEnvBlock();

    expect(block).not.toContain("join(process.cwd(), '.env')");
    expect(block).toContain("join(homedir(), '.t3mp3st', '.env')");
  });

  it('the API server does not re-enable caller-cwd dotenv loading before ConfigManager runs', () => {
    expect(serverSource).not.toMatch(/from ['"]dotenv['"]/);
    expect(serverSource).not.toMatch(/\bdotenv\.config\s*\(/);
    expect(serverSource).toContain('PROJECT_RUNTIME_ENV_KEYS');
    expect(serverSource).toContain("'T3MP3ST_HERMES_PROFILE'");
  });

  it('setup-api.sh writes the same T3MP3ST-owned env file that ConfigManager reads', () => {
    const block = configLoadEnvBlock();

    expect(setupScript).not.toMatch(/dirname "\$0"\).*\.\.\/\.env/);
    expect(setupScript).toMatch(/\.t3mp3st/);
    expect(setupScript).toMatch(/mkdir\s+-p\s+"\$\(dirname "\$ENV_FILE"\)"/);
    expect(block).toContain("join(homedir(), '.t3mp3st', '.env')");
  });

  it('env template points users at the T3MP3ST-owned env file, not a caller-cwd .env', () => {
    const block = envTemplateBlock();

    expect(block).toContain('~/.t3mp3st/.env');
    expect(block).not.toContain('Copy this file to .env');
  });

  it('exportConfig redacts every supported provider key slot', () => {
    const block = exportConfigBlock();

    for (const provider of ['openrouter', 'venice', 'anthropic', 'openai', 'xai', 'gemini', 'deepseek', 'litellm']) {
      expect(block).toContain(`${provider}: settings.apiKeys.${provider} ? '***REDACTED***' : undefined`);
    }
  });

  it('ConfigManager uses env keys in-memory and does not persist imported env keys', () => {
    const block = configLoadEnvBlock();

    expect(block).not.toMatch(/setApiKey\(/);
    expect(block).not.toMatch(/config\.set\(['"]apiKeys['"]/);
  });

  it('setup-api.sh never sources .env and reads API keys silently into a 0600 file', () => {
    expect(setupScript).not.toMatch(/\bsource\s+["']?\$ENV_FILE/);
    expect(setupScript).toMatch(/umask\s+077/);
    expect(setupScript).toMatch(/read\s+-rsp\s+"Enter your OpenRouter API key:/);
    expect(setupScript).toMatch(/chmod\s+600\s+"\$ENV_FILE"/);
  });
});
