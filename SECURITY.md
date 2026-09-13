# Security Policy

## Supported Versions

Both packages in this monorepo are versioned independently and pre-1.0.
Only the latest published version of each package is supported with
security fixes:

| Package                              | Supported          |
| ------------------------------------- | ------------------- |
| `@syall/lsm-recovery-version-api-js`  | latest release only |
| `@syall/verse-reference-builder`      | latest release only |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security
vulnerabilities.

Instead, report it privately using
[GitHub's private vulnerability reporting](https://github.com/syall/lsm-recovery-version-api-js/security/advisories/new)
for this repository. If that isn't accessible to you, open a regular
issue asking to be pointed to an alternate contact — please don't
include vulnerability details in that initial issue.

Please include as much of the following as you can:

- The affected package and version (`@syall/lsm-recovery-version-api-js`
  or `@syall/verse-reference-builder`)
- A description of the vulnerability and its potential impact
- Steps to reproduce, or a minimal proof-of-concept

## What to Expect

- Acknowledgement of your report as soon as possible.
- An assessment of the issue and, if confirmed, a fix released as a
  patch version for the affected package(s).
- Credit in the release notes, if you'd like it.

Neither package has runtime dependencies of its own beyond what's
listed in each `package.json`, which keeps the supply-chain surface
small — but please still report anything that looks off, including in
build/dev tooling.
