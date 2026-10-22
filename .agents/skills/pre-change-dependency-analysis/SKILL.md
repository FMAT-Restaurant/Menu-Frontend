---
name: pre-change-dependency-analysis
description: Investigate concrete file-level or function-level dependencies to make a specific design, architecture, implementation, or quality decision before changing code. Activate on demand when a target file or callable and a decision are identified; do not run automatically at the beginning of every turn. Choose repository-appropriate analysis tools, inspect only relevant relationships, and produce a concise, evidence-based impact assessment.
compatibility: Technology-agnostic. Requires access to the target repository and suitable existing code-navigation or analysis tools. Read-only by default; optional tools depend on the repository stack.
metadata:
  version: "1.0.0"
  language: en
---

# Pre-change dependency analysis

## Purpose

**Use dependency evidence to make a better engineering decision before implementing a change.** Start from a specific file (or an already identified function/method), identify the relationships that matter, evaluate architectural constraints and technical risks, and decide what should be changed and validated.

This skill is **decision-driven**, **on demand**, **read-only**, and **bounded**. It is NOT an obligatory startup ritual, a generic repository exploration process, an automatic graph generator, or a substitute for reading pertinent code.

## Activation gate — use only for a real decision

Activate when **all** are true:

1. There is a concrete pending design, architecture, implementation, refactoring, or quality decision.
2. A target file/module or callable is identified, or can be located with a short targeted search.
3. Knowing its dependencies, dependents, call sites, or contracts could materially change the decision, scope, risk, or tests.

Typical triggers:
- Before changing a shared module, public API, data type, service, or component.
- When an issue may require coordinating changes across files or modules.
- When replacing a specific function's behavior, algorithm, validation, or side effects.
- When deciding whether a change is safe, whether responsibilities are misplaced, or whether two issues can be implemented independently.
- When a failed test or unexpected behavior suggests a dependency has been overlooked.

**Do not activate** merely because a new turn, task, issue, or coding session begins. Skip when dependencies are already understood and further analysis would not affect the decision, or when a trivial localized edit does not justify the cost. Avoid repetitive reanalysis without a new question or changed code.

## The question-first protocol

### 1. State the decision and choose the smallest useful scope

Write down (internally or in the working notes):
- **Decision:** What are we trying to choose, avoid, or verify?
- **Target:** Exact repository path and optionally a function/class/method; verify names, do not guess.
- **Impact hypothesis:** Which consumers, contracts, state changes, or side effects might matter?
- **Stopping criterion:** What evidence would be enough to proceed?

If there is no target yet, use a narrow filename/symbol/text search to find it. Do not scan the repository exhaustively or generate an all-project graph by default.

### 2. Start at the file/module level when boundaries or architecture matter

Choose a tool that fits the **existing** stack and can reveal file/module/package dependencies (see [tool selection](references/TOOL-SELECTION.md)). Prefer already-installed tools, language servers, compiler metadata, or a current dependency index over building a new index.

Investigate separately:
- **Outgoing relationships:** Imports, references, package dependencies, service calls, and abstractions the target uses. Which contracts constrain the change?
- **Incoming relationships:** Importers, dependents, entry points, callers, or known consumers. Who may be impacted by modifying the target?
- **Boundary relationships:** Data contracts, framework wiring, dependency injection, generated code, events, APIs, and runtime configuration where relevant.

A file dependency is not proof of a function call, business dependency, runtime execution, required edit, or merge conflict. When information is incomplete, distinguish *not detected* from *does not exist*.

**Expansion rule:** Begin with direct relationships. Inspect a second hop or reverse/transitive consumers only when a shared API, unexpected coupling, migration, risk, or unresolved question justifies it. Stop as soon as the decision has sufficient evidence.

### 3. Narrow to a function/method when behavior is the decision

If the change targets specific behavior inside a callable, switch to a symbol-aware tool (IDE/LSP references and call hierarchy, AST/compiler analysis, semantic index, or a targeted function analysis skill).

Answer only what matters to the decision:
- Which functions/methods/constructors does it **call or instantiate**?
- Which external values, types, configuration, collaborators, or state does it **read/write**?
- What errors, side effects, persistence, network calls, and asynchronous work occur?
- If changing its contract, **who calls it** and which call sites rely on the old behavior?

