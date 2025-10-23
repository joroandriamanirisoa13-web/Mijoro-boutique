// shop/app-secure.js
// Configuration Supabase - OVAO IREO CREDENTIALS IREO!
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';

// Initialiser Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State global
let currentUser = null;

// ==================== STORAGE SETUP ====================

async function setupStorage() {
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.warn('Cannot list buckets:', error.message);
            return;
        }

        const bucketNames = buckets.map(bucket => bucket.name);
        console.log('Available buckets:', bucketNames);
        
        // Utiliser "Media" exactement comme dans Supabase
        const targetBucket = 'Media';
        
        if (!bucketNames.includes(targetBucket)) {
            const { error: createError } = await supabase.storage.createBucket(targetBucket, {
                public: true,
                fileSizeLimit: 524288000 // 500MB
            });
            if (createError) {
                console.warn('Cannot create bucket:', createError.message);
                return;
            }
            console.log('Bucket "Media" created successfully');
        } else {
            console.log('Bucket "Media" already exists');
        }
        
    } catch (error) {
        console.warn('Storage setup warning:', error.message);
    }
}

// ==================== PRÉVISUALISATION AVANCÉE ====================

// Prévisualisation PDF avec PDF.js
async function setupPdfPreview(file) {
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);
            
            // Charger le PDF avec PDF.js
            pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
                // Récupérer la première page
                pdf.getPage(1).then(function(page) {
                    const viewport = page.getViewport({ scale: 1.5 });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    const renderContext = {
                        canvasContext: context,
                        viewport: viewport
                    };

                    page.render(renderContext).promise.then(function() {
                        resolve(canvas.toDataURL());
                    });
                });
            });
        };
        fileReader.readAsArrayBuffer(file);
    });
}

// Prévisualisation Vidéo
function setupVideoPreview(file) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(file);
        video.controls = true;
        video.style.width = '100%';
        video.style.maxHeight = '300px';
        video.addEventListener('loadeddata', () => {
            resolve(video);
        });
    });
}

