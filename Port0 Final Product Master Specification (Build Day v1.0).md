# Port0: Final Product Master Specification (Build Day v1.0)

**Team Hallucinati** · Rohan Saeed & Shayan Ahmed · CUI Tech Fest FA'26, AI-Powered SE-MAX

*Switch tools. Keep the context. Leave the secrets behind.*

## 1. Product Summary

Port0 captures the uncommitted working state of a Git repository (branch, HEAD, staged/unstaged diffs, untracked files, a failing test log you provide, and your stated intent) into one **deterministic, secret-redacted, size-bounded handoff packet**. You can paste that packet into another AI tool (Claude Code, Cline, Claude.ai, ChatGPT) or hand it to a teammate without re-explaining the task or leaking credentials.

Port0 ships as two surfaces that share one core library:

1. **CLI (the core product):** `npx port0 export`. Local, read-only, offline.
2. **Packet Inspector (static web page):** paste or drop a packet, verify it, view it in tabs, and copy it as an AI-ready prompt. It runs 100% in the browser, has no backend, and makes no network requests with your data.

## 2. Scope Lock

**Must ship (MVP):**

- `port0 export` with git state collection, path guard, redaction, size budget, deterministic serializer, exit codes
- JSON packet plus Markdown prompt rendering
- Static Packet Inspector (verify, audit, tabs, prompt copier, sample packet), deployed to a free host
- Test suite, CI, README, design/requirements/testing docs, AI usage log

**Should ship, then stretch (only once the MVP is green and tested):**

- `port0 verify` and `port0 render` (small, they reuse the shared core)
- Serverless share link with optional passphrase (section 7)
- Publish to npm so `npx port0` works for judges
- High-entropy secret detection

**Explicitly out of scope:**

- Server relay, session tokens, accounts, any backend or database (the serverless share link in section 7 replaces the relay)
- Running tests or any arbitrary command
- Writing to project source files (only the output packet file is written)
- Telemetry, network listeners, tunnels, LLM calls inside Port0

These limits match our approved Round 1 idea, whose non-goals already excluded network listeners, tunnels, cloud databases and accounts.

## 3. Problem and Users

Engineers moving work between terminal agents, IDE extensions, web chats and teammates lose 10–15 minutes per switch re-describing the task, copying diffs and hunting for test logs. Manual copy-paste also leaks `.env` contents, tokens and keys into third-party chats. Generic repo packers dump the whole codebase and bloat the prompt; Port0 packages only the in-progress change.

**Primary user:** a developer using AI coding agents who hits a rate limit or crash mid-task. **Secondary user:** a teammate receiving a half-finished task.

## 4. How the Parts Connect

The CLI is the only part that touches your repository; the web inspector and every receiving tool only ever see the packet it produces.

&#91;embedded content: CLI, packet file, inspector and handoff paths · 3 paths\]

Everything starts at `port0 export`. The packet file then travels one of three ways: rendered to Markdown for a local agent or teammate, dragged or pasted into the inspector, or carried inside a share link. The inspector never sends the packet anywhere; it displays it, checks it and builds the prompt you copy.

### 4.1 The three handoff paths

| Path | How | Receiver | Needs | Tier |
| --- | --- | --- | --- | --- |
| 1. File to inspector | `port0 export`, then drag the JSON into the inspector or paste its text | A web chat such as Claude.ai or ChatGPT, through the inspector's Prompt tab | A browser | Must ship |
| 2. Markdown | `port0 export --format md`, or `port0 render` on an existing packet. To skip the file, pipe it: `port0 export --format md --stdout \| clip` (Windows) or `\| pbcopy` (macOS) | A local agent (Claude Code, Cline) or a teammate | Nothing; paste the text or point the agent at the file | Must ship |
| 3. Share link | `port0 share <packet>`, then open the printed link | The inspector, on any machine | A browser; optional passphrase | Stretch |

### 4.2 Who does what

| Concern | CLI | Web inspector |
| --- | --- | --- |
| Reads the repository | Yes, read-only git | Never |
| Redacts secrets | Yes, before anything is written | No; it re-audits only |
| Content hash | Computes and writes `contentHash` | Recomputes and compares |
| Schema validation | Before writing | After reading |
| Builds the AI prompt | `--format md` and `render` | Prompt tab |
| Network use | None | None with packet data |
| What it stores | The output file only | Nothing |

