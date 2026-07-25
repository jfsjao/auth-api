import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const sourceRoot = join(process.cwd(), 'src');
const modulesRoot = join(sourceRoot, 'modules');

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return typescriptFiles(path);
    return path.endsWith('.ts') && !path.endsWith('.spec.ts') ? [path] : [];
  });
}

function importedPaths(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  return source.statements.flatMap((statement) => {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return [];
    }

    return [statement.moduleSpecifier.text];
  });
}

describe('Module boundaries', () => {
  it('prevents direct imports between business modules', () => {
    const violations = typescriptFiles(modulesRoot).flatMap((file) => {
      const owner = relative(modulesRoot, file).split(sep)[0];

      return importedPaths(file).flatMap((importPath) => {
        if (!importPath.startsWith('.')) return [];

        const target = resolve(dirname(file), importPath);
        const targetRelative = relative(modulesRoot, target);
        if (targetRelative.startsWith('..')) return [];

        const targetOwner = targetRelative.split(sep)[0];
        const importsPublicApi = targetRelative === targetOwner;
        return targetOwner !== owner && !importsPublicApi
          ? [`${relative(sourceRoot, file)} imports ${targetRelative}`]
          : [];
      });
    });

    expect(violations).toEqual([]);
  });
});
