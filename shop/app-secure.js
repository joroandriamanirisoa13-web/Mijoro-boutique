// ========= CONFIG =========
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw'; // Fenoy eto
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

// Buckets
const BUCKET_MEDIA = 'Media'; 
const BUCKET_APPS  = 'apps';  

// ========= INIT =========
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const els = {
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty'),
  loginBtn: document.getElementById('loginBtn'),
  addBtn: document.getElementById('addBtn'),
  chips: Array.from(document.querySelectorAll('.chip')),
  search: document.getElementById('searchInput'),
  reset: document.getElementById('resetFilters'),
  modal: document.getElementById('modal'),
  form: document.getElementById('form'),
  closeBtn: document.getElementById('closeBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  imageFile: document.getElementById('imageFile'),
  mediaFile: document.getElementById('mediaFile'),
  appFile: document.getElementById('appFile'),
};
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPass');
const closeLogin = document.getElementById('closeLogin');
const cancelLogin = document.getElementById('cancelLogin');

let session = null;
let isOwner = false;
let filter = 'all';
let q = '';
let allProducts = [];

// ========= AUTH =========
async function initAuth() {
  const { data } = await supabase.auth.getSession();
  session = data?.session || null;
  computeIsOwner();
  reflectUI();

  supabase.auth.onAuthStateChange((_e, s) => {
    session = s;
    computeIsOwner();
    reflectUI();
    fetchAndStoreProducts();
  });
}

function computeIsOwner() {
  const email = session?.user?.email || '';
  isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function reflectUI() {
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (els.addBtn) els.addBtn.hidden = !isOwner;
}

els.loginBtn?.addEventListener('click', async () => {
  if (session) { await supabase.auth.signOut(); return; }
  loginEmail.value = OWNER_EMAIL; loginPass.value = '';
  loginModal.showModal();
});
closeLogin?.addEventListener('click', () => loginModal.close());
cancelLogin?.addEventListener('click', () => loginModal.close());

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (loginEmail.value || '').trim();
  const password = loginPass.value || '';
  if (!email || !password) return alert('Fenoy email sy password');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login failed: ' + error.message);
  loginModal.close();
  session = (await supabase.auth.getSession()).data.session;
  computeIsOwner();
  reflectUI();
  fetchAndStoreProducts();
});

// ========= DB HELPERS =========
async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending:false });
  if (error) { alert('listProducts error: ' + error.message); return []; }
  return data || [];
}

async function saveProduct(p) {
  if (!isOwner || !session) { alert('Owner only'); return; }
  const payload = {
    title:p.title, type:p.type, is_free:p.is_free,
    price:p.price, promo:p.promo, is_vip:p.is_vip,
    image_url:p.image_url||null, media_url:p.media_url||null,
    description:p.description||null, tags:p.tags||[],
    platform:p.platform||null, version:p.version||null, build_number:p.build_number||null,
    file_url:p.file_url||null, file_size:p.file_size||null, file_type:p.file_type||null,
    screenshots:p.screenshots||[], owner:session.user.id
  };
  let err;
  if (p.id) ({ error: err } = await supabase.from('products').update(payload).eq('id', p.id));
  else ({ error: err } = await supabase.from('products').insert(payload));
  if (err) alert('Save product error: ' + err.message);
}

async function removeProduct(id) {
  if (!isOwner || !session) return alert('Owner only');
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) alert('Delete error: ' + error.message);
}

// ========= STORAGE =========
async function uploadToBucket(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert:false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function uploadImage(file){ 
  const path = `images/${Date.now()}-${file.name}`;
  return uploadToBucket(BUCKET_MEDIA,path,file);
}
async function uploadMedia(file){
  const ext = (file.name.split('.').pop()||'').toLowerCase();
  const folder = ext==='pdf'?'pdfs':'videos';
  const path = `${folder}/${Date.now()}-${file.name}`;
  return uploadToBucket(BUCKET_MEDIA,path,file);
}
async function uploadAppFile(file){
  const path = `binaries/${Date.now()}-${file.name}`;
  const url = await uploadToBucket(BUCKET_APPS,path,file);
  return { url, size:file.size, type:file.type||'application/octet-stream' };
}

// ========= File input events =========
els.imageFile?.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  try { const url = await uploadImage(f); els.form.elements['image_url'].value=url; alert('Image uploaded'); }
  catch(err){ alert('Upload failed: '+err.message); }
});
els.mediaFile?.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  try { const url = await uploadMedia(f); els.form.elements['media_url'].value=url; alert('Media uploaded'); }
  catch(err){ alert('Upload failed: '+err.message); }
});
els.appFile?.addEventListener('change', async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  try { const info = await uploadAppFile(f); 
        els.form.elements['file_url'].value=info.url;
        els.form.elements['file_size'].value=info.size;
        els.form.elements['file_type'].value=info.type;
        alert('App file uploaded'); }
  catch(err){ alert('Upload failed: '+err.message); }
});

// ========= MODAL ADD/EDIT =========
els.addBtn?.addEventListener('click',()=>openModal('add'));
els.closeBtn?.addEventListener('click',()=>els.modal.close());
els.cancelBtn?.addEventListener('click',()=>els.modal.close());