### 4.3 The shared contract

One runtime-neutral core keeps the two surfaces in agreement, so a packet the CLI calls clean is a packet the inspector calls clean.

- `schema.ts`: the strict Zod packet schema.
- `serializer.ts`: canonical JSON and SHA-256 using WebCrypto, which exists in both Node 20 and the browser, so there is one implementation.
- `redactor.ts`: the same patterns drive CLI redaction and the inspector's audit.
- `prompt.ts`: the same templates drive `render` and the Prompt tab, so both produce identical Markdown.

A golden packet fixture (`tests/fixtures/golden-packet.json`), exported once by the CLI, is verified by both the CLI tests and the web tests. If either side drifts, a test fails.

```
src/core/   schema · serializer · redactor · budget · prompt   (runs in Node and browser)
src/cli/    index · git · guard · io                           (Node only)
web/        Vite app that imports src/core                     (browser only)
tests/      unit · property · fixtures · e2e
```

## 5. CLI Specification

The CLI is a read-only Node.js tool (TypeScript, `execa`, Zod) that turns a working tree into a packet in seven fixed stages and writes nothing except its own output files. It is the source of truth: the web inspector only displays what the CLI produced.

### 5.1 Commands

| Command | What it does | Tier |
| --- | --- | --- |
| `port0 export` | Capture, redact, budget, serialize and write a packet | Must ship |
| `port0 verify <packet>` | Validate schema, recompute the hash, re-scan for secrets; exit 0 only if clean | Should ship (reuses core, about 20 lines) |
| `port0 render <packet>` | Print the Markdown handoff prompt from an existing packet (CLI-to-CLI and teammate handoff) | Should ship |
| `port0 share <packet>` | Print an inspector URL that carries the packet in its URL fragment (section 7) | Stretch |
| `port0 --help`, `--version` | Usage and version | Must ship |

### 5.2 `export` flags

| Flag | Default | Behavior |
| --- | --- | --- |
| `--root <dir>` | current directory | Project root. Must be inside a git work tree. Resolved with `realpath`; every later read is checked against it. |
| `--out <path>` | `port0-packet.json` | Output file. Must resolve inside `--root`. Port0 always leaves its own output files (`port0-packet.*`) out of the capture, so a re-run never includes the previous packet. |
| `--format <json, md or both>` | `json` | `md` writes `port0-packet.md` (the AI-ready prompt); `both` writes both files. |
| `--stdout` | off | Write the chosen format to stdout instead of a file, for piping (`port0 export --format md --stdout \| clip`). Status lines go to stderr only. |
| `--intent <text>` | empty | What you were doing and what to do next. Max 2,000 characters; redacted like everything else. |
| `--intent-file <path>` | none | Same, read from a file inside the root. |
| `--test-log <path or ->` | none | Failing test output from a file inside the root or from stdin. The last 40 KB is kept, because failures sit at the end. |
| `--max-bytes <n>` | 204800 | Total packet cap. Minimum 20,000; lower values are rejected with exit code 1. |
| `--no-untracked-content` | off | List untracked files by path only. |
| `--exclude <glob>` | none | Extra denylist pattern; repeatable. Matching files appear by name only. |
| `--quiet` | off | Suppress the summary line. |

### 5.3 Pipeline (seven stages)

1. **Validate environment.** Run `git --version`; resolve the root with `git rev-parse --show-toplevel` and `fs.realpathSync`. Not a repo gives exit 2.
2. **Collect (`git.ts`).** Run the fixed git commands in 5.4 and parse the output. Nothing here is built from user input except the validated root.
3. **Guard (`guard.ts`).** Canonicalize every path with `realpath` and reject anything outside the root. Symlinks pointing outside the root are listed by name and never followed.
4. **Redact (`redactor.ts`).** Apply the path denylist, then content patterns (5.5), to every string that will leave the machine: diffs, untracked contents, test log, intent, even branch names.
5. **Budget (`budget.ts`).** Enforce per-section and total caps (5.6) and insert truncation markers.
6. **Serialize (`serializer.ts`).** Build the canonical packet, sort keys and paths, normalize line endings, compute `contentHash` (5.7).
7. **Final scan and write.** Re-run every redaction pattern over the exact bytes about to be written. Any hit means nothing is written and the exit code is 3. Otherwise write atomically (temp file in the same directory, then rename).

