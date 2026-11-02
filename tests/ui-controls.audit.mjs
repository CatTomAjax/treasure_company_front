import ts from 'typescript';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
let files = 0,
  buttons = 0,
  selects = 0;
mkdirSync('tmp', { recursive: true });
const violations = [];
function walk(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === 'ui') continue;
    const file = resolve(folder, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (!file.endsWith('.tsx')) continue;
    const code = readFileSync(file, 'utf8'),
      ast = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
    let used = false;
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(ast);
        if (tag === 'button' || tag === 'select')
          violations.push({
            file,
            line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            tag,
          });
        if (tag === 'AppButton') {
          buttons++;
          used = true;
        }
        if (tag === 'AppSelect') {
          selects++;
          used = true;
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    if (used) files++;
  }
}
walk('components');
assert.equal(violations.length, 0, JSON.stringify(violations));
const report = {
  success: true,
  files,
  buttonSites: buttons,
  selectSites: selects,
  unmigratedBusinessControls: violations,
};
writeFileSync('tmp/ui-controls-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
