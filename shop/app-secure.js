
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw'; // Fenoy!
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

// Buckets (mifanaraka amin'ny ao amin'ny Storage-nao)
const BUCKET_MEDIA = 'Media'; // M lehibe (sary/video/PDF)
const BUCKET_APPS  = 'apps';  // kely (app binaries)

// ========= INIT =========
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('APETRAHO')) {
  alert('Tsy mbola feno ny SUPABASE_ANON_KEY ao amin\'ny app-secure.js');
}
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const els = {
  grid: document.getElementById('grid'),
  empty: document.getElementById('empty'),
  loginBtn: document.getElementById('loginBtn'),
  addBtn: document.getElementById('addBtn'),
  chips: Array.from(document.querySelectorAll('.chip')),
  search: document.getElementById('searchInput'),
  modal: document.getElementById('modal'),
  form: document.getElementById('form'),
  closeBtn: document.getElementById('closeBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  imageFile: document.getElementById('imageFile'),
  mediaFile: document.getElementById('mediaFile'),
  appFile: document.getElementById('appFile'),
};

// Login modal elements
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

// ========= AUTH =========
async function initAuth() {
  try {
    const res = await supabase.auth.getSession();
    session = res.data.session;
  } catch (e) {
    console.error('getSession error', e);
  }
  computeIsOwner();
  reflectUI();

  supabase.auth.onAuthStateChange((_e, s) => {
    session = s;
    computeIsOwner();
    reflectUI();
    render();
  });
}

function computeIsOwner() {
  const email = session?.user?.email || '';
  isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function reflectUI() {
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  els.addBtn.hidden = !isOwner;
}

// Open/close login modal
els.loginBtn.addEventListener('click', async () => {
  if (session) {
    await supabase.auth.signOut();
    return;
  }
  if (!loginModal) {
    alert('Tsy hita ny login modal. Havaozy ny index.html araka ny modely.');
    return;
  }
  loginEmail.value = OWNER_EMAIL;
  loginPass.value = '';
  loginModal.showModal();
});
closeLogin?.addEventListener('click', () => loginModal.close());
cancelLogin?.addEventListener('click', () => loginModal.close());

// Submit login
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPass.value;
  if (!email || !password) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message + '\n- Hamarino: Email/Password, Email confirmed, Provider enabled');
  } else {
    loginModal.close();
  }
});

// ========= DB HELPERS =========
async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('listProducts error', error); return []; }
  return data || [];
}

async function saveProduct(p) {
  if (!isOwner || !session) { alert('Owner only'); return; }
  const payload = {
    title: p.title, type: p.type, is_free: p.is_free,
    price: p.price, promo: p.promo, is_vip: p.is_vip,
    image_url: p.image_url || null, media_url: p.media_url || null,
    description: p.description || null, tags: p.tags || [],
    platform: p.platform || null, version: p.version || null, build_number: p.build_number || null,
    file_url: p.file_url || null, file_size: p.file_size || null, file_type: p.file_type || null,
    screenshots: p.screenshots || [],
    owner: session.user.id
  };
  if (p.id) {
    const { error } = await supabase.from('products').update(payload).eq('id', p.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('products').insert(payload);
    if (error) throw error;
  }
}

async function removeProduct(id) {
  if (!isOwner || !session) { alert('Owner only'); return; }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) alert(error.message);
}

// ========= STORAGE (UPLOADS) =========
async function uploadToBucket(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
async function uploadImage(file) {
  const path = `images/${Date.now()}-${file.name}`;
  return uploadToBucket(BUCKET_MEDIA, path, file); // Media
}
async function uploadMedia(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const folder = ext === 'pdf' ? 'pdfs' : 'videos';
  const path = `${folder}/${Date.now()}-${file.name}`;
  return uploadToBucket(BUCKET_MEDIA, path, file); // Media
}
async function uploadAppFile(file) {
  const path = `binaries/${Date.now()}-${file.name}`;
  const url = await uploadToBucket(BUCKET_APPS, path, file); // apps
  return { url, size: file.size, type: file.type || 'application/octet-stream' };
}

// Wire input files
els.imageFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { els.form.elements['image_url'].value = await uploadImage(f); alert('Image uploaded'); }
  catch (err){ console.error(err); alert('Upload failed: ' + err.message); }
});
els.mediaFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { els.form.elements['media_url'].value = await uploadMedia(f); alert('Media uploaded'); }
  catch (err){ console.error(err); alert('Upload failed: ' + err.message); }
});
els.appFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const info = await uploadAppFile(f);
    els.form.elements['file_url'].value = info.url;
    els.form.elements['file_type'].value = info.type;
    els.form.elements['file_size'].value = info.size;
    alert('App file uploaded');
  } catch (err){ console.error(err); alert('Upload failed: ' + err.message); }
});

