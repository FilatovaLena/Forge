import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['tests/browser.mjs'],{stdio:'inherit',env:{...process.env,HOSTED:'1'}});process.exit(result.status??1);