### 5.4 Git collection (read-only by construction)

All git calls use `execa` with an argument array (never a shell string), `cwd` set to the root, and this environment: `GIT_OPTIONAL_LOCKS=0` (stops `git status` from refreshing the index), `GIT_PAGER=cat`, `LC_ALL=C`, `GIT_TERMINAL_PROMPT=0`, and no `GIT_EXTERNAL_DIFF`. Diffs add `--no-ext-diff --no-textconv --no-color`, so a repo config cannot make git run an external program. Every call also passes -c core.fsmonitor=false, because a repo config can name a program there too.

| Data | Command | Edge-case handling |
| --- | --- | --- |
| Branch | `git symbolic-ref --short -q HEAD` | Empty result means detached HEAD: record `detached: true` and the short hash |
| HEAD commit | `git rev-parse HEAD` | Fails on a repo with no commits: record `headCommit: null` |
| Status and renames | `git status --porcelain=v2 -z --untracked-files=all` | NUL-separated, so spaces, quotes and unicode in names are safe |
| Staged diff | `git diff --cached --no-ext-diff --no-textconv --no-color` | No commits yet: diff against the empty tree |
| Unstaged diff | `git diff --no-ext-diff --no-textconv --no-color` | Binary files show as a one-line notice; content is never included |
| Untracked files | From the status output | Included as content only if text, at most 20 KB each and 50 files; otherwise path plus reason |
| Recent context | `git log -n 5 --format=%h%x09%s` | Gives the receiving AI a feel for commit style; subjects are redacted too |

Text versus binary is decided by a NUL byte in the first 8 KB. Files over 20 KB are cut with a marker.

### 5.5 Redaction rules

**Layer 1, path denylist.** These files appear in `status` by name with `contentOmitted: denylist`, and their entire diff block is deleted from the diff text, not just masked: `.env` and `.env.*` (except `.env.example` and `.env.sample`), `*.pem`, `*.key`, `*.p12`, `*.pfx`, `*.keystore`, `id_rsa*`, `id_ed25519*`, `.npmrc`, `.netrc`, `.pgpass`, `credentials*`, `secrets.*`, and anything under `.aws/` or `.ssh/`. Users can add more with `--exclude`.

**Layer 2, content patterns.** Each match becomes `[REDACTED:<type>]` and is counted.

| Type | What it matches |
| --- | --- |
| `aws-access-key` | `AKIA` or `ASIA` followed by 16 uppercase letters or digits |
| `aws-secret` | 40-character base64 value on a line whose key name mentions aws secret access key |
| `github-token` | `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_` plus 36 or more characters, and `github_pat_` tokens |
| `slack-token` | `xoxb-`, `xoxp-`, `xoxa-`, `xoxr-`, `xoxs-` tokens |
| `stripe-key` | `sk_live_`, `sk_test_`, `rk_live_` plus 16 or more characters |
| `google-api-key` | `AIza` plus 35 URL-safe characters |
| `jwt` | Three base64url segments, the first starting with `eyJ` |
| `private-key` | Whole `BEGIN ... PRIVATE KEY` to `END ... PRIVATE KEY` block |
| `bearer-token` | `Bearer` followed by 20 or more token characters |
| `url-credentials` | `scheme://user:password@host`; only the password part is replaced |
| `env-assignment` | A line assigning a value to a name containing SECRET, TOKEN, PASSWORD, PASSWD, API\_KEY, PRIVATE\_KEY or CREDENTIAL; the name stays, the value goes |
| `high-entropy` | Quoted string of 32 or more characters with Shannon entropy above 4.5 assigned to a secret-sounding name (stretch) |

**Layer 3, fail-closed final scan.** After serialization, every pattern runs again over the final bytes. A hit means no output and exit code 3, with a message naming the pattern type and the section (never the value).

**Redaction report.** The packet carries counts per type and the list of denylisted paths, so the inspector can show proof of what was removed without ever containing the removed values.

### 5.6 Size budget