// ========= FILTERS + SEARCH =========
els.chips.forEach(c => c.addEventListener('click', () => {
  els.chips.forEach(x => x.classList.remove('active'));
  c.classList.add('active'); filter = c.dataset.filter || 'all'; render();
}));
let st; els.search?.addEventListener('input', () => {
  clearTimeout(st); st = setTimeout(()=>{ q = els.search.value.trim().toLowerCase(); render(); }, 150);
});

// ========= MODAL ADD/EDIT =========
document.getElementById('addBtn')?.addEventListener('click', () => openModal('add'));
els.closeBtn?.addEventListener('click', () => els.modal.close());
els.cancelBtn?.addEventListener('click', () => els.modal.close());

function openModal(mode='add', id=null, product=null) {
  els.form.reset(); els.form.dataset.mode = mode;
  document.getElementById('modalTitle').textContent = mode==='edit'?'Edit product':'Add product';
  if (product) {
    const f = els.form.elements;
    f['id'].value = product.id; f['title'].value = product.title||''; f['type'].value = product.type||'ebook';
    f['isFree'].checked = !!product.is_free; f['price'].value = Number(product.price||0); f['promo'].value = Number(product.promo||0);
    f['isVIP'].checked = !!product.is_vip; f['image_url'].value = product.image_url||''; f['media_url'].value = product.media_url||'';
    f['platform'].value = product.platform||''; f['version'].value = product.version||''; f['build_number'].value = product.build_number||'';
    f['file_url'].value = product.file_url||''; f['file_type'].value = product.file_type||''; f['file_size'].value = product.file_size||'';
    f['description'].value = product.description||''; f['tags'].value = (product.tags||[]).join(', ');
  } else { els.form.elements['price'].value = 0; els.form.elements['promo'].value = 0; }
  const sync = () => { const isFree = els.form.elements['isFree'].checked; els.form.elements['price'].disabled = isFree; if (isFree) els.form.elements['price'].value = 0; };
  els.form.elements['isFree'].addEventListener('change', sync, { once:true }); sync();
  els.modal.showModal();
}

els.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOwner) return alert('Owner only');
  const fd = new FormData(els.form); const d = Object.fromEntries(fd.entries());
  const p = {
    id: d.id || undefined,
    title: (d.title||'').trim(),
    type: d.type || 'ebook',
    is_free: els.form.elements['isFree'].checked,
    price: Number(d.price||0),
    promo: Number(d.promo||0),
    is_vip: els.form.elements['isVIP'].checked,
    image_url: (d.image_url||'').trim(),
    media_url: (d.media_url||'').trim(),
    platform: d.platform || null,
    version: d.version || null,
    build_number: d.build_number || null,
    file_url: (d.file_url||'').trim(),
    file_type: (d.file_type||'').trim(),
    file_size: d.file_size ? Number(d.file_size) : null,
    description: (d.description||'').trim(),
    tags: String(d.tags||'').split(',').map(s=>s.trim()).filter(Boolean),
    screenshots: []
  };
  if (!p.title) return alert('Title required');
  if (!['ebook','video','app'].includes(p.type)) return alert('Type invalid');
  if (p.promo<0 || p.promo>100) return alert('Promo 0–100');
  try { await saveProduct(p); els.modal.close(); await render(); }
  catch(err){ console.error(err); alert('Save failed: ' + (err.message||err)); }
});

