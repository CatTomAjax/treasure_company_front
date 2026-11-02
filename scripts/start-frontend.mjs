import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startProdServer } from 'vinext/server/prod-server';
import { snapshotBuild } from './build-snapshot.mjs';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
if(existsSync('.env')){const configured={...process.env};process.loadEnvFile('.env');Object.assign(process.env,configured);}
const outDir=await snapshotBuild(resolve('dist'),resolve('runtime/builds'));
const {server}=await startProdServer({port:Number(process.env.PORT||3002),host:'127.0.0.1',outDir});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
