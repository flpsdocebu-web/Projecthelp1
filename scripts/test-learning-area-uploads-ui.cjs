const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const slots=[],effects=[],pending=[],requests=[];let cursor=0,interval;
const jsx=(type,props)=>typeof type==='function'?type(props||{}):({type,props:props||{}});
const react={useId:()=> 'uploads-test',useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useMemo(fn){return fn();},useEffect(fn,deps){const i=cursor++,previous=effects[i];if(!previous||deps.some((d,j)=>d!==previous.deps[j]))pending.push(()=>{previous?.cleanup?.();effects[i]={deps,cleanup:fn()};});}};
const source=fs.readFileSync(path.join(__dirname,'../components/LearningAreaUploads.tsx'),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const tableCode=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/LearningAreaUploadTable.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const tableContext={exports:{},require(name){if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};throw Error(name);}};vm.runInNewContext(tableCode,tableContext);
const context={exports:{},AbortController,Date,window:{setInterval(fn,delay){assert.equal(delay,30000);interval=fn;return 1;},clearInterval(){}},fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/components/LearningAreaUploadTable')return tableContext.exports;if(name==='@/components/LearningAreaUploadReport')return {default:props=>({type:'report-preview',props})};throw Error(name);}};
vm.runInNewContext(code,context);
function render(){cursor=0;const tree=context.exports.default();while(pending.length)pending.shift()();return tree;}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
function text(tree){if(tree==null||typeof tree==='boolean')return '';if(Array.isArray(tree))return tree.map(text).join(' ').replace(/\s+/g,' ').trim();return typeof tree==='object'?text(tree.props?.children):String(tree);}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const summary={areas:[{learningArea:'ENGLISH',term1:4,term2:2,term3:3,fullYear:1,other:0,total:10},{learningArea:'SCIENCE',term1:1,term2:0,term3:0,fullYear:2,other:0,total:3}],totals:{term1:5,term2:2,term3:3,fullYear:3,other:0,total:13}};
(async()=>{
 let tree=render();assert.ok(text(tree).includes('Loading learning-area uploads'));assert.ok(!nodes(tree).some(n=>n.type==='table'));
 requests[0].resolve({ok:true,json:async()=>summary});await tick();tree=render();assert.ok(text(tree).includes('13 resources'));assert.equal(nodes(tree).filter(n=>n.type==='tbody')[0].props.children[0].length,2);
 const input=nodes(tree).find(n=>n.type==='input');input.props.onChange({target:{value:'English'}});tree=render();const table=nodes(tree).find(n=>n.type==='table');assert.ok(text(table).includes('ENGLISH'));assert.ok(!text(table).includes('SCIENCE'));assert.ok(text(table).includes('Visible total'));assert.ok(text(nodes(tree).find(n=>n.type==='tfoot')).includes('10'));
 const generate=nodes(tree).find(n=>n.type==='button'&&text(n)==='Generate report');assert.equal(generate.props.disabled,false);generate.props.onClick();tree=render();
 const report=nodes(tree).find(n=>n.type==='report-preview');assert.equal(report.props.snapshot.summary.areas.length,2);assert.equal(report.props.snapshot.summary.totals.total,13);assert.ok(report.props.snapshot.loadedAt);report.props.onClose();tree=render();assert.ok(!nodes(tree).some(n=>n.type==='report-preview'));
 nodes(tree).find(n=>n.type==='input').props.onChange({target:{value:'No match'}});tree=render();assert.ok(text(tree).includes('No learning areas match'));
 nodes(tree).find(n=>n.type==='input').props.onChange({target:{value:''}});tree=render();
 interval();requests[1].reject(Error('unavailable'));await tick();tree=render();assert.ok(text(tree).includes('last successfully loaded counts'));assert.ok(text(tree).includes('13 resources'));assert.ok(text(tree).includes('ENGLISH'));
 const refresh=nodes(tree).find(n=>n.type==='button');refresh.props.onClick();tree=render();assert.equal(requests.length,3);requests[2].resolve({ok:true,json:async()=>({...summary,areas:[],totals:{term1:0,term2:0,term3:0,fullYear:0,other:0,total:0}})});await tick();tree=render();assert.ok(text(tree).includes('No resources have been uploaded yet'));assert.ok(!text(tree).includes('Unable to refresh'));
 console.log('Learning-area table checks passed: live polling, search, visible subtotals, complete unfiltered report snapshots, close report, refresh failures preserving data, manual retry, and empty inventory.');
})().catch(error=>{console.error(error);process.exitCode=1;});
