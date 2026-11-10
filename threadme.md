# Port0 Build Thread

## Current product state

Port0 is a local, read-only, offline CLI for creating deterministic,
secret-redacted, size-bounded Git handoff packets.

## Quick commands

```powershell
pnpm install
pnpm build
node .\dist\cli\index.js export --format both --intent "Review the current work"
node .\dist\cli\index.js verify .\port0-packet.json
node .\dist\cli\index.js render .\port0-packet.json
& .\scripts\conformance.ps1
```

Published npm workflow:

```bash
npx port0 export --intent "Fix login validation"
```

This requires npm publication; the current checkout uses the local built
executable.

## Verified state

- Unit tests: 53 passed, 0 failed.
- Conformance checks: 53 passed, 0 failed.
- TypeScript typecheck: passed.
- Production build: passed.
- Export is read-only and offline.

## Handoff notes

- Review `port0-packet.json` before sharing it with another AI tool.
- Redaction is pattern-based; it cannot detect every custom secret.
- The web inspector, share links, and npm publication are planned follow-on
  features and are not claimed as shipped in this checkout.

## Documentation map

- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Testing](docs/testing.md)
- [Judge checks](docs/judge-checks.md)
- [AI usage log](docs/ai-usage-log.md)