| Section | Cap | Kept when over cap |
| --- | --- | --- |
| Intent | 2 KB | Cut at the limit |
| Test log | 40 KB | Last lines (the tail) |
| Staged diff | 60 KB | Whole per-file blocks in path order, rest omitted |
| Unstaged diff | 60 KB | Same |
| Untracked contents | 30 KB | Whole files in path order, rest listed by path |
| Status, repo, redaction report | Never cut | Always present |

If the total still exceeds `--max-bytes`, sections shrink in this order until it fits: untracked contents, unstaged diff, staged diff, test log. Cuts happen at file or line boundaries, never mid-line, and each leaves `[TRUNCATED: N files, M bytes omitted]` in the text plus the omitted file names in `budget.omittedFiles`. Intent and status are never dropped.

### 5.7 Deterministic serialization

- Keys sorted recursively; arrays of files sorted by UTF-8 byte order of the path (not locale).
- Paths are POSIX style (`/`) and relative to the root; no absolute paths, no username, no hostname.
- All text converted to LF; UTF-8 without BOM; JSON with 2-space indent and one trailing newline.
- No timestamps, durations, random IDs or tool-run metadata anywhere in the packet.
- `contentHash` is the SHA-256 of the canonical packet with the `contentHash` field removed, written as 64 lowercase hex characters.

The hash is computed identically in the CLI and in the browser, which is what makes the inspector's integrity check meaningful.

### 5.8 Output formats

`port0-packet.json` is the canonical machine format. `port0-packet.md` (also what `render` prints) is the AI-ready prompt with these sections in order: Task intent, Repo state (branch, HEAD, recent commits), Failing tests, Changed files table, Staged diff, Unstaged diff, Untracked files, Safety note (redaction counts and denylisted files), and a footer with the packet hash and Port0 version.

### 5.9 Terminal output and exit codes

On success, one summary line on stderr, which also makes a good demo moment: `Wrote port0-packet.json (84.2 KB of 200 KB) · 2 files denied · 5 secrets redacted · 1 section truncated · sha256 9f3a1c…`.

| Code | Meaning | Message style |
| --- | --- | --- |
| 0 | Success | Summary line |
| 1 | Usage error (bad flag, `--max-bytes` too small, path outside root) | One line plus the fix |
| 2 | Not a git repo, or git not installed | One line plus the fix |
| 3 | Fail-closed: the final scan found a secret pattern | Pattern type and section only; nothing written |
| 4 | I/O error (unreadable file, unwritable output) | Path and reason |
| 5 | `verify` failed: schema invalid, hash mismatch or secret found | What failed |

## 6. Web Inspector Specification

The inspector is a static single-page app that opens a packet, proves it is intact and clean, shows it in readable tabs, and turns it into a ready-to-paste prompt. It has no backend, no accounts and no storage of packet content. It reuses the CLI's `src/core` code (schema, redaction patterns, serializer), so both surfaces agree on what a valid, clean packet is.

### 6.1 Stack and hosting

- **Stack:** Vite + TypeScript with plain DOM or Preact, importing `src/core` directly. Output is one static folder (`web/dist`).
- **Hosting:** any free static host (Vercel, Netlify, Cloudflare Pages or GitHub Pages). Use the free URL the host gives you; buying the `app.port0.dev` domain is not worth build time.
- **No outbound requests:** the app code never calls `fetch`, XHR or WebSocket. System fonts only, no analytics, no CDN scripts. A CSP meta tag enforces it: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'`. If the host supports response headers, send the same policy as a header too.
- **No persistence:** packet content lives only in memory for the open tab. Only the theme choice may be stored.

### 6.2 Screens and states

| State | What the user sees | Trigger |
| --- | --- | --- |
| Empty | Drop zone, paste box, and a **Try the sample packet** button (a bundled demo packet, so judges can explore without installing anything) | First load |
| Parsing | Brief progress indicator | File dropped, text pasted, or share link opened |
| Invalid | Error panel naming the problem: not JSON, schema mismatch with the field path, unsupported `schemaVersion`, or file over 5 MB | Any check in 6.4 step 1 or 2 fails |
| Loaded | Header bar and tabs | All checks ran |
| Loaded with warning | Red banner above the tabs; **Copy** disabled until the user confirms | Hash mismatch or audit finding |

