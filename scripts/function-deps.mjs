
import { Project, SyntaxKind, Node } from "ts-morph";
import path from "node:path";

const filePath = process.argv[2];

if (!filePath) {
  throw new Error("Indica el archivo que deseas analizar");
}

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const file =
  project.getSourceFile(filePath) ??
  project.addSourceFileAtPath(filePath);

const checker = project.getTypeChecker().compilerObject;

function getCallerName(node) {
  if (!node) return "<module>";

  if (
    Node.isFunctionDeclaration(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isFunctionExpression(node)
  ) {
    return node.getName() ?? "<anonymous>";
  }

  if (Node.isArrowFunction(node)) {
    const parent = node.getParent();
    if (parent && Node.isVariableDeclaration(parent)) {
      return parent.getName();
    }
    return "<arrow>";
  }

  return node.getKindName();
}

const result = [];

for (const call of file.getDescendantsOfKind(
  SyntaxKind.CallExpression
)) {
  const caller = call.getFirstAncestor(n =>
    Node.isFunctionDeclaration(n) ||
    Node.isMethodDeclaration(n) ||
    Node.isArrowFunction(n) ||
    Node.isFunctionExpression(n)
  );

  const declaration = checker
    .getResolvedSignature(call.compilerNode)
    ?.getDeclaration();

  result.push({
    caller: getCallerName(caller),
    callee: call.getExpression().getText(),
    declaredIn: declaration
      ? path.relative(
          process.cwd(),
          declaration.getSourceFile().fileName
        )
      : null,
    line: call.getStartLineNumber(),
  });
}

console.log(JSON.stringify(result, null, 2));