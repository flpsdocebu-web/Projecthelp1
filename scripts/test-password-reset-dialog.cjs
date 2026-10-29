const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const slots=[],effects=[],pending=[],requests=[];let cursor=0,closed=0,resetCount=0;
const jsx=(type,props)=>({type,props:props||{}});
const focus={focus(){},querySelector(){return focus;},querySelectorAll(){return [focus];}};
const listeners={};
const document={activeElement:focus,body:{style:{overflow:'auto'}},addEventListener(k,fn){listeners[k]=fn;},removeEventListener(k){delete listeners[k];}};
const react={useId:()=> 'reset-test',useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial===null?focus:initial};return slots[i];},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((d,j)=>d!==effects[i].deps[j]))pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});}};
const context={exports:{},document,fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='react-dom')return {createPortal:tree=>tree};throw Error(name);}};
context.Error=Error;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/ResetPasswordDialog.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
const props={user:{id:'sample-id',username:'sample',name:'Sample User'},onClose:()=>closed++,onReset:()=>resetCount++};
function render(){cursor=0;const tree=context.exports.default(props);while(pending.length)pending.shift()();return tree;}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props.children)];}
const find=(tree,type)=>nodes(tree).find(x=>x.type===type);
const submit=tree=>find(tree,'form').props.onSubmit({preventDefault(){}});
const text=tree=>tree==null?'':Array.isArray(tree)?tree.map(text).join(' '):typeof tree==='object'?text(tree.props.children):String(tree);
(async()=>{
 let tree=render();assert.equal(document.body.style.overflow,'hidden');assert.equal(find(tree,'input').props.type,'password');assert.equal(find(tree,'input').props.minLength,8);
 find(tree,'input').props.onChange({target:{value:'short'}});await submit(render());assert.equal(requests.length,0);assert.ok(text(render()).includes('at least 8'));
 find(render(),'input').props.onChange({target:{value:'safe-test-password'}});tree=render();let task=submit(tree);await submit(tree);assert.equal(requests.length,1);assert.equal(requests[0].url,'/api/users');assert.deepEqual(JSON.parse(requests[0].options.body),{id:'sample-id',action:'reset',password:'safe-test-password'});
 tree=render();assert.ok(text(tree).includes('Resetting'));assert.equal(find(tree,'input').props.disabled,true);listeners.keydown({key:'Escape'});assert.equal(closed,0);
 requests[0].resolve({ok:false,json:async()=>({error:'Administrator access required.'})});await task;tree=render();assert.ok(text(tree).includes('Administrator access required.'));assert.ok(!text(tree).includes('Password has been reset.'));assert.equal(resetCount,0);
 task=submit(tree);requests[1].reject(new Error('Connection unavailable'));await task;assert.ok(text(render()).includes('Connection unavailable'));assert.equal(resetCount,0);
 task=submit(render());requests[2].resolve({ok:true,json:async()=>({ok:true})});await task;tree=render();assert.ok(text(tree).includes('Password has been reset.'));assert.equal(find(tree,'input'),undefined);assert.equal(resetCount,1);assert.equal(slots[0],'');assert.ok(nodes(tree).some(x=>x.type==='svg'));
 listeners.keydown({key:'Escape'});assert.equal(closed,1);for(const effect of effects)effect?.cleanup?.();assert.equal(document.body.style.overflow,'auto');
 const css=fs.readFileSync('app/password-reset.css','utf8');assert.ok(css.includes('rgba(4,20,30,.76)'));assert.ok(css.includes('@keyframes password-reset-tick'));assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(!fs.readFileSync('app/users/page.tsx','utf8').includes('prompt('));
 console.log('Password reset dialog checks passed: masked field, validation, single PATCH, saving lock, failure/retry, server-confirmed animated success, password cleared, Escape and scroll restoration. No real accounts changed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
