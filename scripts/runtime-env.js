const fs = require('fs');
const path = require('path');

function parseEnvValue(rawValue) {
  if (rawValue.length >= 2 && rawValue[0] === '"' && rawValue[rawValue.length - 1] === '"') {
    return rawValue.slice(1, -1);
  }

  if (rawValue.length >= 2 && rawValue[0] === '\'' && rawValue[rawValue.length - 1] === '\'') {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
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

function loadRootEnv(options = {}) {
  const envPath = options.envPath || path.resolve(__dirname, '..', '.env');
  const overwrite = Boolean(options.overwrite);
  const parsed = loadEnvFile(envPath);

  for (const [key, value] of Object.entries(parsed)) {
    if (overwrite || process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return parsed;
}

function getEnv(name, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

function getRequiredEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getIntEnv(name, fallback) {
  const rawValue = getEnv(name, fallback === undefined ? '' : String(fallback));
  const parsed = Number.parseInt(rawValue, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
  ].join('-') + `T${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}Z`;
}

module.exports = {
  formatTimestamp,
  getEnv,
  getIntEnv,
  getRequiredEnv,
  loadRootEnv,
};