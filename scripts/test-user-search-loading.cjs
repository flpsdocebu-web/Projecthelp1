const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const slots=[],effects=[],pending=[],requests=[],timeouts=new Map();let cursor=0,timerId=0;
const jsx=(type,props)=>typeof type==='function'?type(props||{}):({type,props:props||{}});
const react={
 useId:()=> 'users-search',
 useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},
 useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
 useMemo(fn){return fn();},
 useCallback(fn,deps){const i=cursor++;if(!(i in slots))slots[i]=fn;return slots[i];},
 useEffect(fn,deps){const i=cursor++,previous=effects[i];if(!previous||deps.some((d,j)=>d!==previous.deps[j]))pending.push(()=>{previous?.cleanup?.();effects[i]={deps,cleanup:fn()};});},
};
const compile=file=>ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const districtContext={exports:{}};vm.runInNewContext(compile('lib/district.ts'),districtContext);
const iconContext={exports:{},require(name){if(name==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};throw Error(name);}};vm.runInNewContext(compile('components/UserActionIcon.tsx'),iconContext);
const context={exports:{},Date,Map,window:{setTimeout(fn,ms){assert.equal(ms,300);const id=++timerId;timeouts.set(id,fn);return id;},clearTimeout(id){timeouts.delete(id);},setInterval(fn,ms){assert.equal(ms,30000);return 1;},clearInterval(){}},fetch:(url,options)=>new Promise((resolve,reject)=>{assert.equal(url,'/api/users');assert.ok(!options.method,'Search must not write accounts');requests.push({resolve,reject});}),require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='@/lib/district')return districtContext.exports;if(name==='@/components/UserActionIcon')return iconContext.exports;if(name==='@/components/AdminGuard')return {default:props=>props.children};if(name==='@/components/Header')return {default:()=>null};if(name==='@/components/ExportUsersExcel')return {default:props=>({type:'export-users',props})};throw Error(name);}};
vm.runInNewContext(compile('app/users/page.tsx'),context);
function render(){cursor=0;const tree=context.exports.default();while(pending.length)pending.shift()();return tree;}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
function text(tree){if(tree==null||typeof tree==='boolean')return '';if(Array.isArray(tree))return tree.map(text).join(' ').replace(/\s+/g,' ').trim();return typeof tree==='object'?text(tree.props?.children):String(tree);}
const input=tree=>nodes(tree).find(node=>node.type==='input'&&node.props.type==='search');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const users=[
 {id:'a',name:'Ana Sample',username:'ana',email:'ana@example.test',role:'school',schoolName:'Example Elementary',schoolId:'119100',district:'Carmen',online:true,suspended:false},
 {id:'b',name:'Bo Sample',username:'bo',email:'bo@example.test',role:'school',schoolName:'Other School',schoolId:'119101',district:'Compostela',online:false,suspended:true},
 {id:'c',name:'Lin Sample',username:'lin',email:'lin@example.test',role:'student',schoolName:'Example Elementary',schoolId:'119100',district:'Carmen',lrn:'123456789012',online:false,suspended:false},
];
(async()=>{
 let tree=render();assert.equal(input(tree).props['aria-busy'],true);assert.ok(text(tree).includes('Loading user accounts'));
 requests[0].resolve({ok:true,json:async()=>({users})});await tick();tree=render();assert.equal(input(tree).props['aria-busy'],false);assert.ok(text(tree).includes('Ana Sample'));assert.ok(text(tree).includes('Bo Sample'));
 const iconButtons=nodes(tree).filter(n=>n.type==='button'&&n.props.className?.includes('user-action-icon'));assert.equal(iconButtons.length,9);
 for(const button of iconButtons){assert.ok(button.props['aria-label']);assert.ok(button.props.title);assert.equal(text(button),'');assert.ok(nodes(button).some(n=>n.type==='svg'&&n.props['aria-hidden']==='true'));assert.equal(typeof button.props.onClick,'function');}
 assert.ok(iconButtons.some(n=>n.props['aria-label']==='Activate account for bo'));assert.ok(iconButtons.some(n=>n.props['aria-label']==='Suspend account for ana'));assert.ok(iconButtons.some(n=>n.props['aria-label']==='Reset password for ana'));assert.ok(iconButtons.some(n=>n.props['aria-label']==='Delete account for ana'));
 input(tree).props.onFocus();tree=render();assert.equal(requests.length,2);assert.equal(input(tree).props['aria-busy'],true);assert.ok(!input(tree).props.disabled);assert.ok(text(tree).includes('Updating user list'));
 requests[1].resolve({ok:true,json:async()=>({users})});await tick();tree=render();
 input(tree).props.onChange({target:{value:'ana'}});tree=render();assert.equal(input(tree).props.value,'ana');assert.equal(input(tree).props['aria-busy'],true);assert.ok(text(tree).includes('Searching users'));assert.ok(nodes(tree).filter(n=>n.type==='export-users').every(n=>n.props.disabled));
 const pendingActions=nodes(tree).filter(n=>n.type==='button'&&n.props.className?.includes('user-action-icon'));assert.ok(pendingActions.length>0);assert.ok(pendingActions.every(n=>n.props.disabled));
 for(const fn of [...timeouts.values()])fn();tree=render();assert.equal(input(tree).props['aria-busy'],false);assert.ok(text(tree).includes('Ana Sample'));assert.ok(!text(tree).includes('Bo Sample'));
 input(tree).props.onChange({target:{value:'a'}});tree=render();input(tree).props.onChange({target:{value:'bo'}});tree=render();assert.equal(timeouts.size,1);for(const fn of [...timeouts.values()])fn();tree=render();assert.ok(text(tree).includes('Bo Sample'));assert.ok(!text(tree).includes('Ana Sample'));
 input(tree).props.onFocus();tree=render();requests[2].resolve({ok:false,json:async()=>({error:'Test service unavailable'})});await tick();tree=render();assert.equal(input(tree).props['aria-busy'],false);assert.ok(text(tree).includes('Test service unavailable'));assert.ok(text(tree).includes('Bo Sample'));
 nodes(tree).find(n=>n.type==='button'&&text(n)==='Clear filters').props.onClick();tree=render();assert.equal(input(tree).props.value,'');assert.equal(input(tree).props['aria-busy'],false);assert.ok(text(tree).includes('Ana Sample'));assert.ok(text(tree).includes('Lin Sample'));
 input(tree).props.onFocus();tree=render();requests[3].resolve({ok:true,json:async()=>({users})});await tick();tree=render();assert.ok(!text(tree).includes('Test service unavailable'));assert.equal(input(tree).props['aria-busy'],false);
 const css=fs.readFileSync(path.join(__dirname,'../app/user-management.css'),'utf8');assert.ok(css.includes('height:50px;font-size:16px'));assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('flex:0 0 36px;width:36px;height:36px'));assert.ok(css.includes('white-space:nowrap;overflow-wrap:normal;word-break:normal'));
 console.log('User search checks passed: larger text, focus refresh, editable loading field, 300ms typing debounce, rapid-query cancellation, preserved results after errors, clear filters, paused exports/actions, and read-only search requests.');
})().catch(error=>{console.error(error);process.exitCode=1;});
