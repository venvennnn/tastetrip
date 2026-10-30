import {spawn} from 'node:child_process';
const args=process.argv.slice(2);const i=args.indexOf('--port');const port=i>=0?args[i+1]:'4173';const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',port],{stdio:'inherit'});for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>child.kill(s));child.on('exit',c=>process.exit(c??0));
