const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const values=[],effects=[],pending=[];let cursor=0;
const requests=[];
const jsx=(type,props)=>({type,props:props||{}});
const react={
  useState(initial){const index=cursor++;if(!(index in values))values[index]=initial;return [values[index],value=>{values[index]=typeof value==='function'?value(values[index]):value;}];},
  useEffect(fn,deps){const index=cursor++;const previous=effects[index];if(!previous||deps.some((d,i)=>d!==previous.deps[i]))pending.push(()=>{previous?.cleanup?.();effects[index]={deps,cleanup:fn()};});},
};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/RegistrationSchoolFields.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const context={exports:{},AbortController,encodeURIComponent,fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),require(name){
  if(name==='react')return react;
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name==='@/lib/district')return {CEBU_DISTRICTS_ALPHABETICAL:['Carmen','Compostela']};
  throw Error(`Unexpected client dependency ${name}`);
}};
vm.runInNewContext(code,context);
function render(){cursor=0;const tree=context.exports.default();while(pending.length)pending.shift()();return tree;}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
function field(tree,name){return nodes(tree).find(n=>n.props?.name===name);}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const example={key:'example-school',district:'Compostela',schoolName:'Example School',schoolId:'119226'};
(async()=>{
  let tree=render();assert.equal(field(tree,'schoolKey').props.disabled,true);assert.equal(field(tree,'schoolId').props.value,'');
  field(tree,'district').props.onChange({target:{value:'Compostela'}});tree=render();
  assert.equal(requests.length,1);assert.ok(requests[0].url.includes('Compostela'));assert.equal(field(tree,'schoolKey').props.disabled,true);
  requests[0].resolve({ok:true,json:async()=>({schools:[example]})});await tick();tree=render();
  assert.equal(field(tree,'schoolKey').props.disabled,false);
  field(tree,'schoolKey').props.onChange({target:{value:example.key}});tree=render();
  assert.equal(field(tree,'schoolName').props.value,example.schoolName);assert.equal(field(tree,'schoolId').props.value,example.schoolId);
  assert.equal(field(tree,'schoolName').props.readOnly,true);assert.equal(field(tree,'schoolId').props.readOnly,true);
  field(tree,'district').props.onChange({target:{value:'Carmen'}});tree=render();
  assert.equal(field(tree,'schoolKey').props.value,'');assert.equal(field(tree,'schoolId').props.value,'');assert.equal(field(tree,'schoolName').props.value,'');
  const stale=requests[1];
  field(tree,'district').props.onChange({target:{value:'Compostela'}});tree=render();
  assert.equal(stale.options.signal.aborted,true);
  requests[2].resolve({ok:true,json:async()=>({schools:[example]})});await tick();tree=render();
  stale.resolve({ok:true,json:async()=>({schools:[{...example,key:'wrong-district',district:'Carmen'}]})});await tick();tree=render();
  assert.ok(nodes(tree).some(n=>n.type==='option'&&n.props.value===example.key));
  assert.ok(!nodes(tree).some(n=>n.type==='option'&&n.props.value==='wrong-district'));
  field(tree,'district').props.onChange({target:{value:'Carmen'}});tree=render();requests[3].reject(Error('network'));await tick();tree=render();
  assert.equal(field(tree,'schoolKey').props.disabled,true);assert.ok(nodes(tree).some(n=>n.props?.role==='alert'));
  const retry=nodes(tree).find(n=>n.type==='button');retry.props.onClick();tree=render();assert.equal(requests.length,5);
  requests[4].resolve({ok:true,json:async()=>({schools:[]})});await tick();tree=render();
  assert.equal(field(tree,'schoolKey').props.value,'');
  console.log('School dropdown checks passed: district filtering, auto-filled read-only fields, reset on district change, stale-request protection, loading/error states, retry, and empty district handling.');
})().catch(error=>{console.error(error);process.exitCode=1;});