// Gestionnaire de prévisualisation
async function handleFilePreview(file) {
    const previewSection = document.getElementById('previewSection');
    const previewContent = document.getElementById('previewContent');
    
    previewSection.classList.remove('hidden');
    previewContent.innerHTML = '<div class="text-center">Loading preview...</div>';

    try {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewContent.innerHTML = `
                    <img src="${e.target.result}" style="max-width: 100%; border-radius: 8px;" alt="Preview">
                    <p class="text-center mt-2">${file.name}</p>
                `;
            };
            reader.readAsDataURL(file);
        }
        else if (file.type === 'application/pdf') {
            const previewData = await setupPdfPreview(file);
            previewContent.innerHTML = `
                <img src="${previewData}" style="max-width: 100%; border-radius: 8px;" alt="PDF Preview">
                <p class="text-center mt-2">${file.name} (PDF Preview - Page 1)</p>
            `;
        }
        else if (file.type.startsWith('video/')) {
            const videoElement = await setupVideoPreview(file);
            previewContent.innerHTML = '';
            previewContent.appendChild(videoElement);
            const info = document.createElement('p');
            info.className = 'text-center mt-2';
            info.textContent = `${file.name}`;
            previewContent.appendChild(info);
        }
        else if (file.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.controls = true;
            audio.style.width = '100%';
            previewContent.innerHTML = '';
            previewContent.appendChild(audio);
            const info = document.createElement('p');
            info.className = 'text-center mt-2';
            info.textContent = `${file.name}`;
            previewContent.appendChild(info);
        }
        else {
            previewContent.innerHTML = `
                <div class="text-center">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
                    <p><strong>File:</strong> ${file.name}</p>
                    <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
                    <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Preview error:', error);
        previewContent.innerHTML = `
            <div class="text-center text-error">
                <p>Cannot generate preview for this file type</p>
                <p><strong>File:</strong> ${file.name}</p>
            </div>
        `;
    }
}

// ==================== MODAL FUNCTIONS ====================

function showLoginForm() {
    document.getElementById('loginModal').classList.remove('hidden');
    document.getElementById('signupModal').classList.add('hidden');
}

function hideLoginForm() {
    document.getElementById('loginModal').classList.add('hidden');
}

function showSignupForm() {
    document.getElementById('signupModal').classList.remove('hidden');
    document.getElementById('loginModal').classList.add('hidden');
}

function hideSignupForm() {
    document.getElementById('signupModal').classList.add('hidden');
}

// ==================== AUTHENTICATION EMAIL ====================

async function loginWithEmail() {
    try {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            throw new Error('Please enter both email and password');
        }

        showLoading('Signing in...');

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        hideLoginForm();
        showAlert('Login successful!', 'success');

    } catch (error) {
        showAlert('Login failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function signUpWithEmail() {
    try {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;

        if (!email || !password) {
            throw new Error('Please enter both email and password');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        showLoading('Creating account...');

        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) throw error;

        hideSignupForm();
        
        if (data.user && !data.user.identities?.length) {
            showAlert('Account created! Please check your email to confirm your account.', 'success');
        } else {
            showAlert('Account created successfully! You can now login.', 'success');
        }

    } catch (error) {
        showAlert('Signup failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function signOut() {
    try {
        showLoading('Logging out...');
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        showAlert('Logged out successfully', 'success');
    } catch (error) {
        showAlert('Logout failed: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting user:', error);
        return null;
    }
    return user;
}

// ==================== PRODUCT MANAGEMENT ====================

async function addProduct(productData) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('products')
        .insert([
            {
                ...productData,
                owner_id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ])
        .select();

    if (error) throw error;
    return data;
}

async function getUserProducts() {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

async function updateProduct(productId, updates) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: product } = await supabase
        .from('products')
        .select('owner_id')
        .eq('id', productId)
        .single();

    if (!product || product.owner_id !== user.id) {
        throw new Error('Not authorized to update this product');
    }

    const { data, error } = await supabase
        .from('products')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select();

    if (error) throw error;
    return data;
}

async function deleteProduct(productId) {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const { data: product } = await supabase
        .from('products')
        .select('owner_id')
        .eq('id', productId)
        .single();

    if (!product || product.owner_id !== user.id) {
        throw new Error('Not authorized to delete this product');
    }

    const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

    if (error) throw error;
}

// ==================== FILE UPLOAD ====================

async function uploadFile(file, folder = 'product-files') {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('Media')
            .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('Media')
            .getPublicUrl(filePath);

        return { path: filePath, url: publicUrl };
    } catch (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }
}

function validateFile(file, options = {}) {
    const {
        maxSize = 500 * 1024 * 1024, // 500MB par défaut
        allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/zip', 
            'video/mp4', 'video/avi', 'video/mkv', 'video/mov', 'video/wmv',
            'audio/mp3', 'audio/wav', 'audio/m4a',
            'application/vnd.android.package-archive',
            'application/octet-stream'
        ],
        allowedExtensions = [
            '.jpg', '.jpeg', '.png', '.gif', '.webp',
            '.pdf', '.zip', '.rar', '.7z',
            '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv',
            '.mp3', '.wav', '.m4a', '.flac',
            '.apk', '.ipa', '.exe', '.iso', '.dmg'
        ]
    } = options;

    if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    if (file.type && !allowedTypes.includes(file.type) && file.type !== '') {
        throw new Error('File type not allowed');
    }

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('File extension not allowed');
    }

    return true;
}

function validateProductData(productData) {
    const errors = [];

    if (!productData.title?.trim()) {
        errors.push('Product title is required');
    }

    if (!productData.type) {
        errors.push('Product type is required');
    }

    if (productData.type === 'app' && !productData.platform) {
        errors.push('Platform is required for App/Jeux');
    }

    if (productData.type !== 'app' && !productData.platform) {
        productData.platform = 'web';
    }

    if (productData.price < 0) {
        errors.push('Price cannot be negative');
    }

    if (productData.promo < 0) {
        errors.push('Promo price cannot be negative');
    }

    if (productData.is_free && productData.price > 0) {
        errors.push('Free products must have price 0');
    }

    return errors;
}

// ==================== UI MANAGEMENT ====================

function toggleProductForm() {
    const form = document.getElementById('productForm');
    form.classList.toggle('hidden');
    
    if (!form.classList.contains('hidden')) {
        document.getElementById('productTitle').value = '';
        document.getElementById('productType').value = '';
        document.getElementById('productPrice').value = '0';
        document.getElementById('productPlatform').value = '';
        document.getElementById('productVersion').value = '';
        document.getElementById('productBuildNumber').value = '';
        document.getElementById('productPromoPrice').value = '';
        document.getElementById('productIsVip').checked = false;
        document.getElementById('productIsFree').checked = false;
        document.getElementById('productDescription').value = '';
        document.getElementById('productImage').value = '';
        document.getElementById('productFile').value = '';
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('filePreview').innerHTML = '';
        document.getElementById('previewSection').classList.add('hidden');
        document.getElementById('imagePreview').classList.add('hidden');
    }
}

async function submitProduct() {
    try {
        showLoading('Adding product...');

        const productData = {
            title: document.getElementById('productTitle').value.trim(),
            type: document.getElementById('productType').value,
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            platform: document.getElementById('productPlatform').value,
            description: document.getElementById('productDescription').value.trim(),
            version: document.getElementById('productVersion').value.trim(),
            build_number: document.getElementById('productBuildNumber').value.trim(),
            promo: parseFloat(document.getElementById('productPromoPrice').value) || 0,
            is_vip: document.getElementById('productIsVip').checked,
            is_free: document.getElementById('productIsFree').checked
        };

        const errors = validateProductData(productData);
        if (errors.length > 0) {
            throw new Error('Validation errors:\n' + errors.join('\n'));
        }

        const imageFile = document.getElementById('productImage').files[0];
        if (imageFile) {
            validateFile(imageFile, { 
                maxSize: 500 * 1024 * 1024,
                allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            });
            try {
                const imageUpload = await uploadFile(imageFile, 'product-images');
                productData.img_url = imageUpload.url;
            } catch (uploadError) {
                console.warn('Image upload failed:', uploadError.message);
            }
        }

        const productFile = document.getElementById('productFile').files[0];
        if (productFile) {
            validateFile(productFile, {
                maxSize: 500 * 1024 * 1024
            });
            try {
                const fileUpload = await uploadFile(productFile, 'product-files');
                productData.file_url = fileUpload.url;
                productData.file_size = productFile.size;
                productData.file_type = productFile.type;
            } catch (uploadError) {
                console.warn('File upload failed:', uploadError.message);
            }
        }

        await addProduct(productData);
        
        showAlert('✅ Product added successfully!', 'success');
        await loadUserProducts();
        toggleProductForm();
        
    } catch (error) {
        showAlert('❌ Error: ' + error.message, 'error');
        console.error('Product submission error:', error);
    } finally {
        hideLoading();
    }
}

async function loadUserProducts() {
    try {
        showLoading('Loading products...');
        const products = await getUserProducts();
        const productsList = document.getElementById('productsList');
        
        if (products.length === 0) {
            productsList.innerHTML = `
                <div class="text-center" style="grid-column: 1 / -1; padding: 3rem;">
                    <h3 class="text-lg font-semibold mb-2">No products yet</h3>
                    <p class="text-secondary">Start by adding your first product!</p>
                </div>
            `;
            return;
        }
        
        productsList.innerHTML = products.map(product => `
            <div class="product-card">
                <div class="product-card-content">
                    <div class="product-header">
                        <div>
                            <h3 class="product-title">${escapeHtml(product.title)}</h3>
                        </div>
                        <div class="product-price">
                            ${product.is_free ? 'FREE' : `$${product.price}`}
                            ${product.promo > 0 ? `<div style="font-size: 0.9rem; color: orange; text-decoration: line-through;">$${product.promo}</div>` : ''}
                        </div>
                    </div>
                    
                    <!-- Badges Stylés -->
                    <div class="badges-container">
                        ${product.is_vip ? '<span class="badge badge-vip">⭐ VIP</span>' : ''}
                        ${product.is_free ? '<span class="badge badge-free">🆓 FREE</span>' : ''}
                        ${!product.is_free && !product.is_vip ? '<span class="badge badge-premium">💰 PREMIUM</span>' : ''}
                        ${product.type === 'promotion' ? '<span class="badge badge-promo">🔥 PROMO</span>' : ''}
                        ${product.type === 'ebook' ? '<span class="badge badge-ebook">📚 eBook</span>' : ''}
                        ${product.type === 'video' ? '<span class="badge badge-video">🎥 Video</span>' : ''}
                        ${product.type === 'app' ? '<span class="badge badge-app">📱 App/Jeux</span>' : ''}
                        ${product.platform && product.platform !== 'web' ? `<span class="badge badge-platform">${getPlatformIcon(product.platform)} ${product.platform}</span>` : ''}
                    </div>
                    
                    ${product.description ? `<p style="margin-bottom: 1rem; color: var(--text-secondary); line-height: 1.6;">${escapeHtml(product.description)}</p>` : ''}
                    
                    <div class="product-meta">
                        ${product.type ? `<p>📦 <strong>Type:</strong> ${product.type}</p>` : ''}
                        ${product.platform && product.platform !== 'web' ? `<p>🖥️ <strong>Platform:</strong> ${product.platform}</p>` : ''}
                        ${product.version ? `<p>🔢 <strong>Version:</strong> ${product.version}</p>` : ''}
                        ${product.build_number ? `<p>⚙️ <strong>Build:</strong> ${product.build_number}</p>` : ''}
                        ${product.file_size ? `<p>💾 <strong>Size:</strong> ${(product.file_size / 1024 / 1024).toFixed(2)} MB</p>` : ''}
                        <p>📅 <strong>Created:</strong> ${new Date(product.created_at).toLocaleDateString()}</p>
                    </div>
                    
                    ${product.file_url ? `
                        <div class="preview-section">
                            <div class="preview-header">File Preview</div>
                            <div class="preview-content">
                                ${getFilePreview(product)}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="product-actions">
                        <button class="btn btn-secondary" onclick="editProduct('${product.id}')">✏️ Edit</button>
                        <button class="btn btn-danger" onclick="confirmDelete('${product.id}')">🗑️ Delete</button>
                        ${product.file_url ? `<button class="btn btn-primary" onclick="downloadFile('${product.file_url}', '${product.title}')">⬇️ Download</button>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        showAlert('Error loading products: ' + error.message, 'error');
        console.error('Error loading products:', error);
    } finally {
        hideLoading();
    }
}

