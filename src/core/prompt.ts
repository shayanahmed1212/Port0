export function renderMarkdown(packet: any, version: string): string {
  return `# Port0 Packet

## Task intent
${packet.intent}

## Repo state
Branch: ${packet.repo.branch}
HEAD: ${packet.repo.head}

## Failing tests
${packet.testLog}

## Staged diff
${packet.stagedDiff}

## Unstaged diff
${packet.unstagedDiff}

## Untracked files
${packet.untracked.map((f: any) => f.path).join("\n")}

Safety: redacted ${JSON.stringify(packet.redaction.counts)}; denylisted ${packet.redaction.denylisted.join(", ")}

---
hash: ${packet.contentHash}
version: ${version}
`;
}
