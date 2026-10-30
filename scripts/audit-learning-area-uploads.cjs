// Read-only reconciliation of public inventory metadata; never changes uploads.
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/learning-area-uploads.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,context);
(async()=>{
 const base='https://flpcebu.sdocebuprovince.com';
 const responses=await Promise.all(['/api/resources','/api/resources/uploads-by-area'].map(path=>fetch(base+path,{cache:'no-store'})));
 if(responses.some(response=>!response.ok))throw Error('Live inventory/report could not be verified. No records changed.');
 const [inventory,report]=await Promise.all(responses.map(response=>response.json()));
 const expected=context.exports.summarizeResourceInventory(inventory.resources);
 const mismatches=[];
 for(const area of expected.areas){const reported=report.areas.find(row=>row.learningArea===area.learningArea);for(const key of ['term1','term2','term3','fullYear','other','total'])if(area[key]!==reported?.[key])mismatches.push({area:area.learningArea,period:key,inventory:area[key],report:reported?.[key]});}
 for(const area of report.areas)if(!expected.areas.some(row=>row.learningArea===area.learningArea))mismatches.push({area:area.learningArea,reason:'Report area absent from inventory'});
 for(const key of ['term1','term2','term3','fullYear','other','total'])if(expected.totals[key]!==report.totals[key])mismatches.push({period:key,inventory:expected.totals[key],report:report.totals[key]});
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),areasChecked:expected.areas.length,resourceRecords:inventory.resources.length,inventoryTotals:expected.totals,mismatches},null,2));
 if(mismatches.length)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
