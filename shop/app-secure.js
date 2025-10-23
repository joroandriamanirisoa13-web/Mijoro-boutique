// shop/app-secure.js
// Configuration Supabase
const SUPABASE_URL = 'https://zogohkfzplcuonkkfoov.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvZ29oa2Z6cGxjdW9ua2tmb292Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4Nzk0ODAsImV4cCI6MjA3NjQ1NTQ4MH0.AeQ5pbrwjCAOsh8DA7pl33B7hLWfaiYwGa36CaeXCsw';

// Initialiser Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State global
let currentUser = null;

// Fonctions d'authentification
async function signInWithGitHub() {
    try {
        showLoading('Connecting to GitHub...');
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (error) {
        showAlert('Login failed: ' + error.message, 'error');
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

// Gestion des produits
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

    // Vérifier la propriété
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

    // Vérifier la propriété
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

// Upload de fichiers
async function uploadFile(file, folder = 'product-files') {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('media')
            .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('media')
            .getPublicUrl(filePath);

        return { path: filePath, url: publicUrl };
    } catch (error) {
        throw new Error(`Upload failed: ${error.message}`);
    }
}

// Validation des fichiers
function validateFile(file, options = {}) {
    const {
        maxSize = 10 * 1024 * 1024,
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/zip'],
        allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.zip', '.apk', '.ipa']
    } = options;

    if (file.size > maxSize) {
        throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
    }

    if (!allowedTypes.includes(file.type)) {
        throw new Error('File type not allowed');
    }

    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        throw new Error('File extension not allowed');
    }

    return true;
}

// Validation des données produit
function validateProductData(productData) {
    const errors = [];

    if (!productData.title?.trim()) {
        errors.push('Product title is required');
    }

    if (!productData.platform) {
        errors.push('Platform is required');
    }

    if (productData.price && productData.price < 0) {
        errors.push('Price cannot be negative');
    }

    return errors;
}

// Gestion de l'UI
function toggleProductForm() {
    const form = document.getElementById('productForm');
    form.classList.toggle('hidden');
    
    if (!form.classList.contains('hidden')) {
        // Reset form when opening
        document.getElementById('productForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('filePreview').innerHTML = '';
        document.getElementById('imagePreview').classList.add('hidden');
    }
}

async function submitProduct() {
    try {
        showLoading('Adding product...');

        const productData = {
            title: document.getElementById('productTitle').value.trim(),
            type: document.getElementById('productType').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value) || 0,
            platform: document.getElementById('productPlatform').value,
            description: document.getElementById('productDescription').value.trim(),
            version: document.getElementById('productVersion').value.trim(),
            build_number: document.getElementById('productBuildNumber').value.trim()
        };

        // Validation des données
        const errors = validateProductData(productData);
        if (errors.length > 0) {
            throw new Error('Validation errors:\n' + errors.join('\n'));
        }

        // Upload de l'image
        const imageFile = document.getElementById('productImage').files[0];
        if (imageFile) {
            validateFile(imageFile, { 
                maxSize: 10 * 1024 * 1024,
                allowedTypes: ['image/jpeg', 'image/png', 'image/gif']
            });
            const imageUpload = await uploadFile(imageFile, 'product-images');
            productData.img_url = imageUpload.url;
        }

        // Upload du fichier
        const productFile = document.getElementById('productFile').files[0];
        if (productFile) {
            validateFile(productFile, {
                maxSize: 50 * 1024 * 1024,
                allowedTypes: ['application/zip', 'application/octet-stream'],
                allowedExtensions: ['.zip', '.apk', '.ipa']
            });
            const fileUpload = await uploadFile(productFile, 'product-files');
            productData.file_url = fileUpload.url;
            productData.file_size = productFile.size;
            productData.file_type = productFile.type;
        }

        // Ajouter le produit
        await addProduct(productData);
        
        showAlert('Product added successfully!', 'success');
        await loadUserProducts();
        toggleProductForm();
        
    } catch (error) {
        showAlert('Error: ' + error.message, 'error');
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
                <div class="product-header">
                    <div>
                        <h3 class="product-title">${escapeHtml(product.title)}</h3>
                        <span class="product-platform">${product.platform}</span>
                    </div>
                    <div class="product-price">$${product.price || '0.00'}</div>
                </div>
                
                ${product.description ? `<p style="margin-bottom: 1rem; color: var(--text-secondary);">${escapeHtml(product.description)}</p>` : ''}
                
                <div class="product-meta">
                    ${product.version ? `<p><strong>Version:</strong> ${product.version}</p>` : ''}
                    ${product.build_number ? `<p><strong>Build:</strong> ${product.build_number}</p>` : ''}
                    ${product.type ? `<p><strong>Type:</strong> ${product.type}</p>` : ''}
                    ${product.file_size ? `<p><strong>Size:</strong> ${(product.file_size / 1024 / 1024).toFixed(2)} MB</p>` : ''}
                    ${product.file_type ? `<p><strong>File Type:</strong> ${product.file_type}</p>` : ''}
                    <p><strong>Created:</strong> ${new Date(product.created_at).toLocaleDateString()}</p>
                </div>
                
                <div class="product-actions">
                    <button class="btn btn-secondary" onclick="editProduct('${product.id}')">Edit</button>
                    <button class="btn btn-danger" onclick="confirmDelete('${product.id}')">Delete</button>
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

function confirmDelete(productId) {
    if (confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        deleteProductHandler(productId);
    }
}

async function deleteProductHandler(productId) {
    try {
        showLoading('Deleting product...');
        await deleteProduct(productId);
        showAlert('Product deleted successfully', 'success');
        await loadUserProducts();
    } catch (error) {
        showAlert('Error deleting product: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Gestion des prévisualisations
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
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('filePreview').innerHTML = `
                <div style="padding: 1rem; background: var(--surface-color); border-radius: 8px;">
                    <p><strong>File:</strong> ${file.name}</p>
                    <p><strong>Size:</strong> ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Type:</strong> ${file.type || 'Unknown'}</p>
                </div>
            `;
        }
    });
}

// Utilitaires d'UI
function showOwnerSection(user) {
    document.getElementById('ownerSection').classList.remove('hidden');
    document.getElementById('welcomeSection').classList.add('hidden');
    document.getElementById('githubLogin').classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    document.getElementById('userInfo').textContent = `👤 ${user.email || user.user_metadata.full_name || 'User'}`;
    loadUserProducts();
}

function showWelcomeSection() {
    document.getElementById('ownerSection').classList.add('hidden');
    document.getElementById('welcomeSection').classList.remove('hidden');
    document.getElementById('githubLogin').classList.remove('hidden');
    document.getElementById('logoutBtn').classList.add('hidden');
    document.getElementById('userInfo').textContent = '';
}

function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    document.querySelector('.container').insertBefore(alert, document.querySelector('.container').firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function showLoading(message = 'Loading...') {
    // Implementation simple - vous pouvez ajouter un spinner plus sophistiqué
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

// Drag and drop support
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
                    // Create a new FileList (simulated)
                    const dt = new DataTransfer();
                    dt.items.add(files[0]);
                    input.files = dt.files;
                    
                    // Trigger change event
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
    });
}

// Gestion de l'état d'authentification
supabase.auth.onAuthStateChange(async (event, session) => {
    if (session) {
        currentUser = session.user;
        showOwnerSection(session.user);
    } else {
        currentUser = null;
        showWelcomeSection();
    }
});

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    setupFilePreviews();
    setupDragAndDrop();
    
    // Rendre les fonctions globales
    window.signInWithGitHub = signInWithGitHub;
    window.signOut = signOut;
    window.toggleProductForm = toggleProductForm;
    window.submitProduct = submitProduct;
    window.deleteProduct = deleteProductHandler;
    window.confirmDelete = confirmDelete;
    
    // Vérifier l'état d'authentification au chargement
    getCurrentUser().then(user => {
        if (user) {
            showOwnerSection(user);
        } else {
            showWelcomeSection();
        }
    });
});

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    showAlert('An unexpected error occurred', 'error');
});

// Exporter pour les tests (si nécessaire)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        supabase,
        signInWithGitHub,
        signOut,
        addProduct,
        getUserProducts,
        updateProduct,
        deleteProduct
    };
}