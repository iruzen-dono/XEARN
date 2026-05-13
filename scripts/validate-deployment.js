#!/usr/bin/env node

/**
 * XEARN Deployment Validation Script
 * Vérifie que tous les secrets requis sont présents avant un déploiement
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = {
  production: [
    // Database
    'DATABASE_URL',
    // Auth
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    // SMTP
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    // API
    'API_URL',
    'CORS_ORIGINS',
    'NEXTAUTH_URL',
    // Paiements
    'PAYMENT_MODE',
    'FEDAPAY_SECRET_KEY',
    'FEDAPAY_PUBLIC_KEY',
    'FEDAPAY_WEBHOOK_SECRET',
    // Admin seed
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
  ],
  staging: [
    // Same as production for now
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'PAYMENT_MODE',
    'FEDAPAY_SECRET_KEY',
  ],
};

const MUST_NOT_CONTAIN = [
  'votre-secret',
  'changez-moi',
  'remplacez-par',
  'your-',
  '[',
];

function validateEnv(envVars, environment) {
  const errors = [];
  const warnings = [];

  const required = REQUIRED_VARS[environment] || [];

  // Check required variables
  for (const varName of required) {
    if (!envVars[varName]) {
      errors.push(`❌ Missing required variable: ${varName}`);
    }
  }

  // Check for placeholder values
  for (const [key, value] of Object.entries(envVars)) {
    if (!value) continue;

    for (const placeholder of MUST_NOT_CONTAIN) {
      if (value.toLowerCase().includes(placeholder)) {
        warnings.push(
          `⚠️ Variable "${key}" still contains placeholder: "${value.substring(0, 50)}..."`
        );
      }
    }
  }

  // Specific checks
  if (envVars.NODE_ENV !== 'production' && environment === 'production') {
    errors.push('❌ NODE_ENV must be "production" for production deployment');
  }

  if (envVars.PAYMENT_MODE === 'mock' && environment === 'production') {
    errors.push('❌ PAYMENT_MODE must be "fedapay" for production (not "mock")');
  }

  if (
    envVars.DATABASE_URL &&
    !envVars.DATABASE_URL.includes('sslmode=require')
  ) {
    warnings.push(
      '⚠️ DATABASE_URL should include ?sslmode=require for production'
    );
  }

  return { errors, warnings };
}

function main() {
  const args = process.argv.slice(2);
  const environment = args[0] || 'production';

  console.log(`\n🔍 Validating ${environment} environment variables...\n`);

  if (!['production', 'staging'].includes(environment)) {
    console.error(
      `❌ Unknown environment: ${environment}. Use "production" or "staging".`
    );
    process.exit(1);
  }

  // Load env variables from process.env
  const envVars = process.env;

  const { errors, warnings } = validateEnv(envVars, environment);

  if (errors.length > 0) {
    console.error('ERRORS:');
    errors.forEach((e) => console.error(e));
    console.log();
  }

  if (warnings.length > 0) {
    console.warn('WARNINGS:');
    warnings.forEach((w) => console.warn(w));
    console.log();
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log(`✅ All required variables are present and valid!\n`);
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(
      `❌ Deployment validation FAILED. Fix ${errors.length} error(s) before proceeding.\n`
    );
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(
      `⚠️ Deployment has ${warnings.length} warning(s). Review them before proceeding.\n`
    );
    process.exit(0);
  }
}

main();
