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
  const backupStorage = getEnv('BACKUP_STORAGE', 'local');
  const encryptionKey = getEnv('BACKUP_ENCRYPTION_KEY', '');

  if (dryRun) {
    console.log(`Backup directory: ${backupDir}`);
    console.log(`Retention days: ${retentionDays}`);
    console.log(`Backup storage: ${backupStorage}`);
    console.log(`Encryption: ${encryptionKey ? 'enabled' : 'disabled'}`);
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

  // ─── S3 Upload (when BACKUP_STORAGE=s3) ───
  if (backupStorage === 's3') {
    await uploadToS3(backupFile, encryptionKey);
  }
}

/**
 * Upload backup file to S3-compatible storage.
 * If BACKUP_ENCRYPTION_KEY is set, encrypts the file with openssl before upload.
 * Requires the AWS CLI (`aws`) to be available in PATH.
 *
 * Required env vars for S3:
 *   BACKUP_S3_BUCKET, BACKUP_S3_REGION, BACKUP_S3_ACCESS_KEY, BACKUP_S3_SECRET_KEY
 */
async function uploadToS3(backupFile, encryptionKey) {
  const bucket = getRequiredEnv('BACKUP_S3_BUCKET');
  const region = getRequiredEnv('BACKUP_S3_REGION');
  const accessKey = getRequiredEnv('BACKUP_S3_ACCESS_KEY');
  const secretKey = getRequiredEnv('BACKUP_S3_SECRET_KEY');

  let fileToUpload = backupFile;

  // Encrypt the backup file if an encryption key is provided
  if (encryptionKey) {
    const encryptedFile = `${backupFile}.enc`;
    await encryptFile(backupFile, encryptedFile, encryptionKey);
    fileToUpload = encryptedFile;
    console.log(`Backup encrypted: ${encryptedFile}`);
  }

  const s3Key = `backups/${path.basename(fileToUpload)}`;
  const s3Uri = `s3://${bucket}/${s3Key}`;

  console.log(`Uploading to ${s3Uri} ...`);

  await new Promise((resolve, reject) => {
    const child = spawn(
      'aws',
      ['s3', 'cp', fileToUpload, s3Uri, '--region', region],
      {
        stdio: 'inherit',
        windowsHide: true,
        env: {
          ...process.env,
          AWS_ACCESS_KEY_ID: accessKey,
          AWS_SECRET_ACCESS_KEY: secretKey,
          AWS_DEFAULT_REGION: region,
        },
      },
    );

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(
          new Error(
            'AWS CLI not found. Install awscli or add `aws` to PATH to enable S3 uploads. ' +
            'Local backup is still available at: ' + backupFile,
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
      reject(new Error(`aws s3 cp exited with code ${code}. Local backup is still available at: ${backupFile}`));
    });
  });

  console.log(`S3 upload complete: ${s3Uri}`);
  // NOTE: Local file is intentionally kept for fast recovery.
}

/**
 * Encrypt a file using openssl aes-256-cbc.
 * To decrypt: openssl enc -aes-256-cbc -d -pbkdf2 -in FILE.enc -out FILE -pass pass:KEY
 */
function encryptFile(inputFile, outputFile, passphrase) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'openssl',
      ['enc', '-aes-256-cbc', '-pbkdf2', '-in', inputFile, '-out', outputFile, '-pass', `pass:${passphrase}`],
      { stdio: 'inherit', windowsHide: true },
    );

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('openssl not found. Install OpenSSL or add it to PATH to enable backup encryption.'));
        return;
      }
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`openssl enc exited with code ${code}`));
    });
  });
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