// ========= RENDER =========
function matchFilters(p){
  if (filter==='ebook' && p.type!=='ebook') return false;
  if (filter==='video' && p.type!=='video') return false;
  if (filter==='app' && p.type!=='app') return false;
  if (filter==='free' && !p.is_free) return false;
  if (filter==='promo' && !(Number(p.promo)>0)) return false;
  if (filter==='vip' && !p.is_vip) return false;
  if (q){
    const hay = [p.title,p.description,(p.tags||[]).join(' '),p.type].filter(Boolean).join(' ').toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}
function priceText(p){
  const base = p.is_free?0:Number(p.price||0);
  const promo = Number(p.promo||0);
  const final = Math.max(0, base - (base*promo)/100);
  if (final===0) return 'GRATUIT';
  if (promo>0 && final<base) return `$${final.toFixed(2)} (was $${base.toFixed(2)})`;
  return `$${base.toFixed(2)}`;
}
async function render(){
  const items = (await listProducts()).filter(matchFilters);
  els.grid.innerHTML=''; if (!items.length){ els.empty.hidden=false; return; } els.empty.hidden=true;
  for (const p of items){
    const card = document.createElement('div'); card.className='card';
    const thumb = document.createElement('div'); thumb.className='thumb'; if(p.image_url) thumb.style.backgroundImage=`url("${p.image_url}")`;
    const body = document.createElement('div'); body.className='card-body';
    const row = document.createElement('div'); row.className='title-row';
    const h = document.createElement('h4'); h.textContent = p.title;
    const badges = document.createElement('div');
    const btype = document.createElement('span'); btype.className='badge'; btype.textContent=p.type.toUpperCase(); badges.appendChild(btype);
    if (p.is_vip){ const b=document.createElement('span'); b.className='badge'; b.textContent='VIP'; badges.appendChild(b); }
    if (p.is_free){ const b=document.createElement('span'); b.className='badge'; b.textContent='FREE'; badges.appendChild(b); }
    if (p.type==='app' && p.platform){ const b=document.createElement('span'); b.className='badge'; b.textContent=p.platform.toUpperCase(); badges.appendChild(b); }
    row.append(h,badges);
    const desc = document.createElement('p'); desc.textContent = p.description||'';
    const price = document.createElement('div'); price.textContent = priceText(p);
    const actions = document.createElement('div'); actions.className='card-actions';
    const openBtn = document.createElement('a'); openBtn.className='btn'; openBtn.target='_blank'; openBtn.rel='noopener';
    if (p.type==='video' && p.media_url){ openBtn.textContent='Play'; openBtn.href=p.media_url; }
    else if (p.type==='ebook' && p.media_url?.toLowerCase().endsWith('.pdf')){ openBtn.textContent='Read PDF'; openBtn.href=p.media_url; }
    else if (p.type==='app' && p.file_url){ openBtn.textContent='Download'; openBtn.href=p.file_url; openBtn.setAttribute('download',''); }
    else { openBtn.textContent='Open'; openBtn.href=p.media_url || p.image_url || '#'; }
    actions.appendChild(openBtn);
    if (isOwner){
      const edit = document.createElement('button'); edit.className='btn'; edit.textContent='Edit'; edit.onclick=()=>openModal('edit', p.id, p);
      const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.onclick=async()=>{ if(confirm(`Supprimer "${p.title}" ?`)){ await removeProduct(p.id); await render(); } };
      actions.append(edit,del);
    }
    body.append(row,desc,price); card.append(thumb,body,actions); els.grid.appendChild(card);
  }
}

// ========= START =========
initAuth().then(render).catch(err => console.error('init error', err));

  }
  computeIsOwner();
  reflectUI();

  supabase.auth.onAuthStateChange((_e, s) => {
    session = s;
    computeIsOwner();
    reflectUI();
    render();
  });
}

function computeIsOwner() {
  const email = session?.user?.email || '';
  isOwner = email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function reflectUI() {
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  els.addBtn.hidden = !isOwner;
}

// Open/close login modal
els.loginBtn.addEventListener('click', async () => {
  if (session) {
    await supabase.auth.signOut();
    return;
  }
  if (!loginModal) {
    alert('Tsy hita ny login modal. Havaozy ny index.html araka ny modely.');
    return;
  }
  loginEmail.value = OWNER_EMAIL;
  loginPass.value = '';
  loginModal.showModal();
});
closeLogin?.addEventListener('click', () => loginModal.close());
cancelLogin?.addEventListener('click', () => loginModal.close());

// Submit login
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPass.value;
  if (!email || !password) return;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Login error:', error);
    alert('Login failed: ' + error.message + '\n- Hamarino: Email/Password, Email confirmed, Provider enabled');
  } else {
    loginModal.close();
  }
});

// ========= DB HELPERS =========
async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('listProducts error', error); return []; }
  return data || [];
}

