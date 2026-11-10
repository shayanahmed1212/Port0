# Port0 Requirements

## Problem statement

Switching between terminal agents, IDE extensions, web chats, and teammates
forces developers to re-explain the task, copy diffs, and locate test output.
Manual copying can also expose `.env` files, tokens, and private keys. Port0
captures only the in-progress Git state, redacts known secrets, bounds the
packet size, and produces a deterministic handoff packet.

## Users

- **Primary:** a developer using an AI coding agent whose session is interrupted
  by a rate limit, crash, or tool switch.
- **Secondary:** a teammate or another coding agent receiving unfinished work.
- **Judge:** a reviewer who needs a quick, local, reproducible demonstration.

## Functional requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Capture branch, HEAD, recent commits, status, staged/unstaged diffs, untracked files, intent, and an optional test log. | Must | Implemented |
| FR-02 | Operate locally and read the repository without running arbitrary project commands. | Must | Implemented |
| FR-03 | Resolve and guard the repository root; reject output paths and reads outside it. | Must | Implemented |
| FR-04 | Exclude denylisted files and redact supported secret formats before output. | Must | Implemented |
| FR-05 | Apply per-section and total byte budgets with visible truncation and omission metadata. | Must | Implemented |
| FR-06 | Serialize packets canonically with sorted keys/paths, LF endings, and a SHA-256 content hash. | Must | Implemented |
| FR-07 | Write JSON, Markdown, or both; support stdout for piping and atomic file writes. | Must | Implemented |
| FR-08 | Validate an existing packet, verify its hash, re-scan for secrets, and render Markdown. | Should | Implemented |
| FR-09 | Provide stable exit codes and actionable error messages. | Must | Implemented |
| FR-10 | Provide a browser-only static Packet Inspector that shares the core library. | Must | Planned; no web app is present in this build |
| FR-11 | Provide passphrase-protected fragment share links. | Stretch | Planned |
| FR-12 | Publish the package so `npx port0` works without a local checkout. | Should | Planned; README documents the target workflow |

## Non-functional requirements

| ID | Category | Requirement | Target | How measured | Result |
|----|----------|-------------|--------|--------------|--------|
| NFR-01 | Safety | Do not write known secrets or denylisted file contents. | 0 leaked fixture secrets | Conformance redaction checks | Pass |
| NFR-02 | Determinism | Identical repository state produces identical JSON bytes and hash. | 100% identical repeated runs | Conformance determinism check | Pass |
| NFR-03 | Bounded output | Canonical packet stays within `--max-bytes`. | At most configured cap | 20,000-byte conformance run | Pass |
| NFR-04 | Portability | Packet uses relative POSIX paths and LF line endings. | No absolute paths or CRLF | Conformance checks | Pass |
| NFR-05 | Read-only capture | Export does not change the Git working tree. | No Git state changes | Before/after status comparison | Pass |
| NFR-06 | Validation | Invalid/tampered packets fail closed. | Exit code 5 | Verify tamper check | Pass |
| NFR-07 | Type safety | Source passes strict TypeScript checking. | Zero diagnostics | `pnpm typecheck` | Pass |

## Constraints

- Node.js 20 or newer.
- pnpm is the documented package manager.
- The project must be inside a Git work tree for export.
- Export writes only requested packet output files.
- The CLI performs no network calls, telemetry, LLM calls, listeners, or tunnels.
- Packet contents are untrusted data and are not proof that every secret was found.

## Assumptions

- Git is installed and available on `PATH`.
- The receiving person or tool can access the generated JSON or Markdown.
- Users review the packet before pasting it into a third-party AI tool.
- The current release focuses on the CLI core; inspector and share-link work
  follows after the tested MVP.
- The documented `npx port0` workflow assumes the package has been published
  to npm; local development uses the built executable directly.

## Out of scope

Accounts, a relay server, database storage, session tokens, arbitrary command
execution, source-file mutation, telemetry, and claims of complete secret
detection are out of scope.
