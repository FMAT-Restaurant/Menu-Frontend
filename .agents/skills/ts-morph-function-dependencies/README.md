# ts-morph-function-dependencies

A small, independent Agent Skill to inspect **one function's direct outgoing static dependencies** in a TypeScript/TSX repository. Instructions and reports are in English.

This is intentionally **not** a project-wide graph generator. The skill includes a single read-only script because ts-morph is a library, not a dependency-query CLI.

## Installation

1. Copy this directory to `.agents/skills/ts-morph-function-dependencies/` in your repository (or another agent-skill location supported by your tool).
2. Install `ts-morph` using your project's package manager, if not already present: `npm install -D ts-morph`.
3. Invoke the script from the repository root with the correct `--tsconfig`.

```powershell
node .agents/skills/ts-morph-function-dependencies/scripts/analyze-function.mjs --file src/services/offers.ts --function createOffer --tsconfig tsconfig.app.json
```

Use `--format json` for structured outputs. The script does not save or modify source files.

## What it reports

- Calls and `new` expressions inside the selected function, with source lines and best-effort declaration locations.
- Whether each call occurs in a nested callback/function body.
- Best-effort project-level referenced values declared outside the callable.
- Known limitations and unresolved call targets.

It does not follow the entire call chain, discover incoming consumers, or guarantee runtime targets. It does not require or use dependency-cruiser.

## Files

- `SKILL.md` — English agent operating instructions.
- `scripts/analyze-function.mjs` — targeted, read-only ts-morph analyzer.
- `references/USAGE.md` — command and interpretation guide.
- `examples/example-output.json` — illustrative sample (not generated from a real project).

## Validation note

The script's JavaScript syntax can be checked with `node --check scripts/analyze-function.mjs`. Functional execution requires local `ts-morph` and the target TypeScript project. No functional compatibility test is claimed by the package itself.
