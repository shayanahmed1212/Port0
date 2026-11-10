# Judge Checks

## Quick conformance result

Run from the repository root:

```powershell
& .\scripts\conformance.ps1
```

Recorded result: **53 passed, 0 failed**.

## Automated checklist

- [x] `pnpm build` succeeds.
- [x] Export writes JSON and Markdown when `--format both` is used.
- [x] `.env` contents and fixture AWS keys are absent from both outputs.
- [x] Redaction markers and denied paths are reported.
- [x] Test logs are captured.
- [x] JSON has no CRLF or absolute Windows paths.
- [x] Export does not capture its own output files.
- [x] Packet schema fields and sorted top-level keys are valid.
- [x] Repeated export is byte-identical.
- [x] Clean packet verification exits 0.
- [x] Tampered packet verification exits 5.
- [x] `render` and `--stdout` produce usable Markdown without raw secrets.
- [x] A 20,000-byte cap is respected and records truncation.
- [x] `--version`, `--help`, invalid flags, low caps, outside-root output,
  and non-Git directories return the documented exit codes.
- [x] Hostile external diff configuration is not executed.
- [x] The golden packet fixture verifies successfully.

## Manual judge flow

1. Install Node.js 20+ and pnpm.
2. Run `pnpm install`.
3. Run `pnpm --dir dashboard install`.
4. Run `pnpm build`.
5. Run `pnpm --dir dashboard build`.
6. Run `node .\dist\cli\index.js export --format both --intent "Review the current work"`.
7. Inspect `port0-packet.json` and `port0-packet.md`.
8. Run `node .\dist\cli\index.js verify .\port0-packet.json`.
9. Run `node .\dist\cli\index.js render .\port0-packet.json`.
10. Run `& .\scripts\conformance.ps1` for the full evidence set.

The published-package quick start is:

```bash
npx port0 export --intent "Fix login validation"
```

For this repository checkout, use the local `node .\dist\cli\index.js`
commands above because npm publication has not been verified here.

## Honest scope note

The static Packet Inspector, npm publication, and passphrase share links are
specified as follow-on work but are not claimed as passing checks in this
checkout. There is no backend, account system, telemetry, or network relay.
