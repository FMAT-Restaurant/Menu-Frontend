#!/usr/bin/env node
/** On-demand, one-function static dependency inspection. Never writes project files. */
import { Project, SyntaxKind, Node } from 'ts-morph';
import path from 'node:path';

function usage() {
  console.log(`Usage:
  node scripts/analyze-function.mjs --file src/example.ts --function myFunction [options]

Options:
  --tsconfig <path>  TypeScript project config (default: tsconfig.json)
  --format text|json Output format (default: text)
  --help             Show this message

Supported selectors: named top-level functions, top-level const arrow/function
expressions, and ClassName.method. Direct outgoing dependencies only.`);
}

function parseArgs(argv) {
  const options = { tsconfig: 'tsconfig.json', format: 'text' };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--help' || key === '-h') { usage(); process.exit(0); }
    if (!['--file', '--function', '--tsconfig', '--format'].includes(key) || !argv[i + 1] || argv[i + 1].startsWith('--')) {
      throw new Error(`Invalid argument: ${key}. Use --help.`);
    }
    options[key.slice(2)] = argv[++i];
  }
  if (!options.file || !options.function) throw new Error('Both --file and --function are required.');
  if (!['text', 'json'].includes(options.format)) throw new Error('Expected --format text or json.');
  return options;
}

function selectFunction(source, selector) {
  const dot = selector.indexOf('.');
  if (dot !== -1) {
    const className = selector.slice(0, dot);
    const methodName = selector.slice(dot + 1);
    const cls = source.getClass(className);
    if (!cls) throw new Error(`Class not found: ${className}`);
    const method = cls.getMethods().find(m => m.getName() === methodName && m.getBody());
    if (!method) throw new Error(`Method with body not found: ${selector}`);
    return method;
  }
  const fn = source.getFunctions().find(f => f.getName() === selector && f.getBody());
  if (fn) return fn;
  for (const stmt of source.getVariableStatements()) {
    for (const declaration of stmt.getDeclarations()) {
      if (declaration.getName() !== selector) continue;
      const initializer = declaration.getInitializer();
      if (initializer && (Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer))) return initializer;
    }
  }
  throw new Error(`Function not found: ${selector}. Supported: top-level named function, top-level const arrow/function, or ClassName.method.`);
}

function location(declaration) {
  if (!declaration) return null;
  const file = declaration.getSourceFile();
  const absolute = file.getFilePath();
  const relative = path.relative(process.cwd(), absolute).split(path.sep).join('/');
  const scope = /(^|\/)node_modules\//.test(relative)
    ? 'dependency'
    : /(^|\/)lib\.[^/]+\.d\.ts$/.test(relative)
      ? 'typescript-lib'
      : 'project';
  return { file: relative, line: declaration.getStartLineNumber(), scope };
}

function resolveSymbol(symbol) {
  if (!symbol) return null;
  try {
    if (symbol.isAlias()) return symbol.getAliasedSymbol() ?? symbol;
  } catch { /* unresolvable alias: preserve original symbol */ }
  return symbol;
}

function declarationForExpression(expression) {
  const symbol = resolveSymbol(expression.getSymbol());
  // Overloads and interfaces may expose multiple declarations; choose one with
  // a body where possible, otherwise the first available declaration.
  const declarations = symbol?.getDeclarations() ?? [];
  return declarations.find(d => typeof d.getBody === 'function' && d.getBody()) ?? declarations[0] ?? null;
}

function nodeWithin(node, container) {
  return node.getSourceFile().getFilePath() === container.getSourceFile().getFilePath()
    && node.getStart() >= container.getStart() && node.getEnd() <= container.getEnd();
}

function containingFunction(node, selected) {
  let current = node.getParent();
  while (current && current !== selected) {
    if (Node.isArrowFunction(current) || Node.isFunctionExpression(current) ||
        Node.isFunctionDeclaration(current) || Node.isMethodDeclaration(current)) return true;
    current = current.getParent();
  }
  return false;
}

function findCalls(body, selected, checker) {
  const found = [];
  const expressions = [
    ...body.getDescendantsOfKind(SyntaxKind.CallExpression).map(n => ({ node: n, kind: 'call' })),
    ...body.getDescendantsOfKind(SyntaxKind.NewExpression).map(n => ({ node: n, kind: 'construct' })),
  ].sort((a, b) => a.node.getStart() - b.node.getStart());

  for (const { node, kind } of expressions) {
    const expression = node.getExpression();
    let declaration = null;
    try {
      const resolvedSignature = checker.getResolvedSignature(node.compilerNode);
      const tsDeclaration = resolvedSignature?.getDeclaration();
      if (tsDeclaration) {
        const source = tsDeclaration.getSourceFile();
        // Compiler nodes may represent .d.ts or cross-project source files.
        declaration = {
          file: path.relative(process.cwd(), source.fileName).split(path.sep).join('/'),
          line: source.getLineAndCharacterOfPosition(tsDeclaration.getStart(source)).line + 1,
          scope: /(^|\/)node_modules\//.test(source.fileName.split(path.sep).join('/')) ? 'dependency'
            : /(^|\/)lib\.[^/]+\.d\.ts$/.test(source.fileName.split(path.sep).join('/')) ? 'typescript-lib'
            : 'project',
        };
      }
    } catch { /* resolution may fail for dynamic expressions */ }
    declaration ??= location(declarationForExpression(expression));
    found.push({
      kind,
      expression: expression.getText(),
      line: node.getStartLineNumber(),
      declaredAt: declaration,
      nestedCallbackOrFunction: containingFunction(node, selected),
      resolution: declaration ? 'resolved-statically' : 'unresolved',
    });
  }
  return found;
}

