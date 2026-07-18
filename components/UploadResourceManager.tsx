"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Resource = { id:string; title:string; learningArea:string; gradeLevel:string; term:string; fileName:string };

const subjects = ["SPED","KINDERGARTEN","ENGLISH","MATHEMATICS","SCIENCE","FILIPINO","MUSIC & ARTS","PHYSICAL EDUCATION & HEALTH","EPP","Technology and Livelihood Education (TLE)","GMRC","Values Education (VE)","Edukasyong Pantahanan at Pangkabuhayan (EPP)","Araling Panlipunan (AP)","Alternative Learning System (ALS)","Effective Communication","General Mathematics","General Science","Life and Career Skills","Pag-aaral ng Kasaysayan at Lipunang Pilipino","ELECTIVES","TECHPRO"].sort((a,b)=>a.localeCompare(b));
const grades = ["Kindergarten",...Array.from({length:12},(_,i)=>`Grade ${i+1}`),"Alternative Learning System"];

export default function UploadResourceManager(){
  const [open,setOpen]=useState(false),[mounted,setMounted]=useState(false),[uploads,setUploads]=useState<Resource[]>([]),[message,setMessage]=useState(""),[selectedCount,setSelectedCount]=useState(0),[duplicateSelection,setDuplicateSelection]=useState<string[]>([]),[uploading,setUploading]=useState(false);
  const load=()=>fetch("/api/resources",{cache:"no-store"}).then(r=>r.json()).then(d=>setUploads(d.resources||[])).catch(()=>{});
  useEffect(()=>{setMounted(true);void load()},[]);

  function selectFiles(files:FileList|null){
    const selected=Array.from(files||[]),seen=new Set<string>(),duplicates=new Set<string>();
    selected.forEach(file=>{const key=`${file.name.toLowerCase()}|${file.size}`;seen.has(key)?duplicates.add(file.name):seen.add(key)});
    const names=[...duplicates];setSelectedCount(selected.length);setDuplicateSelection(names);
    setMessage(names.length?`Duplicate files selected: ${names.join(", ")}. Remove duplicates before uploading.`:"");
  }

  async function upload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(uploading||duplicateSelection.length)return;
    const form=event.currentTarget,data=new FormData(form),input=form.elements.namedItem("resourceFile") as HTMLInputElement;
    Array.from(input.files||[]).forEach(file=>data.append("files",file));data.delete("resourceFile");
    setUploading(true);setMessage("Checking for duplicates and uploading PDFs securely…");
    try{const response=await fetch("/api/resources",{method:"POST",body:data}),result=await response.json();if(!response.ok){setMessage(result.error||"Upload failed.");return}setMessage(`${result.resources.length} PDF file${result.resources.length===1?"":"s"} uploaded successfully.`);form.reset();setSelectedCount(0);setDuplicateSelection([]);await load()}catch{setMessage("Upload service is temporarily unavailable.")}finally{setUploading(false)}
  }

  const dialog=open&&mounted?createPortal(<div className="upload-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!uploading)setOpen(false)}}><section className="account-dialog upload-dialog"><header><span className="account-icon upload-icon">⇧</span><div><small>Central resource management</small><h2>Upload Learning Resources</h2></div><button type="button" disabled={uploading} onClick={()=>setOpen(false)}>×</button></header><div className="upload-dialog-scroll"><form onSubmit={upload}><p className="auto-title-note">Select one or many PDFs. Duplicate files are blocked before anything is saved.</p><div className="dialog-grid"><label>Subject<select name="learningArea" required defaultValue=""><option value="" disabled>Select subject</option>{subjects.map(subject=><option key={subject}>{subject}</option>)}</select></label><label>Grade Level<select name="gradeLevel" required defaultValue=""><option value="" disabled>Select grade</option>{grades.map(grade=><option key={grade}>{grade}</option>)}</select></label></div><label>Term<select name="term" required defaultValue=""><option value="" disabled>Select term</option><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></label><label className="file-drop">PDF Learning Activity Sheets<input name="resourceFile" type="file" accept="application/pdf,.pdf" multiple required onChange={e=>selectFiles(e.target.files)}/><span>{selectedCount?`${selectedCount} PDF files selected`:"Choose PDF files"}</span><small>PDF only · maximum 15 MB per file · duplicates blocked</small></label>{message&&<p className={`form-alert ${message.includes("successfully")?"success":"error"}`}>{message}</p>}<div className="dialog-actions"><button type="button" disabled={uploading} onClick={()=>setOpen(false)}>Close</button><button type="submit" disabled={uploading||duplicateSelection.length>0}>{uploading?"Checking & uploading…":"Upload PDF Batch →"}</button></div></form></div></section></div>,document.body):null;
  return <><div className="upload-manager-summary"><div><small>Uploaded resources</small><strong>{uploads.length}</strong></div><button className="btn primary" type="button" onClick={()=>{setMessage("");setDuplicateSelection([]);setOpen(true)}}>＋ Upload new resource</button></div>{dialog}</>;
}
