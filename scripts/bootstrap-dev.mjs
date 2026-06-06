#!/usr/bin/env node
/**
 * Bootstrap + start the full development stack.
 *
 * Runs only the steps that are still missing, then launches server + client:
 * 1. Dependencies  — npm install (if node_modules is absent)
 * 2. Environment   — copy server/.env.example → server/.env (if .env is absent)
 * 3. Database      — always build shared, generate Prisma client, migrate deploy
 *                    seed only on first init (when dev.db is absent)
 * 4. AI fallback   — ensure Ollama is running + model pulled when no usable OpenAI key
 * 5. Dev servers   — API on :4000 + Vite client on :5173
 */
import { existsSync, readFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const runCommand = (command) => {
  execSync(command, { cwd: projectRoot, stdio: 'inherit' });
};

const readEnvValue = (key, fallback = '') => {
  const envPath = path.join(projectRoot, 'server/.env');
  if (!existsSync(envPath)) return fallback;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    if (name !== key) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return fallback;
};

const isUsableOpenAiKey = (key) => {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed.startsWith('sk-')) return false;
  if (trimmed === 'sk-...' || trimmed === 'sk-') return false;
  return trimmed.length > 10;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const probeOllama = async (baseUrl) => {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return /** @type {{ models?: Array<{ name?: string }> }} */ (await res.json());
  } catch {
    return null;
  }
};

const ensureOllama = async () => {
  const baseUrl = readEnvValue('OLLAMA_BASE_URL', 'http://localhost:11434');
  const model = readEnvValue('OLLAMA_MODEL', 'gemma3');

  let tags = await probeOllama(baseUrl);
  if (!tags) {
    try {
      execSync('command -v ollama', { stdio: 'ignore' });
    } catch {
      console.warn(
        '\n[bootstrap] No usable OPENAI_API_KEY and Ollama is not installed.',
      );
      console.warn('[bootstrap] Install Ollama from https://ollama.com or set OPENAI_API_KEY in server/.env\n');
      return;
    }

    console.log('\n[bootstrap] Starting Ollama (ollama serve)...\n');
    const child = spawn('ollama', ['serve'], {
      cwd: projectRoot,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();

    for (let attempt = 0; attempt < 30; attempt += 1) {
      await sleep(1000);
      tags = await probeOllama(baseUrl);
      if (tags) break;
    }

    if (!tags) {
      console.warn('\n[bootstrap] Ollama did not become ready in time. AI may be unavailable until it starts.\n');
      return;
    }
  }

  const hasModel = (tags.models ?? []).some((entry) => {
    const name = entry.name ?? '';
    return name === model || name.startsWith(`${model}:`);
  });

  if (!hasModel) {
    console.log(`\n[bootstrap] Pulling Ollama model "${model}" (first run may take a while)...\n`);
    try {
      runCommand(`ollama pull ${model}`);
    } catch {
      console.warn(`\n[bootstrap] Failed to pull model "${model}". Run: ollama pull ${model}\n`);
    }
  } else {
    console.log(`\n[bootstrap] Ollama ready with model "${model}".\n`);
  }
};

const isDependenciesMissing = !existsSync(path.join(projectRoot, 'node_modules'));
const isServerEnvMissing = !existsSync(path.join(projectRoot, 'server/.env'));
const isDatabaseUninitialized = !existsSync(path.join(projectRoot, 'server/prisma/dev.db'));

if (isDependenciesMissing) {
  console.log('\n[bootstrap] Installing npm dependencies...\n');
  runCommand('npm install');
}

if (isServerEnvMissing) {
  console.log('\n[bootstrap] Creating server/.env from server/.env.example.');
  console.log('[bootstrap] Set OPENAI_API_KEY in server/.env for cloud AI, or leave placeholder to use local Ollama.\n');
  runCommand('cp server/.env.example server/.env');
}

console.log('\n[bootstrap] Preparing database (build shared + Prisma generate + migrate)...\n');
runCommand('npm run build -w shared');
runCommand('npm run prisma:generate -w server');
runCommand('npm run db:deploy -w server');

if (isDatabaseUninitialized) {
  console.log('\n[bootstrap] Seeding database (first run)...\n');
  runCommand('npm run db:seed -w server');
}

const openAiKey = readEnvValue('OPENAI_API_KEY');
if (!isUsableOpenAiKey(openAiKey)) {
  console.log('\n[bootstrap] No usable OPENAI_API_KEY — ensuring local Ollama for AI assist...\n');
  await ensureOllama();
}

console.log('\n[bootstrap] Starting development servers...');
console.log('  API:  http://localhost:4000');
console.log('  App:  http://localhost:5173\n');
runCommand('npm run dev');
