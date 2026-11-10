# Port0 CLI

> AI-Powered SE-MAX · CUI Tech Fest FA'26 · Team Hallucinati

Port0 is a secure, read-only CLI tool designed to capture your Git working
tree into a handoff packet (`port0-packet.json`) with layered secret
redaction. It runs locally and offline: no accounts, servers, telemetry,
network calls, or LLM calls are used with your code.

## What it captures

- Current branch and HEAD commit
- Recent commits
- Staged and unstaged diffs
- Untracked files, when safe to include
- Your task intent
- An optional failing-test log

The packet is deterministic, size-bounded, schema-validated, and includes a
SHA-256 content hash. Port0 removes denylisted file contents and redacts
supported secret formats before writing output.

## Installation and quick start

### Run with `npx`

Once the package is available from npm, run it directly without a formal
installation:

```bash
npx port0 export --intent "Fix login validation"
```

### Run from this repository

For the current checkout:

```powershell
pnpm install
pnpm build
node .\dist\cli\index.js export --intent "Fix login validation"
```

The repository currently exposes the same executable through
`dist/cli/index.js`; npm publication is the step that enables the `npx port0`
shortcut.

## CLI reference

```text
port0 1.0.0

Usage:
  port0 export [options]        Capture the working tree into a handoff packet
  port0 verify <packet.json>    Validate schema, integrity and secrets
  port0 render <packet.json>   Print the Markdown prompt
  port0 share <packet.json>    Not available in this build
```

### Commands

#### `export`

Captures the current Git state, redacts content, applies the size budget, and
writes a JSON packet, Markdown prompt, or both.

#### `verify <packet.json>`

Validates the packet schema, recomputes its content hash, and re-scans for
known secrets. It exits with code `0` only when the packet is valid and clean.

#### `render <packet.json>`

Prints the Markdown handoff prompt from an existing packet for CLI-to-CLI or
teammate handoff.

#### `share <packet.json>`

Reserved for the planned serverless share-link feature. It is not available in
this build.

### Common workflows

Export a packet with intent:

```bash
npx port0 export --intent "Fix login validation"
```

This captures the branch, HEAD, staged and unstaged diffs, safe untracked
files, and task intent into `port0-packet.json`.

Pipe a failing test log:

```bash
pnpm test 2>&1 | npx port0 export --test-log - --intent "Fix failing tests"
```

The last part of the test output is retained so the receiving tool or
teammate can immediately see the failure.

Write both JSON and Markdown:

```bash
npx port0 export --intent "Refactor auth" --format both
```

This generates `port0-packet.json` for machine/inspector use and
`port0-packet.md` for AI chats or teammate handoff.

Verify an existing packet:

```bash
npx port0 verify port0-packet.json
```

Render the prompt:

```bash
npx port0 render port0-packet.json
```

Use stdout for piping:

```powershell
node .\dist\cli\index.js export --format md --stdout | clip
```

### Export options

| Option | Description | Default |
|--------|-------------|---------|
| `--root <path>` | Repository to capture | Current directory |
| `--out <path>` | Output path inside the repository | `port0-packet.json` |
| `--format <json\|md\|both>` | Output format | `json` |
| `--stdout` | Write the chosen format to stdout instead of a file | Off |
| `--intent <text>` | Task intent description | Empty |
| `--intent-file <path>` | Read task intent from a file inside the repository | None |
| `--test-log <path\|->` | Test output file or `-` for stdin | None |
| `--max-bytes <n>` | Total packet cap; minimum `20000` | `204800` |
| `--no-untracked-content` | List untracked files by path only | Off |
| `--exclude <glob>` | Add a path or glob to the denylist; repeatable | None |
| `--quiet` | Suppress the summary line | Off |
| `--help`, `-h` | Show help information | — |
| `--version`, `-v` | Print version number | — |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Usage error, invalid flag, invalid cap, or path outside root |
| `2` | Not a Git repository or Git is missing |
| `3` | Fail-closed: a secret survived the final scan |
| `4` | I/O error |
| `5` | Verification failed |

## Security and privacy

Port0 uses a path denylist for files such as `.env`, private keys,
credentials, `.aws/`, and `.ssh/`. It also detects and replaces supported AWS,
GitHub, Slack, Stripe, Google API, JWT, bearer, URL-credential, private-key,
AWS-secret, and secret-looking environment assignment patterns.

These are strong safeguards, not a mathematical zero-leakage guarantee.
Pattern-based detection cannot identify every custom secret. Review the packet
before pasting it into a third-party tool.

Port0 also protects against path traversal and symlink escapes, disables
external Git diff execution, writes atomically, and performs a final scan
before output.

## Judge quick start

1. Install Node.js 20+, pnpm, and Git.
2. Run `pnpm install`.
3. Run `pnpm --dir dashboard install`.
4. Run `pnpm build`.
5. Run `pnpm --dir dashboard build`.
6. Run:

   ```powershell
   node .\dist\cli\index.js export --format both --intent "Review the current work"
   ```

7. Inspect `port0-packet.json` and `port0-packet.md`.
8. Run:

   ```powershell
   node .\dist\cli\index.js verify .\port0-packet.json
   ```

9. Run `& .\scripts\conformance.ps1`.

## Development

### Prerequisites

Node.js 20+, pnpm, and Git.

### Environment variables

Port0 does not require application environment variables. Do not commit local
`.env` files; use `.env.example` only for documented placeholders.

### Tests and checks

```powershell
pnpm install
pnpm --dir dashboard install
pnpm test
pnpm typecheck
pnpm build
pnpm --dir dashboard build
& .\scripts\conformance.ps1
```

Vercel uses the repository-level [`vercel.json`](vercel.json) to install both
the CLI and dashboard dependencies, build the shared CLI core first, and then
run the Next.js dashboard build.

Recorded result: **53 unit tests passed, 53 conformance checks passed, 0
failures**.

## Known limitations and roadmap

- Secret detection is pattern-based and cannot guarantee discovery of every
  custom secret.
- `share` is not available in this build.
- The static Packet Inspector is planned and is not part of this tested CLI
  checkout.
- npm publication and the `npx port0` install path are follow-on work.
- High-entropy secret detection is a stretch feature.
- There is no backend, account system, database, telemetry, or network relay.

## Documentation

- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Testing](docs/testing.md)
- [AI usage log](docs/ai-usage-log.md)
- [Judge checks](docs/judge-checks.md)
- [Build thread](threadme.md)

## Team

| Name | Role |
|------|------|
| Rohan Saeed | Frontend UI |
| Shayan Ahmed | CLI |
