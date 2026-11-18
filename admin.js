import{createClient}from"https://esm.sh/@supabase/supabase-js@2.119.0";
const db=createClient("https://vuptztqeqblngbpflqzt.supabase.co","sb_publishable_fglLwYtA9GpLJdkwRc90Jw_dNw7TtK8");
const PRIVATE_BUCKET="school-gallery",PUBLIC_BUCKET="school-gallery-public";
async function makeWebImage(file){
 const bitmap=await createImageBitmap(file);
 const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 const ctx=canvas.getContext("2d",{alpha:false});
 ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.78));
 if(!blob)throw new Error("Image compression failed. Please choose another photo.");
 return blob;
}
const $=id=>document.getElementById(id),say=(id,msg)=>$(id).textContent=msg;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function session(){const{data:{session}}=await db.auth.getSession();const ok=session?.user?.app_metadata?.role==="school_admin";$("login").hidden=!!ok;$("app").hidden=!ok;if(session&&!ok)say("loginStatus","Signed in, but this account does not have school_admin authorization.");if(ok)await load();}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();say("loginStatus","Signing in…");const{error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)say("loginStatus",error.message);else await session();});
$("logout").onclick=async()=>{await db.auth.signOut();location.reload();};
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".panel").forEach(x=>x.hidden=x.id!=="p-"+b.dataset.tab);});
async function load(){
 await loadSchoolLogo();
 await loadMedia();
 const [r,g,e,a]=await Promise.all([
  db.from("school_results").select("*").order("year",{ascending:false}),
  db.from("school_gallery").select("*").order("created_at",{ascending:false}),
  db.from("school_events").select("*").order("created_at",{ascending:false}),
  db.from("school_announcements").select("*").order("created_at",{ascending:false})
 ]);
 if(r.error||g.error||e.error||a.error){say("globalStatus",[r.error,g.error,e.error,a.error].filter(Boolean).map(x=>x.message).join(" | "));return;}
 $("resultsList").innerHTML='<table><tr><th>Year</th><th>Name</th><th>Roll no.</th><th>Marks</th><th>Published</th></tr>'+r.data.map(x=>'<tr><td>'+x.year+'</td><td>'+esc(x.student_name)+'</td><td>'+esc(x.board_roll_no)+'</td><td>'+x.marks_obtained+'/'+x.total_marks+'</td><td>'+x.is_published+'</td></tr>').join("")+'</table>';
 $("galleryList").innerHTML='<table><tr><th>Campus</th><th>Title</th><th>Preview</th><th>Status</th><th>Actions</th></tr>'+g.data.map(x=>{
  const url=x.public_image_path?db.storage.from(PUBLIC_BUCKET).getPublicUrl(x.public_image_path).data.publicUrl:null;
  const preview=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">View</a>':'Private draft';
  const action=x.is_published?'<button class="btn small" data-gallery-action="unpublish" data-id="'+x.id+'">Unpublish</button>':'<button class="btn small" data-gallery-action="publish" data-id="'+x.id+'">Publish</button>';
  return '<tr><td>'+esc(x.campus)+'</td><td>'+esc(x.title)+'</td><td>'+preview+'</td><td>'+(x.is_published?'Public':'Draft')+'</td><td class="gallery-actions">'+action+' <button class="btn small danger" data-gallery-action="delete" data-id="'+x.id+'">Delete</button></td></tr>';
 }).join("")+'</table>'+(g.data.length?"":'<p>No gallery uploads yet.</p>');
 $("eventsList").innerHTML='<table><tr><th>Title</th><th>Campus</th><th>Date</th><th>Published</th></tr>'+e.data.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.campus)+'</td><td>'+esc(x.event_date)+'</td><td>'+x.is_published+'</td></tr>').join("")+'</table>';
 $("announcementsList").innerHTML='<table><tr><th>Title</th><th>Category</th><th>Status</th><th>Expiry</th><th>Actions</th></tr>'+a.data.map(x=>{
  const state=x.is_published?'Published':'Draft';
  const action=x.is_published?'<button class="btn small" data-announcement-action="unpublish" data-id="'+x.id+'">Unpublish</button>':'<button class="btn small" data-announcement-action="publish" data-id="'+x.id+'">Publish</button>';
  const expiry=x.expires_at?new Date(x.expires_at).toLocaleString():'No expiry';
  return '<tr><td>'+esc(x.title)+'</td><td>'+esc(x.announcement_type)+'</td><td>'+state+'</td><td>'+esc(expiry)+'</td><td class="gallery-actions"><button class="btn small" data-announcement-action="edit" data-id="'+x.id+'">Edit</button> '+action+' <button class="btn small danger" data-announcement-action="delete" data-id="'+x.id+'">Delete</button></td></tr>';
 }).join("")+'</table>'+(a.data.length?"":'<p>No announcements yet. Add your first notice above.</p>');
}
$("galleryList").addEventListener("click",async event=>{
 const button=event.target.closest("[data-gallery-action]");if(!button)return;
 const id=button.dataset.id,action=button.dataset.galleryAction;button.disabled=true;
 try{
  if(action==="publish")await publishGallery(id);
  else if(action==="unpublish")await unpublishGallery(id);
  else if(action==="delete"&&window.confirm("Delete this gallery photo permanently?"))await deleteGallery(id);
 }catch(error){say("galleryStatus",error.message||"Gallery action failed.");}
 finally{button.disabled=false;await load();}
});
async function getGalleryRow(id){
 const{data,error}=await db.from("school_gallery").select("*").eq("id",id).single();
 if(error)throw error;return data;
}
async function publishGallery(id){
 say("galleryStatus","Preparing public copy…");
 const row=await getGalleryRow(id);
 if(!row.image_path)throw new Error("The private image file path is missing.");
 if(row.public_image_path){
  const{error}=await db.from("school_gallery").update({is_published:true}).eq("id",id);
  if(error)throw error;
  return;
 }
 const downloaded=await db.storage.from(PRIVATE_BUCKET).download(row.image_path);
 if(downloaded.error)throw downloaded.error;
 const uploaded=await db.storage.from(PUBLIC_BUCKET).upload(row.image_path,downloaded.data,{upsert:true,contentType:downloaded.data.type||"image/jpeg",cacheControl:"31536000"});
 if(uploaded.error)throw uploaded.error;
 const{error}=await db.from("school_gallery").update({public_image_path:row.image_path,is_published:true}).eq("id",id);
 if(error){await db.storage.from(PUBLIC_BUCKET).remove([row.image_path]);throw error;}
 say("galleryStatus","Published. The photo is now visible in the public school gallery.");
}
async function unpublishGallery(id){
 say("galleryStatus","Removing photo from public gallery…");
 const row=await getGalleryRow(id);
 const{error}=await db.from("school_gallery").update({is_published:false}).eq("id",id);
 if(error)throw error;
 say("galleryStatus","Unpublished. The photo is no longer listed in the public gallery.");
}
async function deleteGallery(id){
 say("galleryStatus","Deleting photo…");
 const row=await getGalleryRow(id);
 if(row.public_image_path){const removed=await db.storage.from(PUBLIC_BUCKET).remove([row.public_image_path]);if(removed.error)throw removed.error;}
 if(row.image_path){const removed=await db.storage.from(PRIVATE_BUCKET).remove([row.image_path]);if(removed.error)throw removed.error;}
 const{error}=await db.from("school_gallery").delete().eq("id",id);if(error)throw error;
 say("galleryStatus","Photo and stored copies deleted.");
}

