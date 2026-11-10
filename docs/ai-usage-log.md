# AI Usage Log

This log records meaningful AI assistance used during the build. AI-generated
suggestions were treated as drafts; source, tests, and conformance checks
remained the authority.

## Tools used

| Tool | Used for |
|------|----------|
| Gemini Web | Initial architecture exploration and template setup |
| GitHub Copilot SDK in VS Code | Documentation completion, source-context review, and verification workflow |

## Log

| Time | Member | Tool | What it was asked | What was accepted / changed / rejected | How it was verified |
|------|--------|------|-------------------|----------------------------------------|---------------------|
| 10:25 AM | Shayan | Gemini Web | Set up the basic architecture | Accepted the initial architecture direction; changed the package-manager choice to pnpm and aligned the implementation with the Port0 specification | Cross-checked against the specification, `package.json`, and source modules |
| Build phase | Rohan / Shayan | AI assistance in VS Code | Help implement and refine the CLI core, redaction, budgeting, serialization, prompts, and tests | Kept only changes that matched the fixed CLI contract; rejected unsupported claims and unrelated template behavior | Unit tests, strict typecheck, build, and `scripts/conformance.ps1` |
| Documentation pass | Shayan | GitHub Copilot SDK in VS Code | Fill requirements, design, testing, judge-check, and AI-use documentation from the master specification | Documented shipped CLI behavior and explicitly marked inspector/share-link work as planned | Compared docs with implementation and recorded command results in `docs/testing.md` |
| README update | Shayan | GitHub Copilot SDK in VS Code | Add the complete CLI installation, command, workflow, option, and exit-code reference | Added the full reference and aligned npm/`npx` wording with the fact that publication is still pending | Cross-checked every command against `src/cli/index.ts`, `package.json`, and the documented conformance result |

## Reflection

### Where AI helped most

AI was most useful for turning the long product specification into checkable
requirements, identifying the shared core boundaries, and creating a concise
documentation structure around the existing tests and conformance script.

### Where AI was wrong or misleading

Early template material implied that the web inspector and all stretch
features were already part of the shipped product. Those claims were not
accepted. The repository and passing CLI checks are the source of truth, so
the documentation now labels unimplemented surfaces as planned.

### What we did not delegate to AI

No secrets, credentials, or private repository contents were sent to an
external AI service. AI did not run arbitrary project commands on behalf of
the product, make network calls from Port0, or replace human review of
security-sensitive behavior and test results.