function getPlatformIcon(platform) {
    const icons = {
        'android': '🤖',
        'ios': '📱',
        'windows': '🪟',
        'mac': '🍎',
        'web': '🌐',
        'multi': '🔀'
    };
    return icons[platform] || '💻';
}

function getFilePreview(product) {
    if (!product.file_url) return '';
    
    const fileExt = product.file_url.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
        return `<img src="${product.file_url}" style="max-width: 100%; border-radius: 8px;" alt="File Preview">`;
    }
    else if (fileExt === 'pdf') {
        return `<iframe src="${product.file_url}" class="pdf-preview" style="width: 100%; height: 400px; border: none;"></iframe>`;
    }
    else if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(fileExt)) {
        return `<video controls class="video-preview" style="width: 100%; max-height: 300px;">
                    <source src="${product.file_url}" type="video/${fileExt}">
                    Your browser does not support the video tag.
                </video>`;
    }
    else if (['mp3', 'wav', 'm4a'].includes(fileExt)) {
        return `<audio controls style="width: 100%;">
                    <source src="${product.file_url}" type="audio/${fileExt}">
                    Your browser does not support the audio tag.
                </audio>`;
    }
    else {
        return `
            <div class="text-center">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📄</div>
                <p><strong>File Type:</strong> ${product.file_type || 'Unknown'}</p>
                <p><strong>Size:</strong> ${product.file_size ? (product.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}</p>
                <button class="btn btn-primary mt-2" onclick="downloadFile('${product.file_url}', '${product.title}')">Download File</button>
            </div>
        `;
    }
}

