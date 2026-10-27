# Pre-change dependency analysis — Agent Skill

A technology-agnostic, decision-driven Agent Skill for inspecting **relevant file or function dependencies before implementation**.

The skill is not a generic start-of-task checklist: it activates only when a specific design, architecture, implementation, refactoring, or quality decision warrants dependency investigation. It begins with the identified file, uses function-level analysis when a precise behavior is targeted, and stops when the decision is adequately supported.

## Contents

```text
pre-change-dependency-analysis/
├── SKILL.md
├── README.md
└── references/
    └── TOOL-SELECTION.md
```

## Install

Copy the entire `pre-change-dependency-analysis` directory into a skills directory supported by your agent or IDE, such as `.agents/skills/`, if supported. Use your agent's normal skill discovery or loading mechanism; exact locations vary by host.

No npm, Java, Python or other dependencies are required by this skill itself. It does not ship analysis scripts or generate a repository-wide graph.

## Example activation

> Before modifying `src/application/OfferService.ts`, inspect its direct imports and consumers to decide whether the API change crosses module boundaries. If the issue involves `OfferService.createOffer`, also inspect that function's relevant callers and callees. Report the decision, risks, and tests; avoid unrelated repository exploration.

## Principles

- Analyze only to support a concrete engineering decision.
- Use the existing toolchain; prefer direct relationships and bounded queries.
- Separate file/module analysis from callable/symbol analysis.
- Treat static results as evidence, not proof of runtime behavior or necessary edits.
- Produce a concise actionable assessment, then validate the implementation through appropriate tests.
- Work independently of dependency-cruiser or ts-morph; both are optional examples.

All agent-facing instructions are in English.