async function loadMedia(){
 const{data,error}=await db.from("school_gallery").select("*").eq("campus","Website").order("created_at",{ascending:false});
 if(error){say("mediaStatus",error.message);return;}
 const rows=await Promise.all((data||[]).map(async x=>{
  let url=null;
  if(x.public_image_path)url=db.storage.from(PUBLIC_BUCKET).getPublicUrl(x.public_image_path).data.publicUrl;
  else if(x.image_path){
   const{data:signed,error:signedError}=await db.storage.from(PRIVATE_BUCKET).createSignedUrl(x.image_path,3600);
   if(!signedError)url=signed?.signedUrl||null;
  }
  const preview=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">View image</a>':'Preview unavailable';
  const actions=(x.is_published?'<button class="btn small" data-media-action="unpublish" data-id="'+x.id+'">Unpublish</button>':'<button class="btn small" data-media-action="publish" data-id="'+x.id+'">Publish to website</button>')+' <button class="btn small danger" data-media-action="delete" data-id="'+x.id+'">Delete</button>';
  return '<tr><td>'+esc(x.title)+'</td><td>'+preview+'</td><td>'+(x.is_published?'Published':'Uploaded — draft, not live yet')+'</td><td class="gallery-actions">'+actions+'</td></tr>';
 }));
 $("mediaList").innerHTML='<table><tr><th>Position</th><th>Preview</th><th>Status</th><th>Actions</th></tr>'+rows.join("")+'</table>'+(data?.length?"":"<p>No website image replacements uploaded yet.</p>");
}
$("mediaForm").onsubmit=async e=>{
 e.preventDefault();const f=new FormData(e.currentTarget),file=f.get("photo"),slot=f.get("slot");
 if(!file||file.size>8*1024*1024){say("mediaStatus","Select an image up to 8 MB.");return;}
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)){say("mediaStatus","Only JPG, PNG and WebP are allowed.");return;}
 try{
  say("mediaStatus","Optimizing and uploading directly to public website storage…");
  const blob=await makeWebImage(file),path="website/"+slot+"/"+crypto.randomUUID()+".webp";
  const up=await db.storage.from(PUBLIC_BUCKET).upload(path,blob,{contentType:"image/webp",cacheControl:"31536000"});
  if(up.error)throw up.error;
  const{error}=await db.from("school_gallery").insert({campus:"Website",title:slot,alt_text:f.get("alt_text")||slot.replaceAll("-"," "),image_path:null,is_published:true,public_image_path:path});
  if(error){await db.storage.from(PUBLIC_BUCKET).remove([path]);throw error;}
  e.currentTarget.reset();say("mediaStatus","Uploaded and published. The website image is now live.");await loadMedia();
 }catch(error){say("mediaStatus",error.message||"Upload failed.");}
};
$("mediaList").addEventListener("click",async event=>{
 const button=event.target.closest("[data-media-action]");if(!button)return;
 button.disabled=true;const id=button.dataset.id,action=button.dataset.mediaAction;
 try{
  const row=await getGalleryRow(id);
  if(action==="publish"){
   const{data:old,error}=await db.from("school_gallery").select("id").eq("campus","Website").eq("title",row.title).eq("is_published",true);
   if(error)throw error;
   for(const item of old||[])await unpublishGallery(item.id);
   await publishGallery(id);
  }else if(action==="unpublish")await unpublishGallery(id);
  else if(action==="delete"&&window.confirm("Permanently delete this website image and its stored files?"))await deleteGallery(id);
  say("mediaStatus",action==="delete"?"Website image deleted.":action==="unpublish"?"Website image unpublished.":"Website image published and applied.");
 }catch(error){say("mediaStatus",error.message||"Image action failed.");}
 finally{button.disabled=false;await loadMedia();}
});


