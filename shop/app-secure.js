// ========= DEBUG =========
window.addEventListener('error', (e) => {
  console.error('JS error:', e?.message || e);
});

// ========= CONFIG =========
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw'; // Fenoy ny public anon key
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

const BUCKET_MEDIA = 'Media';
const BUCKET_APPS = 'apps';

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

// ========= AUTH + SESSION PERSISTENCE =========
async function initAuth() {
  try {
    const { data: { session: s } } = await supabase.auth.getSession();
    session = s;
  } catch (e) {
    console.error('getSession error:', e.message);
  }

  computeIsOwner();
  reflectUI();

  // Mamerina miara-miasa amin'ny auth state change
  supabase.auth.onAuthStateChange((_event, s) => {
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
  if (!els.loginBtn) return console.warn('loginBtn tsy hita ao amin HTML');
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (els.addBtn) els.addBtn.hidden = !isOwner;
}

// Login / Logout
els.loginBtn?.addEventListener('click', async () => {
  if (session) {
    await supabase.auth.signOut();
    session = null;
    reflectUI();
    return;
  }

  const supportsDialog = !!(loginModal && loginModal.showModal);
  if (!supportsDialog) {
    const email = prompt('Owner email:', OWNER_EMAIL);
    const password = prompt('Password:');
    if (!email || !password) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Login failed: ' + error.message);
    return;
  }

  loginEmail.value = OWNER_EMAIL;
  loginPass.value = '';
  loginModal.showModal();
});

closeLogin?.addEventListener('click', () => loginModal?.close());
cancelLogin?.addEventListener('click', () => loginModal?.close());

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (loginEmail?.value || '').trim();
  const password = loginPass?.value || '';
  if (!email || !password) { alert('Fenoy email sy password'); return; }

  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login failed: ' + error.message);
  } else {
    session = data.session;
    computeIsOwner();
    reflectUI();
    loginModal?.close();
    render();
    alert('Logged in as: ' + (session?.user?.email || 'unknown'));
  }
});

// Call initAuth on page load
initAuth().then(render);// ========= DB HELPERS =========
async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('listProducts error:', error.message); return []; }
  return data || [];
}

async function saveProduct(p) {
  if (!isOwner || !session) { alert('Owner only'); return; }
  const payload = {
    title: p.title, type: p.type, is_free: p.is_free,
    price: p.price, promo: p.promo, is_vip: p.is_vip,
    image_url: p.image_url || null, media_url: p.media_url || null,
    description: p.description || null, tags: p.tags || [],
    platform: p.platform || null, version: p.version || null,
    build_number: p.build_number || null,
    file_url: p.file_url || null, file_size: p.file_size || null,
    file_type: p.file_type || null,
    screenshots: p.screenshots || [],
    owner: session.user.id
  };
  let err;
  if (p.id) {
    ({ error: err } = await supabase.from('products').update(payload).eq('id', p.id));
  } else {
    ({ error: err } = await supabase.from('products').insert(payload));
  }
  if (err) alert('Save product error: ' + err.message);
}

async function removeProduct(id) {
  if (!isOwner || !session) { alert('Owner only'); return; }
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) alert('Delete error: ' + error.message);
}

// ========= STORAGE (UPLOADS) =========
async function uploadToBucket(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
async function uploadImage(file) {
  const path = `images/${Date.now()}-${file.name}`;
  return uploadToBucket(BUCKET_MEDIA, path, file);
}
async function uploadMedia(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const folder = ext === 'pdf' ? 'pdfs' : 'videos';
  const path = `${folder}/${Date.now()}-${file.name}`;
  return uploadToBucket(BUCKET_MEDIA, path, file);
}
async function uploadAppFile(file) {
  const path = `binaries/${Date.now()}-${file.name}`;
  const url = await uploadToBucket(BUCKET_APPS, path, file);
  return { url, size: file.size, type: file.type || 'application/octet-stream' };
}

// ========= FILE INPUT EVENTS =========
els.imageFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const url = await uploadImage(f);
    els.form.elements['image_url'].value = url;
  } catch (err){ alert('Image upload failed: ' + err.message); }
});
els.mediaFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const url = await uploadMedia(f);
    els.form.elements['media_url'].value = url;
  } catch (err){ alert('Media upload failed: ' + err.message); }
});
els.appFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const info = await uploadAppFile(f);
    els.form.elements['file_url'].value = info.url;
    els.form.elements['file_type'].value = info.type;
    els.form.elements['file_size'].value = info.size;
  } catch (err){ alert('App file upload failed: ' + err.message); }
});

// ========= MODAL ADD/EDIT =========
document.getElementById('addBtn')?.addEventListener('click', () => openModal('add'));
els.closeBtn?.addEventListener('click', () => els.modal.close());
els.cancelBtn?.addEventListener('click', () => els.modal.close());

