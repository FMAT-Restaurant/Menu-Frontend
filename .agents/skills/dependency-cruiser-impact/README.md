# dependency-cruiser-impact — Agent Skill v2

A reusable, English-language skill for agent workflows that need file-level dependency analysis before planning, delegating, implementing, or reviewing issues in JavaScript/TypeScript codebases.

## What changed from v1?

- **Removed the custom query script and its tests.** Routine analysis now uses dependency-cruiser's native CLI.
- **Reuses saved JSON** with `depcruise-fmt --focus` for fast direct-neighbor inspection.
- **Escalates selectively** to a new `depcruise` run for `--focus-depth`, `--reaches`, or Git-based `--affected`.
- **Clarifies what is and is not a dependency:** import edges are evidence of file structure, not proof of runtime or business impact.
- **Adds a concise planning/implementation protocol** and a repeatable evidence-based report format.

## Installation

Copy this directory into your agent's skill discovery location, for example:

```text
.agents/skills/dependency-cruiser-impact/
    SKILL.md
    README.md
    references/CLI-REFERENCE.md
```

Depending on the agent platform, the discovery location and activation mechanism may differ; follow that platform's skill instructions. No executable helper script is bundled.

Ensure your repository already has `dependency-cruiser` installed as a local development dependency. Work from its repository root. The command examples in the skill use PowerShell.

## Minimal workflow

```powershell
New-Item -ItemType Directory -Force .analysis | Out-Null
npx --no-install depcruise src --ts-config tsconfig.app.json -T json -f .analysis/dependencies.json
npx --no-install depcruise-fmt -T text --focus "^src/services/offerService\.ts$" .analysis/dependencies.json
```

Adapt the input scope and TypeScript configuration to the actual project; `tsconfig.app.json` is only an example.

See `SKILL.md` for the agent's required workflow and `references/CLI-REFERENCE.md` for the command lookup table and troubleshooting.
