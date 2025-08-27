const { spawn } = require('child_process');
const fs = require('fs');
const out = fs.openSync('devlog.txt','a');
const err = fs.openSync('devlog.txt','a');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const proc = spawn(npm, ['run','dev'], { cwd: process.cwd(), stdio: ['ignore', out, err], detached: true });
console.log('spawned with pid', proc.pid);
proc.unref();