### 6.3 Header bar (visible in every loaded state)

Repo name, branch chip, short HEAD hash, a size meter (used bytes of cap), and three status badges: **Schema** (valid), **Integrity** (hash verified), **Audit** (0 findings). Actions: Copy prompt, Download `.md`, Load another packet.

### 6.4 Client-side verification pipeline

1. **Read and parse.** Reject input over 5 MB or invalid JSON.
2. **Validate** with the shared Zod schema; show the failing field path.
3. **Integrity.** Re-serialize with the shared canonical serializer, hash with `crypto.subtle.digest('SHA-256')`, and compare to `contentHash`. The panel shows expected and computed values. A mismatch means the packet was edited after export.
4. **Audit.** Run every redaction pattern over every string in the packet and check every path against the denylist. Findings list the section, pattern type and a masked preview (first two characters, then asterisks), never the full value.
5. **Render** the tabs.

The canonical serializer must produce the same bytes in the browser and in Node. A golden-file test (one packet exported by the CLI, verified by the web code) guards this.

### 6.5 Tabs

| Tab | Contents |
| --- | --- |
| Overview | Intent, branch and HEAD, last 5 commits, counts of staged, unstaged and untracked files, size meter, any truncation notices |
| Changes | Files grouped as staged, unstaged, untracked and renamed, with colored state letters; clicking a file jumps to its diff |
| Diffs | Staged and unstaged toggle; unified diff with line numbers and add/remove coloring; per-file collapse; filename filter; truncation markers shown as visible banners; long diffs render the first 5,000 lines with a **Show more** control |
| Untracked | File list and a content viewer, or the reason content was omitted (binary, too large, denylist) |
| Test Log | Monospaced tail of the log; lines matching FAIL, Error or similar are highlighted; copy button |
| Redaction and Audit | Counts per secret type, denylisted file names, audit result, integrity detail, and a plain note on what Port0 cannot guarantee |
| Prompt | Template picker, option toggles, live preview, size estimate, Copy |

### 6.6 Prompt copier

Templates are fixed text with the packet filled in. No LLM is called.

| Template | For | What it contains |
| --- | --- | --- |
| Web chat (Claude.ai, ChatGPT) | A chat that has never seen the repo | Preamble saying this is an in-progress task moved from another tool; intent; repo state; failing tests; staged and unstaged diffs; untracked contents; closing instruction to find the cause of the failure, propose the next change as a unified diff, and ask before assuming anything missing |
| Terminal agent (Claude Code, Cline) | A local agent on the same machine | Shorter: intent, failing tests, changed-file list. It says the working tree already contains the changes and the agent must not re-apply the diffs. Diffs are off by default. |
| Teammate | A human reviewer | Plain Markdown status: what I was doing, what is broken, what changed, suggested next step. No instruction preamble. |

Toggles: include diffs, include untracked contents, include test log. The preview shows a size estimate (characters divided by 4) and warns above roughly 100,000 tokens. Copy uses `navigator.clipboard.writeText` with a selected-textarea fallback. **Download .md** saves the same text.

### 6.7 Safety behaviors

- **Untrusted content.** A packet is untrusted input. All packet text is rendered with `textContent`, never `innerHTML`, so a packet containing HTML or script tags cannot run anything.
- **Gate on problems.** With a hash mismatch or audit finding, Copy and Download stay disabled until the user ticks **I understand this packet may contain secrets or edited content**.
- **Share links.** On load, if `location.hash` holds a share payload (section 7), decode it, run the same pipeline, then clear the hash with `history.replaceState` so the payload does not linger in the address bar or history.

### 6.8 UX and quality bar

Dark mode by default with `prefers-color-scheme` support; usable from 360 px wide; tabs follow ARIA tab-pattern keyboard behavior (arrow keys); visible focus styles; contrast at least 4.5:1; every error says what to do next.

## 7. Serverless Share Link (replaces the relay) — Stretch

The share link moves a packet from the CLI to the web inspector, or to a teammate, with no server at all: the packet travels inside the URL fragment (everything after `#`), which browsers never send over the network. This delivers the original goal of the Ephemeral Peer Handoff Relay (CLI-to-web and person-to-person transfer) without any listener, database or account.

### 7.1 How it works

