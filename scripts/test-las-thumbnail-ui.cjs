const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const defaultThumbnail={url:'/phelps-resource-cover.png',width:1532,height:876,custom:false};
function harness(file,extras={}){
 const slots=[],effects=[],pending=[],requests=[],revoked=[],listeners={};let cursor=0,interval;
 const jsx=(type,props)=>({type,props:props||{}});
 const input={value:'selected.png'};
 const react={createContext:value=>({Provider:'provider',value}),useContext:()=>({}),useCallback:fn=>fn,useId:()=> 'thumbnail-test',useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>slots[i]=typeof value==='function'?value(slots[i]):value];},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial===null?input:initial};return slots[i];},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((d,j)=>d!==effects[i].deps[j]))pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});}};
 const context={exports:{},Error,FormData,AbortController,URL:{createObjectURL:()=> 'blob:test-cover',revokeObjectURL:url=>revoked.push(url)},document:{visibilityState:'visible'},window:{setInterval(fn,ms){assert.equal(ms,30000);interval=fn;return 1;},clearInterval(){},addEventListener(k,fn){listeners[k]=fn;},removeEventListener(k){delete listeners[k];}},fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,resolve,reject})),require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name in extras)return extras[name];throw Error(name);}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);
 return {requests,revoked,slots,input,listeners,render(props={}){cursor=0;const tree=context.exports.default(props);while(pending.length)pending.shift()();return tree;},poll:()=>interval(),cleanup:()=>effects.forEach(e=>e?.cleanup?.())};
}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props.children)];}
const find=(tree,type)=>nodes(tree).find(x=>x.type===type);
const text=tree=>tree==null?'':Array.isArray(tree)?tree.map(text).join(' '):typeof tree==='object'?text(tree.props.children):String(tree);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 let applied=null;
 const ui=harness('components/LasThumbnailUploader.tsx',{'./LasThumbnailProvider':{useLasThumbnail:()=>({thumbnail:applied||defaultThumbnail,setThumbnail:value=>applied=value})}});
 let tree=ui.render();assert.ok(text(tree).includes('Current thumbnail'));assert.equal(find(tree,'button').props.disabled,true);
 find(tree,'input').props.onChange({target:{files:[new File(['bad'],'file.svg',{type:'image/svg+xml'})]}});tree=ui.render();assert.ok(text(tree).includes('Choose a PNG'));assert.equal(find(tree,'button').props.disabled,true);
 const file=new File(['fake bytes for UI-only test'],'cover.png',{type:'image/png'});
 find(tree,'input').props.onChange({target:{files:[file]}});ui.render();tree=ui.render();assert.ok(text(tree).includes('not yet saved'));assert.equal(find(tree,'img').props.src,'blob:test-cover');assert.equal(applied,null);
 const submit=()=>find(tree,'form').props.onSubmit({preventDefault(){}});
 let task=submit();submit();assert.equal(ui.requests.length,1);assert.equal(ui.requests[0].options.method,'POST');tree=ui.render();assert.equal(find(tree,'input').props.disabled,true);
 ui.requests[0].resolve({ok:false,json:async()=>({error:'Upload unavailable'})});await task;tree=ui.render();assert.ok(text(tree).includes('Upload unavailable'));assert.equal(applied,null);assert.ok(text(tree).includes('cover.png'));
 task=submit();const next={url:'/api/las-thumbnail/image?v=new-version',width:1600,height:900,custom:true};ui.requests[1].resolve({ok:true,json:async()=>({thumbnail:next})});await task;ui.render();tree=ui.render();assert.equal(applied.url,next.url);assert.ok(text(tree).includes('Thumbnail updated.'));assert.equal(find(tree,'img').props.src,next.url);assert.equal(find(tree,'button').props.disabled,true);assert.ok(ui.revoked.includes('blob:test-cover'));assert.equal(ui.input.value,'');
 const provider=harness('components/LasThumbnailProvider.tsx');tree=provider.render({children:'cards'});assert.equal(provider.requests.length,1);
 // A metadata request already in flight must not overwrite an administrator's new upload.
 tree.props.value.setThumbnail(next);provider.requests[0].resolve({ok:true,json:async()=>({thumbnail:defaultThumbnail})});await tick();tree=provider.render({children:'cards'});assert.equal(tree.props.value.thumbnail.url,next.url);
 provider.poll();assert.equal(provider.requests.length,2);provider.requests[1].reject(Error('offline'));await tick();tree=provider.render();assert.equal(tree.props.value.thumbnail.url,next.url);
 provider.poll();const newer={...next,url:'/api/las-thumbnail/image?v=newer'};provider.requests[2].resolve({ok:true,json:async()=>({thumbnail:newer})});await tick();tree=provider.render();assert.equal(tree.props.value.thumbnail.url,newer.url);provider.cleanup();ui.cleanup();
 console.log('Thumbnail UI checks passed: preview before saving, validation, single upload, loading lock, error preservation, successful global update, preview URL cleanup, 30-second refresh, last-good cover on errors, and stale-read race protection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
