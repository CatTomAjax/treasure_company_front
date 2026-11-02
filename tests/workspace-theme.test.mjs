import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import postcss from 'postcss';

const sheet = postcss.parse(
  readFileSync(
    new URL('../components/workspace-theme.css', import.meta.url),
    'utf8',
  ),
);
const light = {},
  tech = {};
sheet.walkRules((rule) => {
  if (
    rule.selector !== ':root' &&
    rule.selector !== "html[data-ui-theme='tech']"
  )
    return;
  const palette = rule.selector === ':root' ? light : tech;
  rule.walkDecls((decl) => {
    if (decl.prop.startsWith('--ui-')) palette[decl.prop] = decl.value;
  });
});
function luminance(hex) {
  const digits = hex.replace('#', '');
  const rgb = [0, 2, 4]
    .map((i) => parseInt(digits.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
const contrast = (a, b) =>
  (Math.max(luminance(a), luminance(b)) + 0.05) /
  (Math.min(luminance(a), luminance(b)) + 0.05);

for (const [name, palette] of [
  ['light', light],
  ['tech', { ...light, ...tech }],
]) {
  test(`${name}: body and secondary text meet 4.5:1 contrast`, () => {
    for (const foreground of ['text', 'muted', 'subtle']) {
      for (const background of ['bg', 'surface', 'inset']) {
        const ratio = contrast(
          palette[`--ui-${foreground}`],
          palette[`--ui-${background}`],
        );
        assert.ok(
          ratio >= 4.5,
          `${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
        );
      }
    }
  });
  test(`${name}: primary action and status labels meet 4.5:1 contrast`, () => {
    const pairs = [
      ['primary-ink', 'primary'],
      ...['primary', 'success', 'warning', 'danger', 'purple'].map((tone) => [
        tone,
        `${tone}-soft`,
      ]),
    ];
    for (const [foreground, background] of pairs) {
      const ratio = contrast(
        palette[`--ui-${foreground}`],
        palette[`--ui-${background}`],
      );
      assert.ok(
        ratio >= 4.5,
        `${foreground} on ${background}: ${ratio.toFixed(2)}:1`,
      );
    }
  });
}