async function saveProduct(p) {
  if (!isOwner || !session) { alert('Owner only'); return; }
  const payload = {
    title: p.title, type: p.type, is_free: p.is_free,
    price: p.price, promo: p.promo, is_vip: p.is_vip,
    image_url: p.image_url || null, media_url: p.media_url || null,
    description: p.description || null, tags: p.tags || [],
    platform: p.platform || null, version: p.version || null, build_number: p.build_number || null,
    file_url: p.file_url || null, file_size: p.file_size || null, file_type: p.file_type || null,
    screenshots: p.screenshots || [],
    owner: session.user.id
  };
  if (p.id) {
    const { error } = await supabase.from('products').update(payload).eq('id', p.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('products').insert(payload);
    if (error) throw error;
  }
}

async function removeProduct(id) {
  if (!isOwner || !session) { alert('Owner only'); return; }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) alert(error.message);
}

// ========= STORAGE (UPLOADS) =========
async function uploadToBucket(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
async function uploadImage(file) {
  const path = `images/${Date.now()}-${file.name}`;
  return uploadToBucket('media', path, file);
}
async function uploadMedia(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const folder = ext === 'pdf' ? 'pdfs' : 'videos';
  const path = `${folder}/${Date.now()}-${file.name}`;
  return uploadToBucket('media', path, file);
}
async function uploadAppFile(file) {
  const path = `binaries/${Date.now()}-${file.name}`;
  const url = await uploadToBucket('apps', path, file);
  return { url, size: file.size, type: file.type || 'application/octet-stream' };
}

// Wire input files
els.imageFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { els.form.elements['image_url'].value = await uploadImage(f); alert('Image uploaded'); }
  catch (err){ console.error(err); alert('Upload failed: ' + err.message); }
});
els.mediaFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { els.form.elements['media_url'].value = await uploadMedia(f); alert('Media uploaded'); }
  catch (err){ console.error(err); alert('Upload failed: ' + err.message); }
});
els.appFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const info = await uploadAppFile(f);
    els.form.elements['file_url'].value = info.url;
    els.form.elements['file_type'].value = info.type;
    els.form.elements['file_size'].value = info.size;
    alert('App file uploaded');
  } catch (err){ console.error(err); alert('Upload failed: ' + err.message); }
});

// ========= FILTERS + SEARCH =========
els.chips.forEach(c => c.addEventListener('click', () => {
  els.chips.forEach(x => x.classList.remove('active'));
  c.classList.add('active'); filter = c.dataset.filter || 'all'; render();
}));
let st; els.search?.addEventListener('input', () => {
  clearTimeout(st); st = setTimeout(()=>{ q = els.search.value.trim().toLowerCase(); render(); }, 150);
});

// ========= MODAL ADD/EDIT =========
document.getElementById('addBtn')?.addEventListener('click', () => openModal('add'));
els.closeBtn?.addEventListener('click', () => els.modal.close());
els.cancelBtn?.addEventListener('click', () => els.modal.close());

function openModal(mode='add', id=null, product=null) {
  els.form.reset(); els.form.dataset.mode = mode;
  document.getElementById('modalTitle').textContent = mode==='edit'?'Edit product':'Add product';
  if (product) {
    const f = els.form.elements;
    f['id'].value = product.id; f['title'].value = product.title||''; f['type'].value = product.type||'ebook';
    f['isFree'].checked = !!product.is_free; f['price'].value = Number(product.price||0); f['promo'].value = Number(product.promo||0);
    f['isVIP'].checked = !!product.is_vip; f['image_url'].value = product.image_url||''; f['media_url'].value = product.media_url||'';
    f['platform'].value = product.platform||''; f['version'].value = product.version||''; f['build_number'].value = product.build_number||'';
    f['file_url'].value = product.file_url||''; f['file_type'].value = product.file_type||''; f['file_size'].value = product.file_size||'';
    f['description'].value = product.description||''; f['tags'].value = (product.tags||[]).join(', ');
  } else { els.form.elements['price'].value = 0; els.form.elements['promo'].value = 0; }
  const sync = () => { const isFree = els.form.elements['isFree'].checked; els.form.elements['price'].disabled = isFree; if (isFree) els.form.elements['price'].value = 0; };
  els.form.elements['isFree'].addEventListener('change', sync, { once:true }); sync();
  els.modal.showModal();
}

