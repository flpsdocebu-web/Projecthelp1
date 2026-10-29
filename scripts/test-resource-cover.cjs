const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const source = fs.readFileSync('components/ResourceCover.tsx', 'utf8');
const context = {exports: {}, require};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText, context);
for (const item of [
  {subject:'ALTERNATIVE LEARNING SYSTEM (ALS)', grade:'Grade 7', term:'Term 1'},
  {subject:'TLE - Information and Communications Technology', grade:'SNED', term:'Full Year'},
  {subject:'Kindergarten - Literacy', grade:'Kindergarten', term:'Term 3'},
]) {
  const markup = renderToStaticMarkup(React.createElement(context.exports.default, {item}));
  for (const text of Object.values(item)) assert.ok(markup.includes(text));
  assert.ok(markup.includes('src="/phelps-resource-cover.png?v=84fd443c"'));
  assert.ok(markup.includes('loading="lazy"'));
  assert.ok(!markup.includes('sheet-cover'));
}
const css = fs.readFileSync('app/resource-cover.css','utf8');
assert.ok(css.includes('object-fit:contain'));
assert.ok(css.includes('overflow-wrap:anywhere'));
assert.ok(css.includes('flex-wrap:wrap'));
assert.ok(!css.includes('line-clamp'));
assert.ok(fs.readFileSync('components/ResourceCard.tsx','utf8').includes('<ResourceCover item={item} />'));
const image = fs.readFileSync('public/phelps-resource-cover.png');
assert.equal(image.readUInt32BE(16),1920);
assert.equal(image.readUInt32BE(20),1080);
assert.equal(require('node:crypto').createHash('sha256').update(image).digest('hex'), '84fd443c98ba821021fe96f47df774010920b0eed0437967af2a1570804e57a9');
console.log('Resource covers passed: original artwork preserved; subject, grade and term visible; long labels wrap; image stays uncropped.');
