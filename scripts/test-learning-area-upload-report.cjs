const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const bodyClasses=new Set(),windowEvents=new Map(),documentEvents=new Map(),slots=[],cleanups=[];let cursor=0,printed=0,closed=0;
const fakeDialog={isConnected:true,focus(){},querySelectorAll(){return [];}};
const jsx=(type,props)=>typeof type==='function'?type(props||{}):({type,props:props||{}});
const react={useId:()=> 'report-test',useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial===null?fakeDialog:initial};return slots[i];},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useEffect(fn){const i=cursor++;if(!(i in slots)){slots[i]=true;cleanups.push(fn());}}};
const document={activeElement:{focus(){}},fonts:{ready:Promise.resolve()},body:{style:{overflow:'auto'},classList:{add:value=>bodyClasses.add(value),remove:value=>bodyClasses.delete(value)}},addEventListener:(name,fn)=>documentEvents.set(name,fn),removeEventListener:name=>documentEvents.delete(name)};
const window={addEventListener:(name,fn)=>windowEvents.set(name,fn),removeEventListener:name=>windowEvents.delete(name),print(){assert.ok(bodyClasses.has('learning-area-report-printing'));printed++;}};
const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../components/LearningAreaUploadReport.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const context={exports:{},document,window,Date,Promise,require(name){if(name==='react')return react;if(name==='react-dom')return {createPortal:node=>node};if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/components/LearningAreaUploadTable')return {default:props=>({type:'report-table',props})};throw Error(name);}};
vm.runInNewContext(code,context);
const snapshot={generatedAt:'2026-10-29T01:00:00Z',loadedAt:'2026-10-29T00:59:00Z',summary:{areas:[{learningArea:'ENGLISH',term1:2,term2:3,term3:1,fullYear:4,other:0,total:10}],totals:{term1:2,term2:3,term3:1,fullYear:4,other:0,total:10}}};
function render(){cursor=0;return context.exports.default({snapshot,onClose:()=>closed++});}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
function text(tree){if(tree==null||typeof tree==='boolean')return '';if(Array.isArray(tree))return tree.map(text).join(' ');return typeof tree==='object'?text(tree.props?.children):String(tree);}
(async()=>{
 let tree=render();assert.ok(nodes(tree).some(node=>node.props.role==='dialog'));assert.equal(document.body.style.overflow,'hidden');assert.ok(text(tree).includes('All learning areas'));
 const table=nodes(tree).find(node=>node.type==='report-table');assert.equal(table.props.totals.total,10);assert.equal(table.props.areas.length,1);
 const print=nodes(tree).find(node=>node.type==='button'&&text(node).includes('Print / Save as PDF'));await print.props.onClick();await new Promise(resolve=>setImmediate(resolve));assert.equal(printed,1);assert.ok(bodyClasses.has('learning-area-report-printing'));
 windowEvents.get('afterprint')();assert.ok(!bodyClasses.has('learning-area-report-printing'));
 documentEvents.get('keydown')({key:'Escape'});assert.equal(closed,1);
 bodyClasses.add('learning-area-report-printing');for(const cleanup of cleanups)cleanup();assert.equal(document.body.style.overflow,'auto');assert.ok(!bodyClasses.has('learning-area-report-printing'));assert.equal(windowEvents.size,0);
 const css=fs.readFileSync(path.join(__dirname,'../app/learning-area-uploads.css'),'utf8');assert.match(css,/@page learning-area-upload-report\{size:A4 portrait/);assert.match(css,/thead\{display:table-header-group/);assert.match(css,/tr\{break-inside:avoid/);assert.match(css,/body\.learning-area-report-printing> :not\(\.area-upload-report-backdrop\)\{display:none!important/);
 console.log('Upload report checks passed: full snapshot, accessible dialog, print-only report scope, A4 layout, repeated headers, unsplit rows, print completion cleanup, Escape, and restored page scrolling.');
})().catch(error=>{console.error(error);process.exitCode=1;});