1. The user runs `port0 share port0-packet.json` (optionally with `--passphrase`).
2. The CLI takes the canonical packet bytes and compresses them with raw deflate (`zlib.deflateRawSync`, level 9).
3. With a passphrase, it encrypts the result: key derived with PBKDF2-SHA256 (600,000 iterations, 16-byte random salt), cipher AES-256-GCM with a 12-byte random IV. The passphrase is shared out of band and is never in the URL.
4. It encodes the bytes as base64url and prints `<inspector-url>/#<payload>`. The CLI only prints the link; it never opens a browser or a connection.
5. The inspector reads `location.hash`, decodes, asks for the passphrase if needed, decrypts, decompresses (`DecompressionStream('deflate-raw')`), runs the verification pipeline from 6.4, then clears the hash.

### 7.2 Link format

| Part | Meaning |
| --- | --- |
| `#v1` | Format version; unknown versions are rejected with a clear message |
| `.z.` or `.e.` | `z` = compressed only, `e` = compressed and encrypted |
| Payload (`z`) | base64url of the deflated packet |
| Payload (`e`) | base64url of salt, IV and ciphertext, joined in that order |

### 7.3 Limits and honest caveats

- **Size.** Many chat and email tools truncate long links. The CLI warns above 8,000 characters, refuses above 100,000, and in both cases suggests sharing the packet file instead.
- **Without a passphrase** the link is readable by anyone who holds it. The packet is already redacted, but it still contains the user's code, so the CLI prints a one-line reminder.
- **Expiry.** An optional `--expires <hours>` value inside the link envelope makes the inspector refuse stale links. This is a courtesy, not a security control, because nothing stops someone from decoding the link by hand.
- **Not a live relay.** There is no push, no token pull and no storage. CLI-to-CLI transfer uses the packet file plus `port0 render` on the receiving machine.

### 7.4 Why no server relay

A server relay contradicts the approved Round 1 idea (no network listeners, tunnels, cloud databases or accounts), and the rulebook does not allow the core idea to change without organizer approval. It would also weaken the claim that unencrypted code never reaches a server. Post-hackathon roadmap: an end-to-end encrypted relay that stores only ciphertext with a short time-to-live.

## 8. Packet Schema (v1)

The packet is one JSON object validated by a single strict Zod schema in `src/core/schema.ts`, shared by the CLI (before writing) and the inspector (after reading). Unknown keys are rejected.

| Field | Type | Rule |
| --- | --- | --- |
| `schemaVersion` | string | Literal `"1"`; the inspector rejects other major versions |
| `port0Version` | string | CLI version that produced the packet |
| `contentHash` | string | 64 lowercase hex characters; SHA-256 of the canonical packet without this field |
| `intent` | string | At most 2,000 characters; redacted |
| `repo.name` | string | Folder name only, never an absolute path |
| `repo.branch` | string or null | Null when detached |
| `repo.detached` | boolean | True when HEAD is not on a branch |
| `repo.headCommit` | string or null | 40 hex characters; null in a repo with no commits |
| `repo.recentCommits` | array, max 5 | Items of short hash and redacted subject |
| `status` | array | Sorted by `path`; items of `path`, `state` (A, M, D, R, C, U or ?), `staged`, `unstaged`, optional `renamedFrom`, optional `contentOmitted` (denylist, binary, too-large, symlink or budget) |
| `diffs.staged` | object | `text` and `truncated` |
| `diffs.unstaged` | object | `text` and `truncated` |
| `untracked` | array | Sorted by `path`; items of `path` plus either `content` or `omittedReason` |
| `testLog` | object or null | `text`, `truncated`, `source` (file or stdin) |
| `redaction.counts` | object | Secret type name to integer count; no values |
| `redaction.deniedPaths` | array | Sorted paths excluded by the denylist |
| `budget` | object | `maxBytes`, `usedBytes` (UTF-8 size of the section texts), `truncatedSections`, `omittedFiles` |

**Global rules.** All paths are relative, POSIX-style and contain no `..`. All text uses LF line endings. No field holds a timestamp, absolute path, hostname or username. Total canonical size is at most `budget.maxBytes`.

Example of the top of a packet (abbreviated):

