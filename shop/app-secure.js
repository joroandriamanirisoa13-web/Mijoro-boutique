// ========= DEBUG =========
window.addEventListener('error', e => console.error('JS error:', e?.message || e));

// ========= CONFIG =========
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

// Buckets
const BUCKET_MEDIA = 'Media';
const BUCKET_APPS  = 'apps';

// ========= INIT =========
if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('APETRAHO')) {
  alert("Fenoy ny SUPABASE_ANON_KEY ao amin'ny app-secure.js");
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
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (e) { console.error('getSession error:', e); }
  computeIsOwner();
  reflectUI();
  render();

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
  if (!els.loginBtn) return console.warn('loginBtn tsy hita ao amin\'ny HTML');
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (els.addBtn) els.addBtn.hidden = !isOwner;
}

// Open/close login modal
els.loginBtn?.addEventListener('click', async () => {
  if (session) {
    await supabase.auth.signOut();
    return;
  }
  loginEmail.value = OWNER_EMAIL;
  loginPass.value = '';
  loginModal?.showModal();
});
closeLogin?.addEventListener('click', () => loginModal?.close());
cancelLogin?.addEventListener('click', () => loginModal?.close());

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPass.value || '';
  if (!email || !password) { alert('Fenoy email sy password'); return; }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) alert('Login failed: ' + error.message);
  else loginModal?.close();
});

// ========= DB HELPERS =========
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
    platform: p.platform || null, version: p.version || null, build_number: p.build_number || null,
    file_url: p.file_url || null, file_size: p.file_size || null, file_type: p.file_type || null,
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

// ========= STORAGE (UPLOADS) =========
async function uploadToBucket(bucket, path, file) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
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

els.imageFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { const url = await uploadImage(f); els.form.elements['image_url'].value = url; } 
  catch(err){ alert('Upload failed: ' + err.message); }
});
els.mediaFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { const url = await uploadMedia(f); els.form.elements['media_url'].value = url; } 
  catch(err){ alert('Upload failed: ' + err.message); }
});
els.appFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { 
    const info = await uploadAppFile(f);
    els.form.elements['file_url'].value = info.url;
    els.form.elements['file_type'].value = info.type;
    els.form.elements['file_size'].value = info.size;
  } 
  catch(err){ alert('Upload failed: ' + err.message); }
});// ========= RENDER =========
async function render() {
  let products = await listProducts();

  // Apply search & filter
  if (filter !== 'all') products = products.filter(p => p.type === filter || (filter === 'free' && p.is_free) || (filter === 'promo' && p.promo > 0) || (filter === 'vip' && p.is_vip));
  if (q) products = products.filter(p => (p.title||'').toLowerCase().includes(q) || (p.tags||[]).some(t => t.toLowerCase().includes(q)));

  els.grid.innerHTML = '';
  if (!products.length) { els.empty.hidden = false; return; }
  els.empty.hidden = true;

  products.forEach(p => {
    const card = document.createElement('div'); card.className = 'card';
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    if (p.image_url) thumb.style.backgroundImage = `url(${p.image_url})`;
    card.appendChild(thumb);

    const body = document.createElement('div'); body.className = 'card-body';
    const titleRow = document.createElement('div'); titleRow.className = 'title-row';
    const h3 = document.createElement('h3'); h3.textContent = p.title;
    titleRow.appendChild(h3);

    // badges
    const badgeContainer = document.createElement('div');
    if (p.is_free) { const b = document.createElement('span'); b.className='badge'; b.textContent='Free'; badgeContainer.appendChild(b);}
    if (p.promo) { const b = document.createElement('span'); b.className='badge'; b.textContent=`Promo ${p.promo}%`; badgeContainer.appendChild(b);}
    if (p.is_vip) { const b = document.createElement('span'); b.className='badge'; b.textContent='VIP'; badgeContainer.appendChild(b);}
    titleRow.appendChild(badgeContainer);

    body.appendChild(titleRow);

    const desc = document.createElement('p'); desc.textContent = p.description || '';
    body.appendChild(desc);

    // media preview
    if (p.media_url) {
      const ext = p.media_url.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        const a = document.createElement('a'); a.href=p.media_url; a.textContent='View PDF'; a.target='_blank'; body.appendChild(a);
      } else {
        const video = document.createElement('video'); video.src=p.media_url; video.controls=true; video.style.width='100%'; body.appendChild(video);
      }
    }

    // tags
    if (p.tags && p.tags.length) {
      const tagRow = document.createElement('div'); tagRow.style.marginTop='6px';
      p.tags.forEach(t => { const s=document.createElement('span'); s.className='badge'; s.textContent=t; tagRow.appendChild(s); });
      body.appendChild(tagRow);
    }

    card.appendChild(body);

    // actions
    if (isOwner) {
      const actions = document.createElement('div'); actions.className='card-actions';
      const editBtn = document.createElement('button'); editBtn.className='btn'; editBtn.textContent='Edit';
      editBtn.addEventListener('click',()=>openEditModal(p));
      actions.appendChild(editBtn);
      card.appendChild(actions);
    }

    els.grid.appendChild(card);
  });
}