function findCapturedValues(body, selected) {
  const collected = new Map();
  for (const identifier of body.getDescendantsOfKind(SyntaxKind.Identifier)) {
    const parent = identifier.getParent();
    if (!parent) continue;
    // Avoid counting property names, declarations and function callee symbols
    // again; calls are reported separately.
    if (Node.isPropertyAccessExpression(parent) && parent.getNameNode() === identifier) continue;
    if (Node.isVariableDeclaration(parent) && parent.getNameNode() === identifier) continue;
    if (Node.isParameterDeclaration(parent) && parent.getNameNode() === identifier) continue;
    if (Node.isTypeReference(parent) || Node.isImportSpecifier(parent)) continue;
    let ancestor = parent;
    let isCallee = false;
    while (ancestor && ancestor !== selected) {
      if ((Node.isCallExpression(ancestor) || Node.isNewExpression(ancestor)) &&
          nodeWithin(identifier, ancestor.getExpression())) { isCallee = true; break; }
      ancestor = ancestor.getParent();
    }
    if (isCallee) continue;
    const symbol = resolveSymbol(identifier.getSymbol());
    const declarations = symbol?.getDeclarations() ?? [];
    const declaration = declarations[0];
    if (!declaration || declaration.getSourceFile().isDeclarationFile()) continue;
    // A function's own local declarations and parameters are not external inputs.
    if (nodeWithin(declaration, selected)) continue;
    // Imported names are resolved to their original declaration if possible.
    const declaredAt = location(declaration);
    if (!declaredAt || declaredAt.scope !== 'project') continue;
    const key = `${symbol.getName()}@${declaredAt.file}:${declaredAt.line}`;
    if (!collected.has(key)) collected.set(key, {
      symbol: symbol.getName(), declaredAt, usageLines: [],
    });
    const item = collected.get(key);
    const line = identifier.getStartLineNumber();
    if (!item.usageLines.includes(line)) item.usageLines.push(line);
  }
  return [...collected.values()].sort((a,b) => a.symbol.localeCompare(b.symbol));
}

function printText(result) {
  const { target, calls, externalValues, limitations } = result;
  console.log(`Function: ${target.symbol} (${target.file}:${target.line})`);
  console.log('\nCalls and constructions:');
  if (!calls.length) console.log('  (none detected)');
  for (const c of calls) {
    const to = c.declaredAt ? `${c.declaredAt.file}:${c.declaredAt.line}` : 'unresolved';
    const nested = c.nestedCallbackOrFunction ? ' [nested function/callback]' : '';
    console.log(`  L${c.line}  ${c.kind} ${c.expression} -> ${to}${nested}`);
  }
  console.log('\nCaptured/project-level references (not local parameters):');
  if (!externalValues.length) console.log('  (none detected)');
  for (const v of externalValues) console.log(`  ${v.symbol} -> ${v.declaredAt.file}:${v.declaredAt.line} [used at ${v.usageLines.join(', ')}]`);
  console.log('\nLimitations:');
  for (const limitation of limitations) console.log(`  - ${limitation}`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const tsconfig = path.resolve(options.tsconfig);
  const sourcePath = path.resolve(options.file);
  const project = new Project({ tsConfigFilePath: tsconfig });
  const source = project.getSourceFile(sourcePath) ?? project.addSourceFileAtPathIfExists(sourcePath);
  if (!source) throw new Error(`File not found: ${options.file}`);
  const selected = selectFunction(source, options.function);
  const body = selected.getBody();
  if (!body) throw new Error('Selected function has no body.');
  const checker = project.getTypeChecker().compilerObject;
  const result = {
    target: { symbol: options.function, file: path.relative(process.cwd(), sourcePath).split(path.sep).join('/'), line: selected.getStartLineNumber() },
    calls: findCalls(body, selected, checker),
    externalValues: findCapturedValues(body, selected),
    limitations: [
      'Static potential dependencies, not confirmed runtime execution or complete business impact.',
      'Calls nested in callbacks/functions are marked and may not execute when the target runs.',
      'Interfaces, virtual dispatch, dependency injection, callbacks, dynamic imports and JS runtime behavior may hide concrete targets.',
      'Project-level non-call references are heuristic; type-only and ambient declarations are not exhaustively reported.',
      'Only the selected function body is traversed; callees and reverse dependents are not recursively analyzed.',
    ],
  };
  if (options.format === 'json') console.log(JSON.stringify(result, null, 2));
  else printText(result);
}

try { main(); } catch (error) { console.error(`Error: ${error.message}`); process.exitCode = 1; }
