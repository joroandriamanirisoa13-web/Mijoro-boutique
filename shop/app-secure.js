/* ================================
   Mijoro Boutique - app-secure.js
   Patch final avec login + owner-only + produit persistence
   ================================ */

const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';
const OWNER_EMAIL = 'joroandriamanirisoa13@gmail.com';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* -------------------------
   Elements DOM
------------------------- */
const loginBtn = document.getElementById('loginBtn');
const addBtn = document.getElementById('addBtn');
const grid = document.getElementById('grid');
const emptyMsg = document.getElementById('empty');
const modal = document.getElementById('modal');
const form = document.getElementById('form');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPass = document.getElementById('loginPass');
const closeLogin = document.getElementById('closeLogin');
const cancelLogin = document.getElementById('cancelLogin');

/* -------------------------
   State
------------------------- */
let user = null;
let products = [];

/* -------------------------
   Helpers
------------------------- */
function show(element){element.hidden = false;}
function hide(element){element.hidden = true;}
function isOwner(){return user && user.email === OWNER_EMAIL;}
function renderProducts(){
    grid.innerHTML = '';
    if(!products.length){
        show(emptyMsg);
        return;
    }
    hide(emptyMsg);
    products.forEach(p=>{
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="thumb" style="background-image:url('${p.image_url || ''}')"></div>
          <div class="card-body">
            <div class="title-row">
              <strong>${p.title}</strong>
              <span class="badge">${p.type}</span>
            </div>
            <p>${p.description || ''}</p>
          </div>
          <div class="card-actions">
            ${isOwner()?`<button class="btn edit" data-id="${p.id}">Edit</button>
            <button class="btn danger delete" data-id="${p.id}">Delete</button>`:''}
          </div>`;
        grid.appendChild(card);
    });
}

/* -------------------------
   Load products
------------------------- */
async function loadProducts(){
    const {data,error} = await supabase.from('products').select('*');
    if(error){console.error(error); return;}
    products = data;
    renderProducts();
}

/* -------------------------
   Login
------------------------- */
loginBtn.addEventListener('click',()=>loginModal.showModal());
closeLogin.addEventListener('click',()=>loginModal.close());
cancelLogin.addEventListener('click',()=>loginModal.close());

loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const email = loginEmail.value.trim();
    const pass = loginPass.value.trim();
    // Simple owner check
    if(email === OWNER_EMAIL && pass === 'ownerpassword'){ // <-- set your password
        user = {email};
        hide(loginBtn);
        show(addBtn);
        loginModal.close();
        loadProducts();
    } else {
        alert('Invalid credentials!');
    }
});

/* -------------------------
   Add / Edit produit
------------------------- */
addBtn.addEventListener('click',()=>{
    form.reset();
    modal.showModal();
});

form.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!isOwner()){alert('Only owner can save products'); return;}
    const fd = new FormData(form);
    const product = {};
    fd.forEach((v,k)=>{product[k]=v;});
    // convert checkbox values
    product.isVIP = fd.get('isVIP')==='on';
    product.isFree = fd.get('isFree')==='on';
    // save to supabase
    const {data,error} = await supabase.from('products').upsert(product).select();
    if(error){console.error(error); return;}
    products = data;
    renderProducts();
    modal.close();
});

/* -------------------------
   Delete
------------------------- */
grid.addEventListener('click',async e=>{
    if(e.target.classList.contains('delete')){
        if(!isOwner()) return;
        const id = e.target.dataset.id;
        const {error} = await supabase.from('products').delete().eq('id',id);
        if(error){console.error(error); return;}
        products = products.filter(p=>p.id!=id);
        renderProducts();
    } else if(e.target.classList.contains('edit')){
        const id = e.target.dataset.id;
        const p = products.find(x=>x.id==id);
        if(!p) return;
        // populate form
        for(let key in p){
            const input = form.querySelector(`[name=${key}]`);
            if(input){
                if(input.type==='checkbox') input.checked = p[key];
                else input.value = p[key];
            }
        }
        modal.showModal();
    }
});

/* -------------------------
   Init
------------------------- */
loadProducts();/* -------------------------
   Filters & search
------------------------- */
const chips = document.querySelectorAll('.chip');
const searchInput = document.getElementById('searchInput');
const resetFilters = document.getElementById('resetFilters');

function applyFilters() {
    const filterType = document.querySelector('.chip.active').dataset.filter;
    const search = searchInput.value.trim().toLowerCase();

    const filtered = products.filter(p=>{
        const matchesType = filterType==='all' || p.type===filterType || (filterType==='free' && p.isFree) || (filterType==='vip' && p.isVIP) || (filterType==='promo' && parseFloat(p.promo)>0);
        const matchesSearch = !search || p.title.toLowerCase().includes(search) || (p.tags && p.tags.toLowerCase().includes(search));
        return matchesType && matchesSearch;
    });

    grid.innerHTML = '';
    if(!filtered.length){
        show(emptyMsg);
        return;
    }
    hide(emptyMsg);

    filtered.forEach(p=>{
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
          <div class="thumb" style="background-image:url('${p.image_url || ''}')"></div>
          <div class="card-body">
            <div class="title-row">
              <strong>${p.title}</strong>
              <span class="badge">${p.type}</span>
              ${p.isFree?'<span class="badge">Free</span>':''}
              ${p.isVIP?'<span class="badge">VIP</span>':''}
              ${p.promo>0?`<span class="badge">${p.promo}% Off</span>`:''}
            </div>
            <p>${p.description || ''}</p>
            ${p.media_url ? `<div class="preview">${p.media_url.endsWith('.pdf') ? `<a href="${p.media_url}" target="_blank">Preview PDF</a>` : `<video src="${p.media_url}" controls width="100%"></video>`}</div>` : ''}
          </div>
          <div class="card-actions">
            ${isOwner()?`<button class="btn edit" data-id="${p.id}">Edit</button>
            <button class="btn danger delete" data-id="${p.id}">Delete</button>`:''}
          </div>`;
        grid.appendChild(card);
    });
}

/* -------------------------
   Event listeners filters/search
------------------------- */
chips.forEach(chip=>{
    chip.addEventListener('click',()=>{
        chips.forEach(c=>c.classList.remove('active'));
        chip.classList.add('active');
        applyFilters();
    });
});

searchInput.addEventListener('input',applyFilters);
resetFilters.addEventListener('click',()=>{
    searchInput.value = '';
    chips.forEach(c=>c.classList.remove('active'));
    document.querySelector('.chip[data-filter="all"]').classList.add('active');
    applyFilters();
});

/* -------------------------
   Initial render with filters
------------------------- */
applyFilters();