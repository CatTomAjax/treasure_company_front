import {
  existsSync,
  readFileSync,
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

// The legacy launcher and the frontend start.cmd both use the two authoritative
// repositories. Child services use their own .env and never receive CLI secrets.
const here = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isFrontend =
  JSON.parse(readFileSync(resolve(here, 'package.json'), 'utf8')).name ===
  'treasure-company-front';
const frontend = isFrontend
  ? here
  : resolve(
      process.env.TREASURE_PROJECT_ROOT || 'D:/project',
      'treasure_company_front',
    );
const backend = resolve(frontend, '..', 'treasure_company');
for (const [folder, name] of [
  [frontend, 'treasure-company-front'],
  [backend, 'treasure-company'],
]) {
  if (
    !existsSync(resolve(folder, 'package.json')) ||
    JSON.parse(readFileSync(resolve(folder, 'package.json'), 'utf8')).name !==
      name
  )
    throw Error('源码目录未就绪：' + folder);
}
const envFile = resolve(frontend, '.env');
if (existsSync(envFile)) {
  const explicit = { ...process.env };
  process.loadEnvFile(envFile);
  Object.assign(process.env, explicit);
}
const frontPort = Number(process.env.FRONTEND_PORT || process.env.PORT || 3002),
  backPort = Number(process.env.BACKEND_PORT || 3003);
for (const port of [frontPort, backPort]) {
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error('服务端口必须是 1 到 65535 的整数');
}
if (frontPort === backPort) throw Error('前后端必须使用不同端口');
const logs = resolve(frontend, 'runtime');
mkdirSync(logs, { recursive: true });
async function healthy(port) {
  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/platform/version`,
      { signal: AbortSignal.timeout(1200) },
    );
    if (!response.ok) return { interface: 'unrecognized' };
    try {
      return (await response.json()) || { interface: 'unrecognized' };
    } catch {
      return { interface: 'unrecognized' };
    }
  } catch {
    return null;
  }
}
function start(folder, script, name, env = {}) {
  const out = openSync(resolve(logs, name + '.log'), 'a'),
    error = openSync(resolve(logs, name + '-error.log'), 'a');
  const child = spawn(
    process.execPath,
    [resolve(folder, script), ...(name === 'backend' ? ['--no-open'] : [])],
    {
      cwd: folder,
      env: { ...process.env, ...env },
      windowsHide: true,
      detached: true,
      stdio: ['ignore', out, error],
    },
  );
  closeSync(out);
  closeSync(error);
  child.unref();
  return child.pid;
}
async function wait(port, role) {
  for (let attempt = 0; attempt < 360; attempt++) {
    const state = await healthy(port);
    if (state) {
      if (state.interface !== role)
        throw Error(`端口 ${port} 已被其他版本占用，请先停止旧服务`);
      return state;
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw Error(`服务 ${port} 未就绪，请检查 ${logs}`);
}
async function ensureFrontend() {
  const module = await import(
    pathToFileURL(resolve(frontend, 'scripts/build-info.mjs')).href
  );
  const fingerprint = module.sourceFingerprint(frontend);
  let built;
  try {
    built = JSON.parse(
      readFileSync(resolve(frontend, 'dist/client/build-info.json'), 'utf8'),
    );
  } catch {}
  if (
    built?.version === fingerprint &&
    existsSync(resolve(frontend, 'dist/server/index.js'))
  )
    return fingerprint;
  const cli = resolve(frontend, 'node_modules/vinext/dist/cli.js');
  if (!existsSync(cli)) throw Error('请先在前后端目录分别执行 npm ci');
  module.writeBuildInfo(frontend);
  const code = await new Promise((done, reject) => {
    const child = spawn(process.execPath, [cli, 'build'], {
      cwd: frontend,
      windowsHide: true,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', done);
  });
  if (code !== 0) throw Error('前端构建失败');
  return fingerprint;
}
const expectedFrontend = await ensureFrontend();
const backendBuild = await import(
  pathToFileURL(resolve(backend, 'scripts/build-info.mjs')).href
);
const expectedBackend = backendBuild.sourceFingerprint(backend);
const pids = {};
let back = await healthy(backPort);
if (back && back.interface !== 'backend')
  throw Error(`端口 ${backPort} 已被其他版本占用`);
if (back && back.version !== expectedBackend)
  throw Error('后端源码已更新，请先停止旧后端服务后重新启动');
if (!back) {
  pids.backend = start(backend, 'scripts/start-local.mjs', 'backend', {
    PORT: String(backPort),
  });
  back = await wait(backPort, 'backend');
}
let front = await healthy(frontPort);
if (front && front.interface !== 'frontend')
  throw Error(`端口 ${frontPort} 已被旧服务占用，请停止旧服务后重试`);
if (front && front.version !== expectedFrontend)
  throw Error('前端源码已更新，请先停止旧前端服务后重新启动');
if (!front) {
  pids.frontend = start(frontend, 'scripts/start-frontend.mjs', 'frontend', {
    PORT: String(frontPort),
    API_BASE_URL: `http://127.0.0.1:${backPort}`,
  });
  front = await wait(frontPort, 'frontend');
}
writeFileSync(
  resolve(logs, 'source-bindings.json'),
  JSON.stringify(
    {
      frontend,
      backend,
      frontPort,
      backPort,
      pids,
      versions: { frontend: front.version, backend: back.version },
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    frontend,
    backend,
    url: `http://localhost:${frontPort}/#ppt/portrait`,
    versions: { frontend: front.version, backend: back.version },
  }),
);
if (!process.argv.includes('--no-open') && process.platform === 'win32') {
  const open = spawn(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Start-Process 'http://localhost:${frontPort}/#ppt/portrait'`,
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
  open.unref();
}