function openModal(mode='add', id=null, product=null) {
  els.form.reset(); els.form.dataset.mode = mode;
  document.getElementById('modalTitle').textContent = mode==='edit' ? 'Edit product' : 'Add product';
  if (product) {
    const f = els.form.elements;
    f['id'].value = product.id; f['title'].value = product.title||'';
    f['type'].value = product.type||'ebook';
    f['isFree'].checked = !!product.is_free; f['price'].value = Number(product.price||0);
    f['promo'].value = Number(product.promo||0); f['isVIP'].checked = !!product.is_vip;
    f['image_url'].value = product.image_url||''; f['media_url'].value = product.media_url||'';
    f['platform'].value = product.platform||''; f['version'].value = product.version||'';
    f['build_number'].value = product.build_number||''; f['file_url'].value = product.file_url||'';
    f['file_type'].value = product.file_type||''; f['file_size'].value = product.file_size||'';
    f['description'].value = product.description||'';
    f['tags'].value = (product.tags||[]).join(', ');
  } else { els.form.elements['price'].value = 0; els.form.elements['promo'].value = 0; }

  const sync = () => {
    const isFree = els.form.elements['isFree'].checked;
    els.form.elements['price'].disabled = isFree;
    if (isFree) els.form.elements['price'].value = 0;
  };
  els.form.elements['isFree'].addEventListener('change', sync, { once:true });
  sync();
  els.modal.showModal();
}

// ========= FORM SUBMIT =========
els.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!isOwner) return alert('Owner only');
  const fd = new FormData(els.form);
  const d = Object.fromEntries(fd.entries());
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
  await saveProduct(p);
  els.modal.close();
  await render();
});

// ========= RENDER LOGIC =========
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
  const base = p.is_free ? 0 : Number(p.price||0);
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

    const titleRow = document.createElement('div'); titleRow.className='title-row';
    const h3 = document.createElement('h3'); h3.textContent = p.title;
    titleRow.appendChild(h3);

    // Badges
    if(p.is_free){ const b=document.createElement('span'); b.className='badge'; b.textContent='FREE'; titleRow.appendChild(b);}
    if(p.promo>0){ const b=document.createElement('span'); b.className='badge'; b.textContent=`Promo ${p.promo}%`; titleRow.appendChild(b);}
    if(p.is_vip){ const b=document.createElement('span'); b.className='badge'; b.textContent='VIP'; titleRow.appendChild(b);}
    body.appendChild(titleRow);

    // Description
    if(p.description){ const d=document.createElement('p'); d.textContent=p.description; d.style.fontSize='13px'; d.style.marginTop='6px'; body.appendChild(d);}

    // Price
    const priceEl = document.createElement('p'); priceEl.style.marginTop='6px';
    priceEl.style.fontWeight='600'; priceEl.textContent = priceText(p);
    body.appendChild(priceEl);

    // Media Preview
    if(p.media_url){
      const ext = (p.media_url.split('.').pop()||'').toLowerCase();
      if(['mp4','webm','ogg'].includes(ext)){
        const vid = document.createElement('video'); vid.src=p.media_url; vid.controls=true; vid.style.width='100%'; vid.style.marginTop='8px'; body.appendChild(vid);
      } else if(ext==='pdf'){
        const a = document.createElement('a'); a.href=p.media_url; a.textContent='View PDF'; a.target='_blank'; body.appendChild(a);
      }
    }

    // Tags
    if(p.tags?.length){
      const tags = document.createElement('p'); tags.style.marginTop='6px'; tags.style.fontSize='12px';
      tags.textContent = 'Tags: ' + p.tags.join(', '); body.appendChild(tags);
    }

    const actions = document.createElement('div'); actions.className='card-actions';
    if(isOwner){
      const editBtn = document.createElement('button'); editBtn.className='btn'; editBtn.textContent='Edit';
      editBtn.addEventListener('click', ()=>openModal('edit', p.id, p));
      const delBtn = document.createElement('button'); delBtn.className='btn danger'; delBtn.textContent='Delete';
      delBtn.addEventListener('click', async()=>{ if(confirm('Delete?')){ await removeProduct(p.id); render(); }});
      actions.appendChild(editBtn); actions.appendChild(delBtn);
    }
    card.appendChild(thumb); card.appendChild(body); card.appendChild(actions);
    els.grid.appendChild(card);
  }
}

// ========= FILTERS & SEARCH =========
let filter='all', q='';
els.chips?.forEach(c=>{
  c.addEventListener('click', ()=>{
    els.chips.forEach(ch=>ch.classList.remove('active'));
    c.classList.add('active'); filter = c.dataset.filter; render();
  });
});
els.searchInput?.addEventListener('input', (e)=>{ q=e.target.value.toLowerCase(); render(); });
els.resetFilters?.addEventListener('click', ()=>{
  q=''; filter='all'; els.searchInput.value='';
  els.chips.forEach(ch=>ch.classList.remove('active'));
  els.chips[0]?.classList.add('active');
  render();
});

// ========= INIT =========
(async function init(){
  await checkSession();
  await render();
})();