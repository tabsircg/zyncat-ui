import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

import { ROOT } from './entries.mjs';

const NODE = process.execPath;

export const bin = (name) => resolve(ROOT, 'node_modules/.bin', name);

export function run(label, command, args) {
  const startedAt = Date.now();
  return new Promise((done) => {
    const child = spawn(command, args, { cwd: ROOT, env: process.env });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => done({ label, code: code ?? 1, output, seconds: (Date.now() - startedAt) / 1000 }));
    child.on('error', (error) =>
      done({ label, code: 1, output: String(error), seconds: (Date.now() - startedAt) / 1000 }),
    );
  });
}

export const script =
  (label, file, ...args) =>
  (...extra) =>
    run(label, NODE, [resolve(ROOT, 'scripts', file), ...args, ...extra]);

export const tool =
  (label, name, ...args) =>
  (...extra) =>
    run(label, bin(name), [...args, ...extra]);

export const pkg =
  (label, name, task) =>
  (...extra) =>
    run(label, 'pnpm', ['--filter', name, task, ...extra]);

export async function lane(steps) {
  const results = [];
  for (const step of steps) {
    const result = await step();
    results.push(result);
    if (result.code) break;
  }
  return results;
}

const summaryLine = (output) => {
  const lines = output.trim().split('\n').filter(Boolean);
  return lines.length ? lines[lines.length - 1].trim() : '';
};

export function report(results, totalSeconds) {
  let failures = 0;
  for (const result of results) {
    const time = `${result.seconds.toFixed(2)}s`.padStart(7);
    if (result.code) {
      failures++;
      console.error(`✗ ${result.label.padEnd(16)}${time}`);
      const body = result.output.trimEnd();
      if (body) console.error(body.replace(/^/gm, '    '));
    } else {
      console.log(`✓ ${result.label.padEnd(16)}${time}  ${summaryLine(result.output)}`);
    }
  }
  const verdict = failures ? `${failures} step(s) failed` : 'all green';
  console.log(`${failures ? '✗' : '✓'} total${' '.repeat(11)}${totalSeconds.toFixed(2)}s  ${verdict}`);
  return failures;
}
