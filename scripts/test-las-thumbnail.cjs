const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),sharp=require('sharp');
function load(file,deps){const context={exports:{},Buffer,Error,Uint8Array,Response,Request,FormData,File,URL,require:name=>{if(name in deps)return deps[name];throw Error(name);}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,context);return context.exports;}
const images=load('lib/las-thumbnail-image.ts',{'sharp':sharp,'node:crypto':require('node:crypto')});
let authorized=true,fail=false,row=null;const queries=[],writes=[];
const db={query:async sql=>{queries.push(sql);if(fail)throw Error('private database information');return [row?[row]:[]];},execute:async(sql,values)=>{if(fail)throw Error('private database information');writes.push({sql,values});if(values)row={image_data:values[0],image_version:values[1],width:values[2],height:values[3]};}};
const storage=load('lib/las-thumbnail.ts',{'@/lib/db':{db}});
const route=load('app/api/las-thumbnail/route.ts',{'next/server':{NextResponse:{json:(body,options={})=>({body,status:options.status||200,headers:options.headers})}},'@/lib/auth':{requireAdministrator:async()=>authorized?{id:'admin-test'}:null},'@/lib/db':{db},'@/lib/las-thumbnail':storage,'@/lib/las-thumbnail-image':images});
const imageRoute=load('app/api/las-thumbnail/image/route.ts',{'@/lib/las-thumbnail':storage});
function request(bytes,name='cover.png',type='image/png'){const form=new FormData();form.append('image',new File([bytes],name,{type}));return new Request('https://example.test/api/las-thumbnail',{method:'POST',body:form});}
(async()=>{
 const png=await sharp({create:{width:1800,height:1000,channels:3,background:'#2c865a'}}).png().toBuffer();
 const prepared=await images.prepareThumbnail(png);assert.equal(prepared.width,1600);assert.equal((await sharp(prepared.data).metadata()).format,'webp');assert.equal(prepared.version.length,64);
 await assert.rejects(images.prepareThumbnail(Buffer.from('fake image')),/valid PNG/);
 await assert.rejects(images.prepareThumbnail(Buffer.alloc(5*1024*1024+1)),/5 MB/);
 await assert.rejects(images.prepareThumbnail(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"></svg>')),/still PNG/);
 await assert.rejects(images.prepareThumbnail(await sharp({create:{width:50,height:50,channels:3,background:'white'}}).png().toBuffer()),/at least 100/);
 const initial=await route.GET();assert.equal(initial.body.thumbnail.custom,false);assert.equal(writes.length,0,'Public reads must not create tables');
 authorized=false;assert.equal((await route.POST(request(png))).status,403);assert.equal(writes.length,0);
 authorized=true;const cross=request(png);cross.headers.set('sec-fetch-site','cross-site');assert.equal((await route.POST(cross)).status,403);
 assert.equal((await route.POST(request(Buffer.from('fake'),'bad.png'))).status,400);assert.equal(writes.length,0);
 const oversized=new Request('https://example.test/api/las-thumbnail',{method:'POST',headers:{'content-type':'multipart/form-data; boundary=test'},body:Buffer.alloc(5*1024*1024+128*1024+1)});assert.equal((await route.POST(oversized)).status,400);
 const saved=await route.POST(request(png));assert.equal(saved.status,200);assert.equal(saved.body.thumbnail.custom,true);assert.ok(saved.body.thumbnail.url.includes(row.image_version));assert.equal(writes.length,2);
 assert.ok(writes.every(w=>!/\b(resources|users|sessions)\b/i.test(w.sql)),'Upload must not modify resource/account tables');
 const read=await route.GET();assert.equal(read.body.thumbnail.url,saved.body.thumbnail.url);assert.equal(read.headers['Cache-Control'],'no-store');assert.ok(!JSON.stringify(read).includes('image_data'));
 const served=await imageRoute.GET(new Request('https://example.test/api/las-thumbnail/image'));assert.equal(served.headers.get('content-type'),'image/webp');assert.equal(served.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await served.arrayBuffer()),prepared.data);
 const oldVersion=row.image_version;fail=true;assert.equal((await route.POST(request(png))).status,503);assert.equal(row.image_version,oldVersion);const unavailable=await route.GET();assert.equal(unavailable.status,503);assert.ok(!JSON.stringify(unavailable).includes('private database'));assert.equal((await imageRoute.GET(new Request('https://example.test/api/las-thumbnail/image'))).status,503);
 fail=false;row=null;const fallback=await imageRoute.GET(new Request('https://example.test/api/las-thumbnail/image'));assert.equal(fallback.status,307);assert.ok(fallback.headers.get('location').endsWith('/phelps-resource-cover.png'));
 const missingTable=load('lib/las-thumbnail.ts',{'@/lib/db':{db:{query:async()=>{throw Object.assign(Error('missing'),{code:'ER_NO_SUCH_TABLE'});}}}});assert.equal(await missingTable.readThumbnail(),null);
 const page=fs.readFileSync('app/dashboard/page.tsx','utf8');assert.ok(page.indexOf('<LasThumbnailUploader/>')>page.indexOf('<DashboardLiveMetrics/>'));
 console.log('LAS thumbnail checks passed: decoded raster validation, size limits, WebP optimization, admin-only writes, cross-site rejection, persistent singleton storage, public metadata/image, safe fallback/errors, and no LAS/account modifications.');
})().catch(error=>{console.error(error);process.exitCode=1;});