```json
{
  "budget": { "maxBytes": 204800, "omittedFiles": [], "truncatedSections": [], "usedBytes": 18342 },
  "contentHash": "9f3a1c...",
  "intent": "Fix login validation; test_login_empty_password still fails",
  "port0Version": "1.0.0",
  "repo": { "branch": "fix/login", "detached": false, "headCommit": "a78d969...", "name": "demo-app" },
  "schemaVersion": "1"
}
```

Keys appear in alphabetical order because the serializer sorts them.

## 9. Security Guarantees and Threat Model

Port0 makes a small set of precise claims and backs each with a mechanism and a test. Anything it cannot promise is stated in the README and in the inspector's Audit tab.

### 9.1 What Port0 guarantees

- **Read-only and offline CLI.** No network modules are imported in `src/cli` or `src/core` (enforced by an ESLint `no-restricted-imports` rule on `net`, `http`, `https`, `dgram`, `tls`), git runs with fixed arguments, and the only files written are the requested outputs.
- **Deterministic output.** Identical repository state gives byte-identical packets and the same hash.
- **Bounded output.** The packet never exceeds the byte cap.
- **Known secret formats and denylisted files never leave.** Enforced by the redactor and the fail-closed final scan.
- **Inspector sends nothing.** No outbound requests; CSP `connect-src 'none'`; verified by an automated test that records network activity.

### 9.2 Threat model

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Secret reaches an AI chat inside a diff or log | Path denylist, content patterns, fail-closed final scan, independent re-audit in the inspector | A secret in a format Port0 does not recognize, such as a custom token or a password written in prose |
| Path traversal or symlink escape reads files outside the project | `realpath` on every path, root containment check, symlinks never followed | None known |
| A hostile repo config makes git run a program | `--no-ext-diff`, `--no-textconv`, `GIT_PAGER=cat`, `GIT_OPTIONAL_LOCKS=0`, and `-c core.fsmonitor=false` on every call | A git feature we did not anticipate; mitigated by using only `status` and `diff` plus the commands in 5.4 |
| A hostile packet attacks the inspector (script injection) | `textContent` rendering only, strict CSP, size limit, strict schema | None known |
| Packet edited after export | SHA-256 integrity check in the inspector and `port0 verify` | The hash detects accidental or careless edits only. It is not a signature, because anyone can recompute it. |
| Prompt injection: text inside code or logs that tries to instruct the AI | Templates put packet content inside clearly labeled sections and tell the model it is data, not instructions | Not fully preventable; the user should review before pasting |
| Oversized or malformed input | 5 MB inspector limit, byte caps in the CLI, schema validation | None known |
| Malicious dependency | Few dependencies, committed lockfile, `pnpm audit` in CI | Normal ecosystem risk |

### 9.3 What Port0 does not claim

It does not claim to find every secret, to prove a packet is authentic, to stop a user from pasting sensitive code they chose to include, or to stop a receiving AI from following instructions hidden in the code. It reduces accidental leakage and context loss; it does not replace judgment.

## 10. Test Plan (20% of score)

| Area | Tests |
| --- | --- |
| Serializer | Property-based (fast-check): shuffled input order gives identical bytes; any content change gives a different hash; no timestamps, absolute paths or CRLF in output |
| Redactor | Property-based: generated secrets of every type never appear in output; denylisted files never appear by content or inside diffs; a planted leak triggers fail-closed exit code 3 |
| Path Guard | `../` traversal, absolute paths, a symlink pointing outside the root, and `--out` outside the root are all rejected |
| Budgeter | Output never exceeds the cap; truncation markers and `omittedFiles` present; priority order respected; cuts land on file or line boundaries |
| Git collector | Fixture repos: clean tree, staged only, unstaged only, untracked, rename, binary file, detached HEAD, no commits, non-repo directory, filenames with spaces and unicode, and a hostile config (an external diff driver or `core.fsmonitor` script that writes a marker file; the marker must never appear) |
| CLI integration | Exit codes 0 to 5; `--test-log` from file and stdin; `--stdout`; each `--format`; two runs give identical bytes; the previous packet is not captured on a re-run; `verify` rejects a tampered packet; `render` output equals the Prompt tab text |
| Inspector | Valid, invalid, tampered and leaking packets; a packet containing script tags renders as plain text; an automated check that the page makes zero network requests; the golden packet verifies; keyboard navigation of tabs |
| Share link | Encode and decode round trip; wrong passphrase rejected; unknown version rejected; size warnings at 8,000 and 100,000 characters |
| Dogfood | Run `port0 export` on this repo and open the result in the live inspector |

