# Security Policy

## Reporting a Vulnerability

**Do not file public GitHub issues for security vulnerabilities.**

Please report security vulnerabilities by emailing **security@molecule.dev**.

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected package(s) and version(s)
- Impact assessment (if known)

## Response Timeline

- **Acknowledgment**: Within 48 hours of report
- **Initial assessment**: Within 1 week
- **Fix timeline**: Depends on severity; critical issues prioritized
- **Disclosure**: Coordinated disclosure after fix is released (90-day maximum)

## Scope

- All `@molecule/*` packages published to npm
- Security issues in the monorepo build and CI infrastructure

## Out of Scope

- Vulnerabilities in third-party dependencies — please report these to the upstream maintainer
- Security issues in applications built with molecule — please report these to the application maintainer

## Supported Versions

Security fixes are applied to the latest major version of each affected package.
