// scripts/load-env.js
// Reads .env file and writes a temp batch file with set "KEY=VALUE" commands.
// Handles special characters (<, >, &, |) that break batch for/f parsing.
const fs = require('fs');

const envFile = process.argv[2];
const outFile = process.argv[3];

if (!envFile || !outFile) {
  process.exit(1);
}

try {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  const cmds = [];

  for (const line of lines) {
    const t = line.trim();
    if (t.length === 0 || t[0] === '#' || t.indexOf('=') < 0) continue;

    const i = t.indexOf('=');
    const key = t.substring(0, i).trim();
    let val = t.substring(i + 1).trim();

    // Remove surrounding double quotes
    if (val.length >= 2 && val[0] === '"' && val[val.length - 1] === '"') {
      val = val.slice(1, -1);
    }

    cmds.push('set "' + key + '=' + val + '"');
  }

  fs.writeFileSync(outFile, cmds.join('\r\n'), 'utf8');
} catch (e) {
  process.exit(1);
}