function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
}

function confirmDelete(productId) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        deleteProductHandler(productId);
    }
}

async function deleteProductHandler(productId) {
    try {
        showLoading('Deleting product...');
        
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (fetchError) {
            throw new Error('Product not found');
        }

        const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (deleteError) throw deleteError;

        showAlert('✅ Product deleted successfully', 'success');
        
        setTimeout(async () => {
            await loadUserProducts();
        }, 500);
        
    } catch (error) {
        showAlert('❌ Error deleting product: ' + error.message, 'error');
        console.error('Delete error:', error);
    } finally {
        hideLoading();
    }
}

function setupFilePreviews() {
    const imageInput = document.getElementById('productImage');
    const fileInput = document.getElementById('productFile');
    
    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('imagePreview').innerHTML = `
                    <img src="${e.target.result}" class="preview-image" alt="Preview">
                    <p class="text-sm mt-2">${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                `;
                document.getElementById('imagePreview').classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });
    
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('filePreview').innerHTML = `
                <div style="padding: 1rem; background: var(--surface-color); border-radius: 8px;">
                    <p><strong>File:</strong> ${file.name}</p>
                    <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
                </div>
            `;
            
            // Générer la prévisualisation
            await handleFilePreview(file);
        }
    });
}

function showOwnerSection(user) {
    document.getElementById('ownerSection').classList.remove('hidden');
    document.getElementById('welcomeSection').classList.add('hidden');
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    document.getElementById('userInfo').textContent = `👤 ${user.email}`;
    loadUserProducts();
}

