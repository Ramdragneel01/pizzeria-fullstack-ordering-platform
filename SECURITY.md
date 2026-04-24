# Security Policy

## Supported Versions

Security updates are applied to the latest `main` branch.

## Reporting a Vulnerability

1. Do not disclose vulnerabilities in public issues.
2. Report privately to the repository owner with reproduction details.
3. Include severity, impact, and affected endpoints.

## Current Security Baseline

1. API routes validate required order fields.
2. Status updates enforce transition rules.
3. CI includes dependency audit execution (`npm audit --omit=dev`).
