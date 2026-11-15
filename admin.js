import{createClient}from"https://esm.sh/@supabase/supabase-js@2.119.0";
const db=createClient("https://vuptztqeqblngbpflqzt.supabase.co","sb_publishable_fglLwYtA9GpLJdkwRc90Jw_dNw7TtK8");
const PRIVATE_BUCKET="school-gallery",PUBLIC_BUCKET="school-gallery-public";
const $=id=>document.getElementById(id),say=(id,msg)=>$(id).textContent=msg;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function session(){const{data:{session}}=await db.auth.getSession();const ok=session?.user?.app_metadata?.role==="school_admin";$("login").hidden=!!ok;$("app").hidden=!ok;if(session&&!ok)say("loginStatus","Signed in, but this account does not have school_admin authorization.");if(ok)await load();}
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();say("loginStatus","Signing in…");const{error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)say("loginStatus",error.message);else await session();});
$("logout").onclick=async()=>{await db.auth.signOut();location.reload();};
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".panel").forEach(x=>x.hidden=x.id!=="p-"+b.dataset.tab);});
async function load(){
 const [r,g,e]=await Promise.all([
  db.from("school_results").select("*").order("year",{ascending:false}),
  db.from("school_gallery").select("*").order("created_at",{ascending:false}),
  db.from("school_events").select("*").order("created_at",{ascending:false})
 ]);
 if(r.error||g.error||e.error){say("globalStatus",[r.error,g.error,e.error].filter(Boolean).map(x=>x.message).join(" | "));return;}
 $("resultsList").innerHTML='<table><tr><th>Year</th><th>Name</th><th>Roll no.</th><th>Marks</th><th>Published</th></tr>'+r.data.map(x=>'<tr><td>'+x.year+'</td><td>'+esc(x.student_name)+'</td><td>'+esc(x.board_roll_no)+'</td><td>'+x.marks_obtained+'/'+x.total_marks+'</td><td>'+x.is_published+'</td></tr>').join("")+'</table>';
 $("galleryList").innerHTML='<table><tr><th>Campus</th><th>Title</th><th>Preview</th><th>Status</th><th>Actions</th></tr>'+g.data.map(x=>{
  const url=x.public_image_path?db.storage.from(PUBLIC_BUCKET).getPublicUrl(x.public_image_path).data.publicUrl:null;
  const preview=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener">View</a>':'Private draft';
  const action=x.is_published?'<button class="btn small" data-gallery-action="unpublish" data-id="'+x.id+'">Unpublish</button>':'<button class="btn small" data-gallery-action="publish" data-id="'+x.id+'">Publish</button>';
  return '<tr><td>'+esc(x.campus)+'</td><td>'+esc(x.title)+'</td><td>'+preview+'</td><td>'+(x.is_published?'Public':'Draft')+'</td><td class="gallery-actions">'+action+' <button class="btn small danger" data-gallery-action="delete" data-id="'+x.id+'">Delete</button></td></tr>';
 }).join("")+'</table>'+(g.data.length?"":'<p>No gallery uploads yet.</p>');
 $("eventsList").innerHTML='<table><tr><th>Title</th><th>Campus</th><th>Date</th><th>Published</th></tr>'+e.data.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.campus)+'</td><td>'+esc(x.event_date)+'</td><td>'+x.is_published+'</td></tr>').join("")+'</table>';
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
 const downloaded=await db.storage.from(PRIVATE_BUCKET).download(row.image_path);
 if(downloaded.error)throw downloaded.error;
 const uploaded=await db.storage.from(PUBLIC_BUCKET).upload(row.image_path,downloaded.data,{upsert:true,contentType:downloaded.data.type||"image/jpeg",cacheControl:"60"});
 if(uploaded.error)throw uploaded.error;
 const{error}=await db.from("school_gallery").update({public_image_path:row.image_path,is_published:true}).eq("id",id);
 if(error){await db.storage.from(PUBLIC_BUCKET).remove([row.image_path]);throw error;}
 say("galleryStatus","Published. The photo is now visible in the public school gallery.");
}
async function unpublishGallery(id){
 say("galleryStatus","Removing photo from public gallery…");
 const row=await getGalleryRow(id);
 if(row.public_image_path){
  const removed=await db.storage.from(PUBLIC_BUCKET).remove([row.public_image_path]);
  if(removed.error)throw removed.error;
 }
 const{error}=await db.from("school_gallery").update({is_published:false,public_image_path:null}).eq("id",id);
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
$("resultForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),v=Object.fromEntries(f);["year","marks_obtained","total_marks"].forEach(k=>v[k]=Number(v[k]));v.is_published=false;const{error}=await db.from("school_results").insert(v);say("resultStatus",error?.message||"Saved as draft. Review before publishing.");if(!error){e.currentTarget.reset();await load();}};
$("galleryForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),file=f.get("photo");if(!file||file.size>8*1024*1024){say("galleryStatus","Select an image up to 8 MB.");return;}if(!["image/jpeg","image/png","image/webp"].includes(file.type)){say("galleryStatus","Only JPG, PNG and WebP files are allowed.");return;}const ext=file.name.split(".").pop().toLowerCase();const path=f.get("campus").toLowerCase().replaceAll(" ","-")+"/"+crypto.randomUUID()+"."+ext;say("galleryStatus","Uploading privately…");const up=await db.storage.from(PRIVATE_BUCKET).upload(path,file,{contentType:file.type});if(up.error){say("galleryStatus",up.error.message);return;}const{error}=await db.from("school_gallery").insert({campus:f.get("campus"),title:f.get("title"),alt_text:f.get("alt_text"),image_path:path,is_published:false,public_image_path:null});say("galleryStatus",error?.message||"Uploaded privately as a draft. Press Publish only after school approval.");if(!error){e.currentTarget.reset();await load();}};
$("eventForm").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),v=Object.fromEntries(f);v.event_date=v.event_date||null;v.is_published=false;const{error}=await db.from("school_events").insert(v);say("eventStatus",error?.message||"Event saved as draft.");if(!error){e.currentTarget.reset();await load();}};
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
