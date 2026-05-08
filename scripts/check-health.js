const {
  getEnv,
  getIntEnv,
  loadRootEnv,
  formatTimestamp,
} = require('./runtime-env');

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  loadRootEnv();

  const healthUrl = resolveHealthUrl();
  const timeoutMs = getIntEnv('HEALTHCHECK_TIMEOUT_MS', 5000);
  const alertWebhookUrl = getEnv('ALERT_WEBHOOK_URL', '');

  if (dryRun) {
    console.log(`Health check URL: ${healthUrl}`);
    console.log(`Timeout (ms): ${timeoutMs}`);
    console.log(`Alert webhook configured: ${alertWebhookUrl ? 'yes' : 'no'}`);
    return;
  }

  let response = null;
  let responseBody = null;

  try {
    response = await fetchWithTimeout(healthUrl, timeoutMs);
    responseBody = await readResponseBody(response);

    if (response.ok && isHealthyResponse(responseBody)) {
      console.log(`Healthy: ${healthUrl}`);
      return;
    }
  } catch (error) {
    responseBody = { error: error.message || String(error) };
  }

  const message = buildFailureMessage(healthUrl, response, responseBody);
  console.error(message);

  if (alertWebhookUrl) {
    try {
      await sendAlert(alertWebhookUrl, message, healthUrl, response, responseBody);
    } catch (error) {
      console.error(`Alert webhook failed: ${error.message || error}`);
    }
  }

  process.exit(1);
}

function resolveHealthUrl() {
  const explicitUrl = getEnv('HEALTHCHECK_URL', '');
  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl = getEnv('API_URL', getEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000'));
  return baseUrl.endsWith('/api/health') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api/health`;
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      headers: {
        'user-agent': 'xearn-health-check/1.0',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
}

function isHealthyResponse(body) {
  if (!body) {
    return false;
  }

  if (typeof body === 'string') {
    return body.toLowerCase().includes('ok');
  }

  return body.status === 'ok' || body.db === 'connected';
}

function buildFailureMessage(healthUrl, response, responseBody) {
  const statusText = response ? `${response.status} ${response.statusText}` : 'no response';
  const bodyText =
    responseBody && typeof responseBody === 'object' ? JSON.stringify(responseBody) : String(responseBody || '');

  return [
    `XEARN health check failed at ${formatTimestamp(new Date())}`,
    `URL: ${healthUrl}`,
    `Status: ${statusText}`,
    bodyText ? `Body: ${bodyText}` : 'Body: (empty)',
  ].join('\n');
}

async function sendAlert(webhookUrl, message, healthUrl, response, responseBody) {
  const payload = {
    text: message,
    content: message,
    message,
    healthUrl,
    status: response ? response.status : null,
    responseBody,
  };

  const alertResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'xearn-health-check/1.0',
    },
    body: JSON.stringify(payload),
  });

  if (!alertResponse.ok) {
    throw new Error(`webhook returned ${alertResponse.status}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});