Prefer resolving symbols to declaration locations over text-name matching. Inspect the relevant definitions, interfaces, usages, and tests in source as needed. Distinguish direct calls from references, nested callbacks from unconditional execution, and compile-time resolution from runtime dispatch.

**Do not** enumerate all functions, recursively explore every callee, or construct a complete call graph. A function-level analysis is warranted only when file-level evidence cannot answer the concrete behavioral question, or the target is explicitly a callable.

### 4. Evaluate design, impact, and quality risks

Turn relationships into decisions rather than a raw dependency inventory. Evaluate the relevant subset:

- **Responsibilities and boundaries:** Does the proposed change cross module, layer, or service ownership? Does it create inappropriate coupling or a cycle?
- **Contract compatibility:** Signatures, types, schemas, events, API payloads, invariants, backward compatibility, and consumers.
- **Behavior and state:** Validation, error propagation, mutation, transactions, concurrency, persistence, caching, and side effects.
- **Change surface:** Minimal required edit targets versus files that need only inspection or testing.
- **Coordination:** Overlap with another issue in actual edit targets or shared contracts; do not infer a task dependency from an import alone.
- **Quality:** Focused tests, type checks, static checks, integration/contract tests, and boundary cases indicated by observed relationships.

For non-code relationships (runtime injection, reflection, dynamic calls, database constraints, message consumers, network services), supplement static analysis with configuration, schemas, tests, observed traces, or architecture documentation. State what remains unverified.

### 5. Make a decision before implementation

Produce a compact decision record; then implement only if the underlying task authorizes implementation.

```text
Decision: <what was being decided>
Target: <path>[::<symbol>]
Evidence: <key outgoing dependencies, incoming consumers, contracts, source locations>
Architecture/technical assessment: <why these relationships matter>
Risks and unknowns: <confirmed / likely / unknown; relevant limitations>
Chosen approach: <specific change boundary and rationale; alternatives if material>
Validation plan: <targeted tests and checks>
```

Be decisive when evidence suffices. If a critical unknown remains, inspect only that unknown and then update the decision. Do not paste a full graph or enormous tool output into the final report.

### 6. Re-check selectively as implementation evolves

Revisit this skill when a new dependency is introduced, a shared contract changes, the actual edit scope expands, another agent changes a relevant module, or validation reveals unexpected coupling. Avoid running it on every edit or every turn.

After implementation, verify the affected consumers and tests. A dependency report is **not** evidence that the change works.

## Tool use policy

1. **Technology-agnostic:** Never assume a particular language, framework, or package manager.
2. **Prefer native navigation:** Existing IDE/LSP, compiler/build tooling, repository scripts, and cached analysis before introducing dependencies.
3. **Choose by question:** Module/import analyzer for files; symbol/call/reference analyzer for functions; contracts/config/runtime traces for dynamic edges. One tool rarely answers all three.
4. **No unnecessary installations or tooling changes:** Do not silently install packages, change lockfiles, generate scripts, run remote executables, or alter project configuration. Follow repository policy and request authorization when needed.
5. **Maintain provenance:** Record analyzed commit/worktree, affected path, tool/config and resolution limitations when material; stale/filtered/partial output is not proof of no dependencies.
6. **Limit context and runtime:** Prefer focused queries, exact paths, direct relationships, and short evidence excerpts. Reuse a trustworthy existing index when available.
7. **Keep analysis read-only:** Do not use the investigation as permission to modify code, run potentially destructive commands, or access secrets.

See [tool selection and evidence guide](references/TOOL-SELECTION.md) for technology-specific examples and limitations. Companion tools or specialized skills can be used if installed, but this skill has **no mandatory dependency on any other skill**.

## Anti-patterns

- Invoking this skill by default at the start of a conversation.
- Scanning the whole repository before a specific design question exists.
- Confusing package-manager dependencies with imports, calls, or runtime coupling.
- Treating a shared import as proof that two issues cannot run concurrently.
- Editing all files returned by a reverse-dependency query.
- Treating a static declaration as the only possible runtime implementation.
- Reporting "no impact" because a filtered graph or unresolved symbol returned nothing.
- Building or persisting a massive graph when a single-file or single-function query suffices.
- Spending more effort on analysis machinery than the risk of the decision justifies.