// ========= MODAL =========
els.addBtn?.addEventListener('click',()=>openEditModal());
els.closeBtn?.addEventListener('click',()=>els.modal.close());
els.cancelBtn?.addEventListener('click',()=>els.modal.close());

els.form?.addEventListener('submit', async e => {
  e.preventDefault();
  const f = els.form.elements;
  const product = {
    id: f['id'].value || null,
    title: f['title'].value,
    type: f['type'].value,
    is_free: f['isFree'].checked,
    price: parseFloat(f['price'].value)||0,
    promo: parseInt(f['promo'].value)||0,
    is_vip: f['isVIP'].checked,
    image_url: f['image_url'].value,
    media_url: f['media_url'].value,
    description: f['description'].value,
    tags: (f['tags'].value||'').split(',').map(t=>t.trim()).filter(Boolean),
    platform: f['platform'].value,
    version: f['version'].value,
    build_number: f['build_number'].value,
    file_url: f['file_url'].value,
    file_type: f['file_type'].value,
    file_size: f['file_size'].value
  };
  await saveProduct(product);
  els.modal.close();
  render();
});

function openEditModal(p=null){
  const f=els.form.elements;
  els.modal.showModal();
  if(!p){ els.form.reset(); f['id'].value=''; f['price'].value='0'; f['promo'].value='0'; return; }
  f['id'].value = p.id||'';
  f['title'].value = p.title||'';
  f['type'].value = p.type||'ebook';
  f['isFree'].checked = p.is_free||false;
  f['price'].value = p.price||0;
  f['promo'].value = p.promo||0;
  f['isVIP'].checked = p.is_vip||false;
  f['image_url'].value = p.image_url||'';
  f['media_url'].value = p.media_url||'';
  f['description'].value = p.description||'';
  f['tags'].value = (p.tags||[]).join(', ');
  f['platform'].value = p.platform||'';
  f['version'].value = p.version||'';
  f['build_number'].value = p.build_number||'';
  f['file_url'].value = p.file_url||'';
  f['file_type'].value = p.file_type||'';
  f['file_size'].value = p.file_size||'';
}

// ========= FILTERS & SEARCH =========
els.chips.forEach(chip=>{
  chip.addEventListener('click',()=>{
    els.chips.forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    filter = chip.dataset.filter;
    render();
  });
});
els.search?.addEventListener('input',()=>{ q=els.search.value.toLowerCase(); render(); });
document.getElementById('resetFilters')?.addEventListener('click',()=>{
  filter='all'; q=''; els.search.value=''; els.chips.forEach(c=>c.classList.remove('active'));
  els.chips.find(c=>c.dataset.filter==='all')?.classList.add('active');
  render();
});

// ========= INIT =========
initAuth();
render();