function openModal(mode='add',id=null,product=null){
  els.form.reset(); els.form.dataset.mode=mode;
  document.getElementById('modalTitle').textContent=mode==='edit'?'Edit product':'Add product';
  if(product){
    const f=els.form.elements;
    f['id'].value=product.id;
    f['title'].value=product.title||'';
    f['type'].value=product.type||'ebook';
    f['isFree'].checked=!!product.is_free;
    f['price'].value=Number(product.price||0);
    f['promo'].value=Number(product.promo||0);
    f['isVIP'].checked=!!product.is_vip;
    f['image_url'].value=product.image_url||'';
    f['media_url'].value=product.media_url||'';
    f['platform'].value=product.platform||'';
    f['version'].value=product.version||'';
    f['build_number'].value=product.build_number||'';
    f['file_url'].value=product.file_url||'';
    f['file_type'].value=product.file_type||'';
    f['file_size'].value=product.file_size||'';
    f['description'].value=product.description||'';
    f['tags'].value=(product.tags||[]).join(', ');
  } else { els.form.elements['price'].value=0; els.form.elements['promo'].value=0; }
  const sync=()=>{ const isFreeconst sync=()=>{ 
    const f=els.form.elements;
    f['isFree'].disabled = f['price'].value==0 || f['isVIP'].checked;
  };
  els.form.elements['price'].addEventListener('input',sync);
  els.form.elements['isVIP'].addEventListener('change',sync);
  sync();

  els.modal.showModal();
}

els.form?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f=els.form.elements;
  const product = {
    id: f['id'].value||null,
    title: f['title'].value,
    type: f['type'].value,
    is_free: f['isFree'].checked,
    price: parseFloat(f['price'].value)||0,
    promo: parseInt(f['promo'].value)||0,
    is_vip: f['isVIP'].checked,
    image_url: f['image_url'].value||null,
    media_url: f['media_url'].value||null,
    platform: f['platform'].value||null,
    version: f['version'].value||null,
    build_number: f['build_number'].value||null,
    file_url: f['file_url'].value||null,
    file_type: f['file_type'].value||null,
    file_size: parseInt(f['file_size'].value)||null,
    description: f['description'].value||'',
    tags: (f['tags'].value||'').split(',').map(t=>t.trim()).filter(Boolean),
  };
  await saveProduct(product);
  els.modal.close();
  fetchAndStoreProducts();
});

// ========= FETCH & RENDER =========
async function fetchAndStoreProducts(){
  allProducts = await listProducts();
  renderProducts();
}

function renderProducts(){
  const filtered = allProducts.filter(p=>{
    const matchFilter = filter==='all' || (filter==='free'?p.is_free: filter==='vip'?p.is_vip : p.type===filter);
    const matchSearch = !q || (p.title?.toLowerCase().includes(q) || (p.tags||[]).some(t=>t.toLowerCase().includes(q)));
    return matchFilter && matchSearch;
  });
  els.grid.innerHTML='';
  if(filtered.length===0){ els.empty.hidden=false; return; } else els.empty.hidden=true;

  filtered.forEach(p=>{
    const card = document.createElement('div'); card.className='card';
    const thumb = document.createElement('div'); thumb.className='thumb';
    if(p.image_url) thumb.style.backgroundImage = `url(${p.image_url})`;
    card.appendChild(thumb);

    const body = document.createElement('div'); body.className='card-body';
    const titleRow = document.createElement('div'); titleRow.className='title-row';
    const h3 = document.createElement('h3'); h3.textContent = p.title;
    titleRow.appendChild(h3);

    if(p.is_free){ const b=document.createElement('span'); b.className='badge'; b.textContent='Free'; titleRow.appendChild(b);}
    if(p.is_vip){ const b=document.createElement('span'); b.className='badge'; b.textContent='VIP'; titleRow.appendChild(b);}
    if(p.promo>0){ const b=document.createElement('span'); b.className='badge'; b.textContent=`${p.promo}%`; titleRow.appendChild(b);}
    body.appendChild(titleRow);

    const desc = document.createElement('p'); desc.textContent=p.description||''; body.appendChild(desc);

    if(p.tags?.length){ 
      const tagDiv=document.createElement('div'); tagDiv.style.marginTop='6px';
      p.tags.forEach(t=>{
        const span=document.createElement('span'); span.className='badge'; span.textContent=t; tagDiv.appendChild(span);
      });
      body.appendChild(tagDiv);
    }

    // Media preview
    if(p.media_url){
      const ext = (p.media_url.split('.').pop()||'').toLowerCase();
      if(ext==='pdf'){
        const a = document.createElement('a'); a.href=p.media_url; a.target='_blank'; a.textContent='Preview PDF'; body.appendChild(a);
      } else if(['mp4','webm'].includes(ext)){
        const vid=document.createElement('video'); vid.src=p.media_url; vid.controls=true; vid.style.width='100%'; body.appendChild(vid);
      }
    }

    body.appendChild(document.createElement('hr'));

    // Actions
    if(isOwner){
      const act=document.createElement('div'); act.className='card-actions';
      const editBtn=document.createElement('button'); editBtn.className='btn'; editBtn.textContent='Edit';
      editBtn.onclick=()=>openModal('edit',p.id,p);
      const delBtn=document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='Delete';
      delBtn.onclick=()=>{ if(confirm('Confirm delete?')) removeProduct(p.id).then(fetchAndStoreProducts); };
      act.appendChild(editBtn); act.appendChild(delBtn); body.appendChild(act);
    }

    card.appendChild(body);
    els.grid.appendChild(card);
  });
}

// ========= FILTERS & SEARCH =========
els.chips.forEach(c=>c.addEventListener('click',()=>{
  els.chips.forEach(cc=>cc.classList.remove('active'));
  c.classList.add('active'); filter=c.dataset.filter; renderProducts();
}));
els.search.addEventListener('input',()=>{ q=els.search.value.toLowerCase(); renderProducts(); });
els.reset.addEventListener('click',()=>{
  q=''; filter='all'; els.search.value=''; els.chips.forEach(c=>c.classList.remove('active'));
  els.chips.find(c=>c.dataset.filter==='all').classList.add('active'); renderProducts();
});

// ========= INIT =========
initAuth();
fetchAndStoreProducts();