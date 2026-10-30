const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const compile=file=>ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const helper={exports:{}};vm.runInNewContext(compile('lib/learning-area-uploads.ts'),helper);
const slots=[],effects=[],pending=[],requests=[];let cursor=0,interval;
const jsx=(type,props)=>typeof type==='function'?type(props||{}):({type,props:props||{}});
const react={useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useMemo:fn=>fn(),useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((d,j)=>d!==effects[i].deps[j]))pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});}};
const context={exports:{},URLSearchParams,AbortController,window:{location:{search:'?subject=SCIENCE&term=Term%202'},setInterval(fn,ms){assert.equal(ms,30000);interval=fn;return 1;},clearInterval(){},addEventListener(){},removeEventListener(){}},fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/lib/learning-area-uploads')return helper.exports;if(name==='@/components/ResourceCard')return {default:props=>({type:'las-card',props})};if(name==='@/components/Header'||name==='@/components/AccountGreeting')return {default:()=>null};throw Error(name);}};
vm.runInNewContext(compile('app/library/page.tsx'),context);
function render(){cursor=0;const tree=context.exports.default();while(pending.length)pending.shift()();return tree;}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props.children)];}
const text=tree=>tree==null?'':Array.isArray(tree)?tree.map(text).join(' '):typeof tree==='object'?text(tree.props.children):String(tree);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const resources=[['SCIENCE','Grade 1','Term 1'],['SCIENCE','Grade 2','Term 2'],['SCIENCE','Grade 3','term2'],['ENGLISH','Grade 1','Term 3'],['MATHEMATICS','Grade 6','2'],['MATHEMATICS - SPS','Grade 7','Full Year'],['KINDERGARTEN','Kindergarten','Term 1'],['Kindergarten - Literacy','Kindergarten','FullYear'],['SPED','SNED','unknown'],['SNED','SNED','Term 2']].map(([learningArea,gradeLevel,term],index)=>({id:String(index),title:'LAS '+index,learningArea,gradeLevel,term}));
(async()=>{
 let tree=render();assert.ok(text(tree).includes('Loading learning resources'));assert.ok(!text(tree).includes('No learning resources found'));assert.equal(requests[0].url,'/api/resources');
 requests[0].resolve({ok:true,json:async()=>({resources})});await tick();tree=render();assert.equal(nodes(tree).filter(n=>n.type==='las-card').length,2);assert.ok(text(tree).includes('2 resources'));
 const summary=helper.exports.summarizeResourceInventory(resources);
 for(const area of summary.areas)for(const [key,label] of [['term1','Term 1'],['term2','Term 2'],['term3','Term 3'],['fullYear','Full Year'],['other','Other / unspecified']]){
   let selects=nodes(tree).filter(n=>n.type==='select');selects[0].props.onChange({target:{value:area.learningArea}});selects[2].props.onChange({target:{value:label}});tree=render();assert.equal(nodes(tree).filter(n=>n.type==='las-card').length,area[key],`${area.learningArea} ${label}: visible cards must equal report`);
 }
 interval();requests[1].reject(Error('offline'));await tick();tree=render();assert.ok(text(tree).includes('loading error, not confirmation'));assert.ok(!text(tree).includes('No learning resources found'));assert.ok(!nodes(tree).some(n=>n.type==='las-card'));
 nodes(tree).find(n=>n.type==='button'&&text(n)==='Refresh resources').props.onClick();tree=render();assert.equal(requests.length,3);requests[2].resolve({ok:true,json:async()=>({resources})});await tick();tree=render();assert.ok(!text(tree).includes('Counts unavailable'));
 nodes(tree).find(n=>n.type==='button'&&text(n)==='Clear filters').props.onClick();tree=render();assert.equal(nodes(tree).filter(n=>n.type==='las-card').length,resources.length);
 for(const effect of effects)effect?.cleanup?.();
 console.log('Library inventory checks passed: report deep links, every area/term count equals visible LAS cards, aliases and unspecified terms, all grades, loading/error states, 30-second polling, retry and clear filters.');
})().catch(error=>{console.error(error);process.exitCode=1;});
