# Port0 CLI

> AI-Powered SE-MAX · CUI Tech Fest FA'26 · Team Hallucinati

Port0 is a secure, read-only CLI tool designed to capture your Git working
tree into a handoff packet (`port0-packet.json`) with layered secret
redaction. It runs locally and offline: no accounts, servers, telemetry,
network calls, or LLM calls are used with your code.

## Product overview

Port0 is a privacy-first developer handoff tool for interrupted or changing
AI coding sessions. It captures the relevant state of a Git working tree,
removes known secrets, limits the packet size, and produces a deterministic
packet that can be given to another coding agent or teammate without
reconstructing the task from scratch.

The product has two planned/implemented surfaces:

- **Port0 CLI (current shipped product):** a local Node.js command-line tool
  that reads Git metadata and selected working-tree content, then writes a
  JSON packet, a Markdown handoff prompt, or both.
- **Packet Inspector (dashboard surface):** a browser UI intended to inspect
  and render an existing packet. It does not read repositories or receive
  data from the CLI directly. The current tested release is the CLI; the
  inspector remains a planned/under-development surface.

Port0 does not run an LLM, execute arbitrary project commands, modify source
files, upload repository data, use telemetry, or require accounts, a database,
or a backend relay. The generated packet is still source-code data, so users
should review it before sharing it with a third-party AI tool.

## Architecture

Port0 is deliberately local and stateless:

```text
Git working tree
      |
      v
CLI collection and root/path guards
      |
      v
Layered denylist and secret redaction
      |
      v
Section and total byte budgets
      |
      v
Schema validation + canonical JSON + SHA-256
      |
      +--> port0-packet.json
      +--> port0-packet.md
```

The implementation is split into two layers:

| Layer | Location | Responsibility |
|---|---|---|
| Runtime-neutral core | [`src/core`](src/core) | Packet schema, redaction and audit, size budgeting, canonical serialization, hashing, and prompt rendering |
| Node.js CLI | [`src/cli`](src/cli) | Fixed-argument Git collection, filesystem safety checks, command parsing, verification, rendering, and atomic output |

The core uses Zod for validation and Web Crypto-compatible hashing so it can
be reused by a future browser inspector. The CLI is the only component that
touches the repository. Output is written locally and atomically; there is no
network API in the current build.

## Capacity and scalability

Port0 has no centralized service, so it has no shared server user limit:

- **Users:** Any number of users can run Port0 independently on their own
  machines. User count does not increase load on a Port0 backend because none
  exists.
- **Concurrent runs:** Each invocation is an independent local Node.js
  process and is limited by the user's CPU, memory, disk, and Git repository.
- **Per packet:** The default total packet budget is **204,800 bytes (200 KiB)**.
  Users can configure a larger cap; values below **20,000 bytes** are rejected.
  Intent is capped at 2,048 bytes, test logs at 40,960 bytes, diffs at
  61,440 bytes per section, and untracked content at 30,720 bytes before the
  total budget is applied.
- **Repository scope:** Port0 captures the current Git state rather than
  indexing or uploading the whole repository. Large changes are represented
  with visible truncation and omission metadata.
- **Future dashboard hosting:** A static inspector can scale according to its
  hosting provider's browser and bandwidth limits because packet inspection is
  client-side; it does not create server-side sessions or store packets.

These are design and configuration limits, not a claim that every machine can
process an arbitrarily large repository at the same speed.

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

### Install globally from a local tarball

To install `port0` globally on another Windows PC, such as a sister's laptop,
clone or copy the repository, build it, pack it into a local tarball, and
install that tarball with npm. Do not use `npm port0 install`; the correct
command is `npm install -g`.

1. Clone the repository and enter its folder:

   ```powershell
   git clone https://github.com/shayanahmed1212/Port0.git
   cd Port0
   ```

   Verify that you are in the `Port0` folder and can see `package.json`:

   ```powershell
   dir
   ```

2. Install dependencies, build the CLI, and create the installer tarball:

   ```powershell
   pnpm install
   pnpm build
   npm pack
   ```

   A file named `port0-1.0.0.tgz` should appear in the folder.

3. Install the tarball globally:

   ```powershell
   npm install -g .\port0-1.0.0.tgz
   ```

4. Verify that `port0` is available from anywhere:

   ```powershell
   port0 --help
   ```

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

For Vercel, set the project **Root Directory** to `dashboard`. The
dashboard-relative [`vercel.json`](vercel.json) installs the dashboard
lockfile and runs its build. The dashboard `prebuild` then installs the parent
CLI dependencies, builds the shared CLI core first, and runs the Next.js
dashboard build.

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

- [Final Product Master Specification](Port0%20Final%20Product%20Master%20Specification%20(Build%20Day%20v1.0).md)
- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Testing](docs/testing.md)
- [AI usage log](docs/ai-usage-log.md)
- [Judge checks](docs/judge-checks.md)
- [Submission notes](SUBMISSION.md)
- [Build thread](threadme.md)

## Team

| Name | Role |
|------|------|
| Rohan Saeed | Frontend UI |
| Shayan Ahmed | CLI |
