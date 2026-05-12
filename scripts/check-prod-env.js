const fs = require('fs');
const path = require('path');
const { loadRootEnv } = require('./runtime-env');

const repoRoot = path.resolve(__dirname, '..');
const argv = new Set(process.argv.slice(2));
const dryRun = argv.has('--dry-run');
const exampleMode = argv.has('--example');
const includeOps = argv.has('--ops') || argv.has('--strict');
const strictMode = argv.has('--strict');

const envPath = path.join(repoRoot, exampleMode ? '.env.example' : '.env');
const envSource = exampleMode ? parseEnvFile(envPath) : loadActualEnv(envPath);

const groups = [
  {
    name: 'Core secrets',
    required: true,
    keys: [
      'DATABASE_URL',
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASS',
      'CORS_ORIGINS',
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_APP_URL',
      'WEB_URL',
    ],
  },
  {
    name: 'Production ops',
    required: includeOps,
    keys: ['BACKUP_DIR', 'BACKUP_RETENTION_DAYS', 'HEALTHCHECK_URL', 'HEALTHCHECK_TIMEOUT_MS'],
  },
  {
    name: 'Payment provider',
    required: isFedapayMode(),
    keys: [
      'FEDAPAY_SECRET_KEY',
      'FEDAPAY_PUBLIC_KEY',
      'FEDAPAY_ENV',
      'FEDAPAY_CALLBACK_URL',
      'FEDAPAY_WEBHOOK_SECRET',
    ],
  },
  {
    name: 'Monitoring alerts',
    required: strictMode,
    keys: ['ALERT_WEBHOOK_URL'],
  },
];

if (dryRun) {
  console.log(`Environment file: ${envPath}`);
  console.log(`Example mode: ${exampleMode ? 'yes' : 'no'}`);
  console.log(`Strict mode: ${strictMode ? 'yes' : 'no'}`);
  console.log(`Operations checks: ${includeOps ? 'enabled' : 'disabled'}`);
  console.log('Checked groups:');

  for (const group of groups) {
    console.log(`- ${group.name}: ${group.required ? 'required' : 'skipped'}`);
  }

  process.exit(0);
}

const errors = [];
const warnings = [];

for (const group of groups) {
  if (!group.required) {
    continue;
  }

  for (const key of group.keys) {
    if (!isConfigured(key, exampleMode)) {
      errors.push(`${group.name}: missing ${key}`);
    }
  }
}

if (!exampleMode && strictMode) {
  const suspiciousUrlKeys = ['NEXTAUTH_URL', 'NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_APP_URL', 'WEB_URL', 'HEALTHCHECK_URL'];

  for (const key of suspiciousUrlKeys) {
    const value = getTrimmedEnv(key);
    if (value && /localhost|127\.0\.0\.1/i.test(value)) {
      warnings.push(`${key} still points to a local URL: ${value}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Production environment check failed.');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Production environment check passed for ${exampleMode ? '.env.example' : '.env'}.`);

if (warnings.length > 0) {
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

function loadActualEnv(actualEnvPath) {
  loadRootEnv({ envPath: actualEnvPath });
  return process.env;
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing environment file: ${filePath}`);
  }

  const env = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = parseEnvValue(trimmed.slice(equalsIndex + 1).trim());

    if (key) {
      env[key] = value;
    }
  }

  return env;
}

function parseEnvValue(rawValue) {
  if (rawValue.length >= 2 && rawValue[0] === '"' && rawValue[rawValue.length - 1] === '"') {
    return rawValue.slice(1, -1);
  }

  if (rawValue.length >= 2 && rawValue[0] === '\'' && rawValue[rawValue.length - 1] === '\'') {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function isFedapayMode() {
  return getTrimmedEnv('PAYMENT_MODE').toLowerCase() === 'fedapay';
}

function isConfigured(name, allowBlank) {
  if (!Object.prototype.hasOwnProperty.call(envSource, name)) {
    return false;
  }

  if (allowBlank) {
    return true;
  }

  return getTrimmedEnv(name).length > 0;
}

function getTrimmedEnv(name) {
  const value = envSource[name];
  return value === undefined ? '' : String(value).trim();
}