$("resultForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),v=Object.fromEntries(f);["year","marks_obtained","total_marks"].forEach(k=>v[k]=Number(v[k]));v.is_published=false;const{error}=await db.from("school_results").insert(v);say("resultStatus",error?.message||"Saved as draft. Review before publishing.");if(!error){e.currentTarget.reset();await load();}};
$("galleryForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get("photo");if(!file||file.size>8*1024*1024){say("galleryStatus","Select an image up to 8 MB.");return;}if(!["image/jpeg","image/png","image/webp"].includes(file.type)){say("galleryStatus","Only JPG, PNG and WebP files are allowed.");return;}try{say("galleryStatus","Optimizing and uploading directly to public gallery…");const blob=await makeWebImage(file);const path=f.get("campus").toLowerCase().replaceAll(" ","-")+"/"+crypto.randomUUID()+".webp";const up=await db.storage.from(PUBLIC_BUCKET).upload(path,blob,{contentType:"image/webp",cacheControl:"31536000"});if(up.error)throw up.error;const{error}=await db.from("school_gallery").insert({campus:f.get("campus"),title:f.get("title"),alt_text:f.get("alt_text"),image_path:null,is_published:true,public_image_path:path});if(error){await db.storage.from(PUBLIC_BUCKET).remove([path]);throw error;}say("galleryStatus","Uploaded and published directly to the public gallery.");e.currentTarget.reset();await load();}catch(error){say("galleryStatus",error.message||"Upload failed.");}};
$("eventForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),v=Object.fromEntries(f);v.event_date=v.event_date||null;v.is_published=false;const{error}=await db.from("school_events").insert(v);say("eventStatus",error?.message||"Event saved as draft.");if(!error){e.currentTarget.reset();await load();}};
function localDateTime(value){if(!value)return "";const d=new Date(value);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);}
function resetAnnouncementEditor(){const form=$("announcementForm");form.reset();$("announcementId").value="";$("announcementSaveButton").textContent="Save announcement draft";$("cancelAnnouncementEdit").hidden=true;}
$("cancelAnnouncementEdit").addEventListener("click",resetAnnouncementEditor);
$("announcementForm").onsubmit=async e=>{
 e.preventDefault();
 const form=e.currentTarget,raw=Object.fromEntries(new FormData(form)),id=raw.id;
 const starts=raw.starts_at?new Date(raw.starts_at):new Date();
 const expires=raw.expires_at?new Date(raw.expires_at):null;
 if(Number.isNaN(starts.getTime())||(expires&&Number.isNaN(expires.getTime()))){say("announcementStatus","Please enter valid start and expiry dates.");return;}
 if(expires&&expires<starts){say("announcementStatus","Expiry must be after the start date.");return;}
 const payload={title:raw.title.trim(),message:raw.message.trim(),announcement_type:raw.announcement_type,link_label:raw.link_label.trim()||null,link_url:raw.link_url.trim()||null,starts_at:starts.toISOString(),expires_at:expires?expires.toISOString():null,updated_at:new Date().toISOString()};
 const save=$("announcementSaveButton");save.disabled=true;say("announcementStatus",id?"Updating announcement…":"Saving announcement draft…");
 try{
  const result=id?await db.from("school_announcements").update(payload).eq("id",id):await db.from("school_announcements").insert({...payload,is_published:false});
  if(result.error)throw result.error;
  resetAnnouncementEditor();say("announcementStatus",id?"Announcement updated.":"Announcement saved as a draft. Publish it when ready.");await load();
 }catch(error){say("announcementStatus",error.message||"Could not save announcement.");}
 finally{save.disabled=false;}
};
$("announcementsList").addEventListener("click",async event=>{
 const button=event.target.closest("[data-announcement-action]");if(!button)return;
 const id=button.dataset.id,action=button.dataset.announcementAction;button.disabled=true;
 try{
  if(action==="edit"){
   const{data,error}=await db.from("school_announcements").select("*").eq("id",id).single();if(error)throw error;
   const form=$("announcementForm");$("announcementId").value=data.id;
   form.elements.namedItem("announcement_type").value=data.announcement_type;
   form.elements.namedItem("title").value=data.title;
   form.elements.namedItem("message").value=data.message;
   form.elements.namedItem("starts_at").value=localDateTime(data.starts_at);
   form.elements.namedItem("expires_at").value=localDateTime(data.expires_at);
   form.elements.namedItem("link_label").value=data.link_label||"";
   form.elements.namedItem("link_url").value=data.link_url||"";
   $("announcementSaveButton").textContent="Update announcement";$("cancelAnnouncementEdit").hidden=false;
   say("announcementStatus","Editing: "+data.title);form.scrollIntoView({behavior:"smooth",block:"start"});
  }else if(action==="publish"||action==="unpublish"){
   const{error}=await db.from("school_announcements").update({is_published:action==="publish",updated_at:new Date().toISOString()}).eq("id",id);if(error)throw error;
   say("announcementStatus",action==="publish"?"Announcement published on the public website.":"Announcement unpublished.");
  }else if(action==="delete"&&window.confirm("Delete this announcement permanently?")){
   const{error}=await db.from("school_announcements").delete().eq("id",id);if(error)throw error;
   say("announcementStatus","Announcement deleted.");
  }
 }catch(error){say("announcementStatus",error.message||"Announcement action failed.");}
 finally{button.disabled=false;await load();}
});
db.auth.onAuthStateChange(()=>session());session();
$("passwordForm").onsubmit=async e=>{
 e.preventDefault();const f=new FormData(e.currentTarget),current=f.get("current_password"),next=f.get("new_password"),confirm=f.get("confirm_password");
 if(next.length<12){say("passwordStatus","Use at least 12 characters for the new password.");return;}
 if(next!==confirm){say("passwordStatus","New password and confirmation do not match.");return;}
 if(next===current){say("passwordStatus","Choose a different new password.");return;}
 const{data:{user}}=await db.auth.getUser();if(!user?.email){say("passwordStatus","Please sign in again, then retry.");return;}
 say("passwordStatus","Verifying current password…");const verified=await db.auth.signInWithPassword({email:user.email,password:current});
 if(verified.error){say("passwordStatus","Current password is incorrect. Please try again.");return;}
 const updated=await db.auth.updateUser({password:next});if(updated.error){say("passwordStatus",updated.error.message);return;}
 e.currentTarget.reset();say("passwordStatus","Password updated successfully. Use the new password next time you sign in.");
};


async function loadSchoolLogo(){
 const {data,error}=await db.from("school_settings").select("logo_path").eq("id",1).maybeSingle();
 if(error){say("logoStatus",error.message);return;}
 const preview=$("logoPreview");
 if(data?.logo_path){
  const url=db.storage.from(PUBLIC_BUCKET).getPublicUrl(data.logo_path).data.publicUrl;
  preview.innerHTML='<img src="'+esc(url)+'" alt="Current school logo" style="width:100%;height:100%;object-fit:contain">';
 }else{preview.textContent="PS";}
}
$("logoForm").onsubmit=async e=>{
 e.preventDefault();
 const file=$("schoolLogoFile").files[0];
 if(!file){say("logoStatus","Please choose a logo image.");return;}
 if(file.size>5*1024*1024){say("logoStatus","Logo must be 5 MB or smaller.");return;}
 if(!["image/jpeg","image/png","image/webp"].includes(file.type)){say("logoStatus","Only JPG, PNG and WebP files are allowed.");return;}
 const button=e.currentTarget.querySelector("button");button.disabled=true;
 try{
  say("logoStatus","Uploading logo…");
  const old=await db.from("school_settings").select("logo_path").eq("id",1).maybeSingle();
  if(old.error)throw old.error;
  const ext=file.name.split(".").pop().toLowerCase();
  const path="branding/school-logo-"+crypto.randomUUID()+"."+ext;
  const uploaded=await db.storage.from(PUBLIC_BUCKET).upload(path,file,{contentType:file.type,cacheControl:"60",upsert:false});
  if(uploaded.error)throw uploaded.error;
  const saved=await db.from("school_settings").upsert({id:1,logo_path:path,updated_at:new Date().toISOString()},{onConflict:"id"});
  if(saved.error){await db.storage.from(PUBLIC_BUCKET).remove([path]);throw saved.error;}
  if(old.data?.logo_path)await db.storage.from(PUBLIC_BUCKET).remove([old.data.logo_path]);
  await loadSchoolLogo();
  e.currentTarget.reset();
  say("logoStatus","Logo updated. Refresh the public website to see the new logo.");
 }catch(error){say("logoStatus",error.message||"Logo upload failed.");}
 finally{button.disabled=false;}
};