function showWelcomeSection() {
    document.getElementById('ownerSection').classList.add('hidden');
    document.getElementById('welcomeSection').classList.remove('hidden');
    document.getElementById('loginBtn').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('userInfo').textContent = '';
}

function showAlert(message, type = 'info') {
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    document.querySelector('.main-content').insertBefore(alert, document.querySelector('.main-content').firstChild);
    
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function showLoading(message = 'Loading...') {
    console.log('Loading:', message);
}

function hideLoading() {
    console.log('Loading complete');
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function setupDragAndDrop() {
    const uploadAreas = document.querySelectorAll('.file-upload');
    
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('dragover');
        });
        
        area.addEventListener('dragleave', () => {
            area.classList.remove('dragover');
        });
        
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const input = area.querySelector('input[type="file"]');
                if (input) {
                    const dt = new DataTransfer();
                    dt.items.add(files[0]);
                    input.files = dt.files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    });
}

// ==================== INITIALISATION ====================

supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        currentUser = session.user;
        showOwnerSection(session.user);
    } else {
        currentUser = null;
        showWelcomeSection();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    setupStorage();
    setupFilePreviews();
    setupDragAndDrop();
    
    window.showLoginForm = showLoginForm;
    window.hideLoginForm = hideLoginForm;
    window.showSignupForm = showSignupForm;
    window.hideSignupForm = hideSignupForm;
    window.loginWithEmail = loginWithEmail;
    window.signUpWithEmail = signUpWithEmail;
    window.signOut = signOut;
    window.toggleProductForm = toggleProductForm;
    window.submitProduct = submitProduct;
    window.deleteProduct = deleteProductHandler;
    window.confirmDelete = confirmDelete;
    window.downloadFile = downloadFile;
    
    getCurrentUser().then(user => {
        if (user) {
            showOwnerSection(user);
        } else {
            showWelcomeSection();
        }
    });
});

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.add('hidden');
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideLoginForm();
        hideSignupForm();
    }
});