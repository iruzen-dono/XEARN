const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');
const {
  formatTimestamp,
  getEnv,
  getIntEnv,
  getRequiredEnv,
  loadRootEnv,
} = require('./runtime-env');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  loadRootEnv();

  const repoRoot = path.resolve(__dirname, '..');
  const backupDir = path.resolve(repoRoot, getEnv('BACKUP_DIR', path.join('backups', 'postgres')));
  const retentionDays = getIntEnv('BACKUP_RETENTION_DAYS', 30);

  if (dryRun) {
    console.log(`Backup directory: ${backupDir}`);
    console.log(`Retention days: ${retentionDays}`);
    console.log('Dry run only: no pg_dump execution');
    return;
  }

  const databaseUrl = getRequiredEnv('DATABASE_URL');
  const pgDumpUrl = sanitizePrismaDatabaseUrl(databaseUrl);
  const backupFile = path.join(backupDir, `xearn-${formatTimestamp(new Date())}.dump`);

  await fs.mkdir(backupDir, { recursive: true });
  await runPgDump(pgDumpUrl, backupFile);
  const removedFiles = await pruneOldBackups(backupDir, retentionDays);

  console.log(`Backup created: ${backupFile}`);
  if (removedFiles.length > 0) {
    console.log(`Pruned ${removedFiles.length} expired backup(s)`);
  }
}

function sanitizePrismaDatabaseUrl(databaseUrl) {
  const parsedUrl = new URL(databaseUrl);
  parsedUrl.searchParams.delete('schema');
  return parsedUrl.toString();
}

function runPgDump(databaseUrl, backupFile) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pg_dump',
      ['--format=custom', '--no-owner', '--no-acl', '--file', backupFile, '--dbname', databaseUrl],
      { stdio: 'inherit', windowsHide: true },
    );

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(
          new Error(
            'pg_dump introuvable. Installez les clients PostgreSQL ou ajoutez pg_dump au PATH avant de lancer la sauvegarde.',
          ),
        );
        return;
      }

      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`pg_dump exited with code ${code}`));
    });
  });
}

async function pruneOldBackups(backupDir, retentionDays) {
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return [];
  }

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const removedFiles = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.dump')) {
      continue;
    }

    const filePath = path.join(backupDir, entry.name);
    const stats = await fs.stat(filePath);
    if (stats.mtimeMs < cutoff) {
      await fs.unlink(filePath);
      removedFiles.push(filePath);
    }
  }

  return removedFiles;
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});