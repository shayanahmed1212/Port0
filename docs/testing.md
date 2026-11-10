# Port0 Testing

## Test strategy

Testing is layered around the shared core and the CLI conformance contract:

1. **Unit tests** cover schema validation, canonical serialization and hashing,
   redaction/audit rules, prompt rendering, and byte-budget behavior.
2. **Property-style coverage** uses `fast-check` where applicable for core
   invariants.
3. **Conformance checks** build the CLI and exercise it against a temporary
   Git repository. They verify the complete export, verify, render, stdout,
   determinism, budget, guard, exit-code, hostile-config, and fixture flows.
4. **Manual review** is limited to the planned web inspector; it is not
   represented as passing because that surface is not implemented in this
   checkout.

## How to run tests

From the repository root:

```powershell
pnpm install
pnpm --dir dashboard install
pnpm test
pnpm typecheck
pnpm build
pnpm --dir dashboard build
& .\scripts\conformance.ps1
```

For a quick CLI demonstration after building:

```powershell
node .\dist\cli\index.js export --format both --intent "Describe the next change"
node .\dist\cli\index.js verify .\port0-packet.json
node .\dist\cli\index.js render .\port0-packet.json
```

The README also documents the target npm workflow using `npx port0`. npm
publication is not included in the current checkout, so conformance uses the
local built executable.

## Results summary

| Type | Total | Passed | Failed |
|------|-------|--------|--------|
| Unit | 53 | 53 | 0 |
| Integration / CLI conformance | 53 checks | 53 | 0 |
| End-to-end / manual | Not applicable | Not run | Not run |

The unit and conformance totals overlap: the conformance script includes the
same test count in its final summary after running its CLI assertions.

## Edge cases covered

| ID | Edge case | Expected behaviour | Test / evidence | Result |
|----|-----------|--------------------|-----------------|--------|
| EC-01 | `.env` and AWS key in a demo repo | Path is listed but content/key is absent | `scripts/conformance.ps1` | Pass |
| EC-02 | Repeated export with unchanged state | Byte-identical JSON and hash | Conformance determinism section | Pass |
| EC-03 | Packet tampering | `verify` exits 5 | Conformance verify section | Pass |
| EC-04 | Packet over a small configured cap | Sections shrink at boundaries and include markers | Conformance size-budget section | Pass |
| EC-05 | Output path outside root | Export exits 1 and writes nothing | Conformance exit-code section | Pass |
| EC-06 | Non-Git directory | Export exits 2 | Conformance exit-code section | Pass |
| EC-07 | Hostile external diff configuration | External diff driver is not executed | Conformance hostile-config section | Pass |
| EC-08 | Untracked binary, oversized, symlink, or denylisted file | Content is omitted with a reason | `src/cli/guard.ts`, `src/cli/git.ts` | Covered by implementation |
| EC-09 | Detached HEAD and repository without commits | State is represented with nullable branch/HEAD fields | `src/cli/git.ts`, schema tests | Covered by implementation |
| EC-10 | UTF-8 filenames and CRLF input | Paths remain POSIX-style and text uses LF | Serializer and conformance checks | Pass |

## Measured metrics

| Metric | Method | Result |
|--------|--------|--------|
| Unit test duration | `pnpm test` | 1.33 seconds in the recorded run |
| Typecheck | `pnpm typecheck` | Passed with exit code 0 |
| Build | `pnpm build` | Passed with exit code 0 |
| Conformance | `scripts/conformance.ps1` | 53 passed, 0 failed |
| Default packet cap | `DEFAULT_MAX_BYTES` | 204,800 bytes |
| Minimum packet cap | `MIN_MAX_BYTES` | 20,000 bytes |

## Defect log

| ID | Description | Found by / how | Severity | Status | Fix commit |
|----|-------------|----------------|----------|--------|------------|
| — | No open defects recorded for the tested CLI scope. | Test and conformance runs | — | — | — |

## Known untested areas

- The planned web inspector, CSP, browser network isolation, and UI
  accessibility behavior.
- The planned serverless share-link flow.
- npm publication and the `npx port0` install path.
- High-entropy secret detection, which is explicitly a stretch feature.
