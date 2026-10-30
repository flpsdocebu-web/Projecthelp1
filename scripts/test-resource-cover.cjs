const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const source = fs.readFileSync('components/ResourceCover.tsx', 'utf8');
let thumbnail = {url:'/phelps-resource-cover.png',width:1532,height:876,custom:false};
const context = {exports: {}, require: name => name === './LasThumbnailProvider' ? {defaultLasThumbnail:thumbnail,useLasThumbnail:()=>({thumbnail})} : require(name)};
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX}}).outputText, context);
for (const item of [
  {subject:'ALTERNATIVE LEARNING SYSTEM (ALS)', grade:'Grade 7', term:'Term 1'},
  {subject:'TLE - Information and Communications Technology', grade:'SNED', term:'Full Year'},
  {subject:'Kindergarten - Literacy', grade:'Kindergarten', term:'Term 3'},
]) {
  const markup = renderToStaticMarkup(React.createElement(context.exports.default, {item}));
  for (const text of Object.values(item)) assert.ok(markup.includes(text));
  assert.ok(markup.includes('src="/phelps-resource-cover.png"'));
  assert.ok(markup.includes('loading="lazy"'));
  assert.ok(!markup.includes('sheet-cover'));
}
const css = fs.readFileSync('app/resource-cover.css','utf8');
thumbnail = {url:'/api/las-thumbnail/image?v=test-version',width:1600,height:900,custom:true};
assert.ok(renderToStaticMarkup(React.createElement(context.exports.default,{item:{subject:'SCIENCE',grade:'Grade 6',term:'Term 2'}})).includes('/api/las-thumbnail/image?v=test-version'));
assert.ok(css.includes('object-fit:contain'));
assert.ok(css.includes('overflow-wrap:anywhere'));
assert.ok(css.includes('flex-wrap:wrap'));
assert.ok(!css.includes('line-clamp'));
assert.ok(fs.readFileSync('components/ResourceCard.tsx','utf8').includes('<ResourceCover item={item} />'));
const image = fs.readFileSync('public/phelps-resource-cover.png');
assert.equal(image.readUInt32BE(16),1532);
assert.equal(image.readUInt32BE(20),876);
assert.equal(require('node:crypto').createHash('sha256').update(image).digest('hex'), '33d7c4f8b062e1702bfc84d2f9f922952911505baf5b74a82a21888059c396c4');
console.log('Resource covers passed: original artwork preserved; subject, grade and term visible; long labels wrap; image stays uncropped.');
