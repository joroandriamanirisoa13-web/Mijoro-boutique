// ========== CONFIG ==========
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY ='YOUR_PUBLIC_ANON_KEY_HERE'; // Fenoy!
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

const BUCKET_MEDIA = 'Media';
const BUCKET_APPS  = 'apps';

// ========== INIT ==========
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
  appFile: document.getElementById('appFile')
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

// ========== AUTH ==========
async function initAuth() {
  const { data } = await supabase.auth.getSession();
  session = data?.session || null;
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
  isOwner = session?.user?.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

function reflectUI() {
  els.loginBtn.textContent = session ? '🔓 Logout' : '🔒 Login';
  if (els.addBtn) els.addBtn.hidden = !isOwner;
}

els.loginBtn?.addEventListener('click', async () => {
  if (session) return supabase.auth.signOut();
  loginEmail.value = OWNER_EMAIL;
  loginPass.value = '';
  loginModal?.showModal();
});
closeLogin?.addEventListener('click', () => loginModal?.close());
cancelLogin?.addEventListener('click', () => loginModal?.close());

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPass.value;
  if (!email || !password) return alert('Fenoy email sy password');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert('Login failed: ' + error.message);
  loginModal?.close();
});

// ========== DB HELPERS ==========
async function listProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return alert('listProducts error: ' + error.message), [];
  return data || [];
}

async function saveProduct(p) {
  if (!isOwner) return alert('Owner only');
  const payload = {
    title: p.title, type: p.type, is_free: p.is_free, price: p.price, promo: p.promo,
    is_vip: p.is_vip, image_url: p.image_url || null, media_url: p.media_url || null,
    description: p.description || null, tags: p.tags || [], platform: p.platform || null,
    version: p.version || null, build_number: p.build_number || null,
    file_url: p.file_url || null, file_size: p.file_size || null, file_type: p.file_type || null,
    owner: session.user.id
  };
  let err;
  if (p.id) {
    ({ error: err } = await supabase.from('products').update(payload).eq('id', p.id));
  } else {
    ({ error: err } = await supabase.from('products').insert(payload));
  }
  if (err) return alert('Save product error: ' + err.message);
}

// Delete product
async function removeProduct(id) {
  if (!isOwner) return alert('Owner only');
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) alert('Delete error: ' + error.message);
}

// ========== STORAGE ==========
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
  const folder = file.name.toLowerCase().endsWith('.pdf') ? 'pdfs' : 'videos';
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
  try { els.form.elements['image_url'].value = await uploadImage(f); } 
  catch (err){ alert('Upload failed: ' + err.message); }
});
els.mediaFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try { els.form.elements['media_url'].value = await uploadMedia(f); }
  catch (err){ alert('Upload failed: ' + err.message); }
});
els.appFile?.addEventListener('change', async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  try {
    const info = await uploadAppFile(f);
    els.form.elements['file_url'].value = info.url;
    els.form.elements['file_type'].value = info.type;
    els.form.elements['file_size'].value = info.size;
  } catch(err){ alert('Upload failed: ' + err.message); }
});

// ========== FILTERS + SEARCH ==========
els.chips.forEach(c => c.addEventListener('click', () => {
  els.chips.forEach(x => x.classList.remove('active'));
  c.classList.add('active');
  filter = c.dataset.filter || 'all';
  render();
}));
let st; 
els.search?.addEventListener('input', () => {
  clearTimeout(st);
  st = setTimeout(()=>{ q = els.search.value.trim().toLowerCase(); render(); }, 150);
});

// ========== MODAL ADD/EDIT ==========
els.addBtn?.addEventListener('click', () => openModal('add'));
els.closeBtn?.addEventListener('click', () => els.modal.close());
els.cancelBtn?.addEventListener('click', () => els.modal.close());

function openModal(mode='add', id=null, product=null){
  els.form.reset();
  els.form.dataset.mode = mode;
  document.getElementById('modalTitle').textContent = mode==='edit'?'Edit product':'Add product';
  if(product){
    const f = els.form.elements;
    f['id'].value = product.id;
    f['title'].value = product.title||'';
    f['type'].value = product.type||'ebook';
    f['isFree'].checked = !!product.is_free;
    f['price'].value = Number(product.price||0);
    f['promo'].value = Number(product.promo||0);
    f['isVIP'].checked = !!product.is_vip;
    f['image_url'].value = product.image_url||'';
    f['media_url'].value = product.media_url||'';
    f['platform'].value = product.platform||'';
    f['version'].value = product.version||'';
    f['build_number'].value = product.build_number||'';
    f['file_url'].value = product.file_url||'';
    f['file_type'].value = product.file_type||'';
    f['file_size'].value = product.file_size||'';
    f['description'].value = product.description||'';
    f['tags'].value = (product.tags||[]).join(', ');
  }
  els.modal.showModal();
}

els.form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if(!isOwner) return alert('Owner only');
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
    tags: String(d.tags||'').split(',').map(s=>s.trim()).filter(Boolean)
  };
  if(!p.title) return alert('Title required');
  await saveProduct(p);
  els.modal.close();
  render(); // <<== FIXED: rerender immediately
});

// ========== RENDER ==========
function matchFilters(p){
  if(filter==='ebook' && p.type!=='ebook') return false;
  if(filter==='video' && p.type!=='video') return false;
  if(filter==='app' && p.type!=='app') return false;
  if(filter==='free' && !p.is_free) return false;
  if(filter==='promo' && !(Number(p.promo)>0)) return false;
  if(filter==='vip' && !p.is_vip) return false;
  if(q){
    const hay = [p.title,p.description,(p.tags||[]).join(' '),p.type].filter(Boolean).join(' ').toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

function priceText(p){
  const base = p.is_free?0:Number(p.price||0);
  const promo = Number(p.promo||0);
  const final = Math.max(0, base - (base*promo)/100);
  if(final===0) return 'GRATUIT';
  if(promo>0 && final<base) return `$${final.toFixed(2)} (was $${base.toFixed(2)})`;return `$${final.toFixed(2)} (was $${base.toFixed(2)})`;
}

// create card element
function createCard(p){
  const card = document.createElement('div');
  card.className = 'card';

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  if(p.image_url) thumb.style.backgroundImage = `url(${p.image_url})`;
  card.appendChild(thumb);

  const body = document.createElement('div');
  body.className = 'card-body';

  const titleRow = document.createElement('div');
  titleRow.className = 'title-row';
  const title = document.createElement('strong');
  title.textContent = p.title || 'Untitled';
  titleRow.appendChild(title);

  if(p.is_vip) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'VIP';
    titleRow.appendChild(badge);
  }
  body.appendChild(titleRow);

  const desc = document.createElement('p');
  desc.textContent = p.description || '';
  body.appendChild(desc);

  const price = document.createElement('p');
  price.style.fontWeight = 'bold';
  price.textContent = priceText(p);
  body.appendChild(price);

  card.appendChild(body);

  if(isOwner){
    const actions = document.createElement('div');
    actions.className = 'card-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openModal('edit', p.id, p));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      if(confirm('Confirm delete?')) {
        await removeProduct(p.id);
        render();
      }
    });
    actions.appendChild(delBtn);

    card.appendChild(actions);
  }

  return card;
}

// main render
async function render(){
  const all = await listProducts();
  const filtered = all.filter(matchFilters);
  els.grid.innerHTML = '';
  if(!filtered.length){
    els.empty.hidden = false;
    return;
  }
  els.empty.hidden = true;
  filtered.forEach(p => els.grid.appendChild(createCard(p)));
}

// ========== INIT ==========
initAuth();
render();