**Test-data warning:** never commit realistic-looking fake secrets. GitHub push protection can block the push and judges may flag it. Build fake keys at runtime in tests (string concatenation or a generator) instead of writing them as literals.

CI (`ci.yml`) runs lint, typecheck and tests on every push.

## 11. Time-Boxed Build Plan (hard stop 3:00 PM)

| Window | Goal |
| --- | --- |
| 10:30–11:15 | Repo structure, Zod schema, canonical serializer and hash, path guard, with tests |
| 11:15–12:15 | Git collector against fixture repos, redactor and denylist, fail-closed final scan, with tests |
| 12:15–1:00 | Budgeter, CLI wiring (flags, exit codes, `--intent`, `--test-log`), Markdown prompt, `verify` and `render`, integration tests |
| 1:00–1:50 | Inspector: load, validate, verify, audit, tabs, prompt copier, sample packet, CSP |
| 1:50–2:15 | Deploy; golden-packet cross-check; end-to-end run on the live URL; share link only if everything above is green |
| 2:15–2:45 | README, docs, AI log, SUBMISSION.md, demo rehearsal |
| 2:45–3:00 | Freeze, final push, confirm CI is green |

**Decision gate at 1:00 PM:** if the CLI core is not tested and working, shrink the web page to paste-and-view plus copy-prompt only. A solid CLI scores more than a wide, buggy product.

Commit small and often with meaningful messages, because Git practice is judged.

## 12. Demo Script (about 3 minutes)

1. **Setup:** a small repo mid-task with a failing test, a staged change, and a planted fake `.env` and token in a diff (generated at runtime, not committed).
2. **Problem:** "Claude Code just hit its rate limit."
3. **Run:** `npm test 2>&1 | port0 export --test-log - --intent "Fix login validation" --format both`
4. **Show the summary line** (files denied, secrets redacted, hash), then open `port0-packet.md`: the `.env` is listed by name only and the token reads `[REDACTED:...]`.
5. **Determinism:** run again and show the identical hash.
6. **Inspector:** drop the JSON on the live site; Schema, Integrity and Audit badges go green; browse the tabs; in the Prompt tab pick the web chat template, copy, and paste into Claude.ai.
7. **Tamper:** change one character in the JSON and reload it: the Integrity badge fails and Copy locks. `port0 verify` exits with code 5.
8. **Fail-closed:** show exit code 3 when a leak slips past the redactor.
9. **If built:** open a `port0 share` link in a second browser window.

**Likely judge questions:**

- *How is this different from Repomix-style packers?* It captures only the in-progress change, redacts, bounds the size, and is deterministic.
- *Can redaction miss something?* Yes, it is best-effort, but denylist plus patterns plus a fail-closed final scan reduces the risk, and the README states the limits.
- *Why a share link instead of a relay?* A relay needs a server and breaks our approved no-server scope. The link keeps the packet in the URL fragment, which is never sent anywhere.
- *Does the hash prove the packet is authentic?* No. It detects edits after export; it is not a signature.

## 13. Submission Checklist

- [ ] Repo created from the organizers' template; no pre-written code
- [ ] No real secrets or personal data anywhere in the repo, including history; fake secrets in tests are generated at runtime
- [ ] `node_modules` and any `.env` are gitignored; only `.env.example` is committed
- [ ] README: what it is, install and usage, redaction limits, live URL, screenshots
- [ ] `docs/requirements.md`, `design.md`, `testing.md` aligned with this spec
- [ ] `docs/ai-usage-log.md` complete: every table row filled and all four Reflection sections written
- [ ] Tests passing locally and CI green
- [ ] Golden packet verified by both the CLI tests and the web tests
- [ ] Inspector deployed; the live URL opens and the sample packet loads
- [ ] Zero-network-request test passes for the inspector
- [ ] `SUBMISSION.md` filled in with repo link, live link and team details
- [ ] Final commit pushed before 3:00 PM