els.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOwner) return alert('Owner only');
  const fd = new FormData(els.form); const d = Object.fromEntries(fd.entries());
  const p = {
    id: d.id || undefined,
    title: (d.title||'').trim(),
    type: d.type || 'ebook',
    is_free: els.form.elements['isFree'].checked,
    price: Number(d.price||0),
    promo: Number(d.promo||0),
    is_vip: els.form.elements['isVIP'].checked,
    image_url: (d.image_url||'').trim(),
    media_url: (d.media_url||'').trim(),
    platform: d.platform || null,
    version: d.version || null,
    build_number: d.build_number || null,
    file_url: (d.file_url||'').trim(),
    file_type: (d.file_type||'').trim(),
    file_size: d.file_size ? Number(d.file_size) : null,
    description: (d.description||'').trim(),
    tags: String(d.tags||'').split(',').map(s=>s.trim()).filter(Boolean),
    screenshots: []
  };
  if (!p.title) return alert('Title required');
  if (!['ebook','video','app'].includes(p.type)) return alert('Type invalid');
  if (p.promo<0 || p.promo>100) return alert('Promo 0–100');
  try { await saveProduct(p); els.modal.close(); await render(); }
  catch(err){ console.error(err); alert('Save failed: ' + (err.message||err)); }
});

// ========= RENDER =========
function matchFilters(p){
  if (filter==='ebook' && p.type!=='ebook') return false;
  if (filter==='video' && p.type!=='video') return false;
  if (filter==='app' && p.type!=='app') return false;
  if (filter==='free' && !p.is_free) return false;
  if (filter==='promo' && !(Number(p.promo)>0)) return false;
  if (filter==='vip' && !p.is_vip) return false;
  if (q){
    const hay = [p.title,p.description,(p.tags||[]).join(' '),p.type].filter(Boolean).join(' ').toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}
function priceText(p){
  const base = p.is_free?0:Number(p.price||0);
  const promo = Number(p.promo||0);
  const final = Math.max(0, base - (base*promo)/100);
  if (final===0) return 'GRATUIT';
  if (promo>0 && final<base) return `$${final.toFixed(2)} (was $${base.toFixed(2)})`;
  return `$${base.toFixed(2)}`;
}
async function render(){
  const items = (await listProducts()).filter(matchFilters);
  els.grid.innerHTML=''; if (!items.length){ els.empty.hidden=false; return; } els.empty.hidden=true;
  for (const p of items){
    const card = document.createElement('div'); card.className='card';
    const thumb = document.createElement('div'); thumb.className='thumb'; if(p.image_url) thumb.style.backgroundImage=`url("${p.image_url}")`;
    const body = document.createElement('div'); body.className='card-body';
    const row = document.createElement('div'); row.className='title-row';
    const h = document.createElement('h4'); h.textContent = p.title;
    const badges = document.createElement('div');
    const btype = document.createElement('span'); btype.className='badge'; btype.textContent=p.type.toUpperCase(); badges.appendChild(btype);
    if (p.is_vip){ const b=document.createElement('span'); b.className='badge'; b.textContent='VIP'; badges.appendChild(b); }
    if (p.is_free){ const b=document.createElement('span'); b.className='badge'; b.textContent='FREE'; badges.appendChild(b); }
    if (p.type==='app' && p.platform){ const b=document.createElement('span'); b.className='badge'; b.textContent=p.platform.toUpperCase(); badges.appendChild(b); }
    row.append(h,badges);
    const desc = document.createElement('p'); desc.textContent = p.description||'';
    const price = document.createElement('div'); price.textContent = priceText(p);
    const actions = document.createElement('div'); actions.className='card-actions';
    const openBtn = document.createElement('a'); openBtn.className='btn'; openBtn.target='_blank'; openBtn.rel='noopener';
    if (p.type==='video' && p.media_url){ openBtn.textContent='Play'; openBtn.href=p.media_url; }
    else if (p.type==='ebook' && p.media_url?.toLowerCase().endsWith('.pdf')){ openBtn.textContent='Read PDF'; openBtn.href=p.media_url; }
    else if (p.type==='app' && p.file_url){ openBtn.textContent='Download'; openBtn.href=p.file_url; openBtn.setAttribute('download',''); }
    else { openBtn.textContent='Open'; openBtn.href=p.media_url || p.image_url || '#'; }
    actions.appendChild(openBtn);
    if (isOwner){
      const edit = document.createElement('button'); edit.className='btn'; edit.textContent='Edit'; edit.onclick=()=>openModal('edit', p.id, p);
      const del = document.createElement('button'); del.className='btn'; del.textContent='Delete'; del.onclick=async()=>{ if(confirm(`Supprimer "${p.title}" ?`)){ await removeProduct(p.id); await render(); } };
      actions.append(edit,del);
    }
    body.append(row,desc,price); card.append(thumb,body,actions); els.grid.appendChild(card);
  }
}

// ========= START =========
initAuth().then(render).catch(err => console.error('init error', err));
