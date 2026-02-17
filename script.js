const API_BASE = 'https://fakestoreapi.com';
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('swiftcart_cart')) || [];

// DOM Elements
const productsGrid = document.getElementById('products-grid');
const trendingGrid = document.getElementById('trending-grid');
const categoryContainer = document.getElementById('category-container');
const loadingProducts = document.getElementById('loading-products');
const loadingTrending = document.getElementById('loading-trending');
const cartCount = document.getElementById('cart-count');
const cartBtn = document.getElementById('cart-btn');
const cartSidebar = document.getElementById('cart-sidebar');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart-btn');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const productModal = document.getElementById('product-modal');
const modalOverlay = document.getElementById('modal-overlay');
const closeModalBtn = document.getElementById('close-modal-btn');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

// --- Initialization ---
// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Shared Logic
    updateCartUI();
    setupEventListeners();

    // Home Page Specific Logic
    if (trendingGrid) {
        fetchTrendingProducts();
    }

    // Products Page Specific Logic
    if (productsGrid) {
        fetchCategories();
        fetchProducts('all');
    }
});

// --- API Interactions ---

async function fetchCategories() {
    try {
        const res = await fetch(`${API_BASE}/products/categories`);
        const categories = await res.json();
        renderCategories(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

async function fetchProducts(category = 'all') {
    showLoader(true);
    productsGrid.innerHTML = ''; // Clear current

    let url = `${API_BASE}/products`;
    if (category !== 'all') {
        url = `${API_BASE}/products/category/${category}`;
    }

    try {
        const res = await fetch(url);
        const products = await res.json();
        allProducts = products; // Keep a reference if needed, though we fetch fresh each time per spec
        renderProducts(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        productsGrid.innerHTML = '<p class="text-center col-span-full text-red-500">Failed to load products.</p>';
    } finally {
        showLoader(false);
    }
}

async function fetchTrendingProducts() {
    // For trending, we'll just fetch limited products or sort high rated ones from main list
    // To be distinct, let's fetch strictly 3 products (limit=3)
    loadingTrending.classList.remove('hidden');
    try {
        const res = await fetch(`${API_BASE}/products?limit=3`);
        const products = await res.json();
        renderTrending(products);
    } catch (error) {
        console.error('Error fetching trending:', error);
    } finally {
        loadingTrending.classList.add('hidden');
    }
}

async function fetchProductDetails(id) {
    // Show some loading state in modal if needed, or just wait to open
    try {
        const res = await fetch(`${API_BASE}/products/${id}`);
        const product = await res.json();
        openModal(product);
    } catch (error) {
        console.error('Error fetching product details:', error);
    }
}

// --- Rendering ---

function renderCategories(categories) {
    // 'All' button is already there, append others
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn px-6 py-2 rounded-full border border-gray-200 text-gray-600 font-medium hover:border-primary hover:text-primary transition capitalize';
        btn.dataset.category = cat;
        btn.textContent = cat;
        btn.addEventListener('click', (e) => handleCategoryClick(e, cat));
        categoryContainer.appendChild(btn);
    });
}

function renderProducts(products) {
    if (products.length === 0) {
        productsGrid.innerHTML = '<p class="col-span-full text-center">No products found.</p>';
        return;
    }

    products.forEach(product => {
        const card = createProductCard(product);
        productsGrid.appendChild(card);
    });
}

function renderTrending(products) {
    products.forEach(product => {
        const card = createProductCard(product, true); // true for trending specific styling if needed
        trendingGrid.appendChild(card);
    });
}

function createProductCard(product, isTrending = false) {
    const div = document.createElement('div');
    div.className = 'bg-white rounded-2xl shadow-sm hover:shadow-lg transition duration-300 border border-gray-100 flex flex-col h-full group';

    div.innerHTML = `
        <div class="relative p-6 flex justify-center items-center bg-gray-50 rounded-t-2xl h-64 group-hover:bg-gray-100 transition duration-300">
            <img src="${product.image}" alt="${product.title}" class="h-40 object-contain mix-blend-multiply group-hover:scale-110 transition duration-500">
        </div>
        
        <div class="p-5 flex flex-col flex-grow">
            <!-- Category Pill -->
            <div class="mb-3">
                <span class="inline-block px-3 py-1 text-xs font-semibold text-primary bg-indigo-50 rounded-full capitalize">
                    ${product.category}
                </span>
            </div>

            <!-- Title -->
            <h3 class="font-bold text-gray-900 mb-2 line-clamp-1 hover:text-primary cursor-pointer transition" onclick="fetchProductDetails(${product.id})" title="${product.title}">
                ${product.title}
            </h3>
            
            <div class="mt-auto">
                <!-- Price & Rating Row -->
                <div class="flex items-center justify-between mb-4">
                    <span class="text-xl font-bold text-gray-900">$${product.price.toFixed(2)}</span>
                    <div class="flex items-center gap-1 text-sm text-gray-500">
                        <i class="fa-solid fa-star text-yellow-400"></i>
                        <span>${product.rating.rate}</span>
                        <span class="text-xs text-gray-400">(${product.rating.count})</span>
                    </div>
                </div>

                <!-- Buttons Row -->
                <div class="grid grid-cols-2 gap-3">
                    <button class="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg transition text-sm font-medium bg-white hover:bg-gray-50" onclick="fetchProductDetails(${product.id})">
                        <i class="fa-regular fa-eye"></i> Details
                    </button>
                    <button class="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-indigo-700 text-white rounded-lg transition text-sm font-bold shadow-md hover:shadow-lg" onclick="addToCartEvent(event, ${product.id})">
                        <i class="fa-solid fa-cart-shopping"></i> Add
                    </button>
                </div>
            </div>
        </div>
    `;

    // Store product data in element to avoid re-fetching for add to cart
    div.dataset.product = JSON.stringify(product);
    return div;
}

function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let starsHtml = '';

    for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fa-solid fa-star"></i>';
    if (halfStar) starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
    for (let i = fullStars + (halfStar ? 1 : 0); i < 5; i++) starsHtml += '<i class="fa-regular fa-star"></i>';

    return starsHtml;
}

// --- Event Handlers ---

function handleCategoryClick(e, category) {
    // Update Active State
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white', 'border-primary');
        btn.classList.add('text-gray-600', 'border-gray-200');
    });

    const btn = e.target;
    btn.classList.add('active', 'bg-primary', 'text-white', 'border-primary');
    btn.classList.remove('text-gray-600', 'border-gray-200');

    fetchProducts(category);
}

function showLoader(show) {
    if (show) loadingProducts.classList.remove('hidden');
    else loadingProducts.classList.add('hidden');
}

// --- Cart Logic ---

function addToCartEvent(event, productId) {
    event.stopPropagation(); // Prevent bubbling if clicking button inside card

    // Find product data from DOM or fetch (DOM is faster here as we stored it)
    // We need to traverse up to find the card
    const card = event.target.closest('div[data-product]');
    if (!card) return;

    const product = JSON.parse(card.dataset.product);
    addToCart(product);
}

function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        existing.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    openCart(); // Optional: open cart when added
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('swiftcart_cart', JSON.stringify(cart));
}

function updateCartUI() {
    // Update Badge
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = count;

    // Update Sidebar List
    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full text-gray-400">
                <i class="fa-solid fa-cart-shopping text-4xl mb-4 opacity-20"></i>
                <p>Your cart is empty.</p>
            </div>
        `;
        cartTotalElement.textContent = '$0.00';
        return;
    }

    let total = 0;
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const div = document.createElement('div');
        div.className = 'flex items-center gap-4 bg-gray-50 p-3 rounded-lg';
        div.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="w-12 h-12 object-contain bg-white rounded border p-1">
            <div class="flex-grow">
                <h4 class="text-sm font-bold text-gray-800 line-clamp-1">${item.title}</h4>
                <p class="text-xs text-gray-500">$${item.price} x ${item.quantity}</p>
                <div class="flex items-center gap-2 mt-1">
                     <button onclick="changeQuantity(${item.id}, -1)" class="w-5 h-5 bg-white border rounded flex items-center justify-center text-xs hover:bg-gray-100">-</button>
                     <span class="text-xs font-bold w-4 text-center">${item.quantity}</span>
                     <button onclick="changeQuantity(${item.id}, 1)" class="w-5 h-5 bg-white border rounded flex items-center justify-center text-xs hover:bg-gray-100">+</button>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold text-primary mb-1">$${itemTotal.toFixed(2)}</p>
                <button onclick="removeFromCart(${item.id})" class="text-gray-400 hover:text-red-500 text-xs transition">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        cartItemsContainer.appendChild(div);
    });

    cartTotalElement.textContent = `$${total.toFixed(2)}`;
}

window.changeQuantity = function (id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(id);
    } else {
        saveCart();
        updateCartUI();
    }
}

// --- Modal Logic ---

function openModal(product) {
    document.getElementById('modal-image').src = product.image;
    document.getElementById('modal-title').innerText = product.title;
    document.getElementById('modal-price').innerText = `$${product.price.toFixed(2)}`;
    document.getElementById('modal-description').innerText = product.description;
    document.getElementById('modal-category').innerText = product.category;
    document.getElementById('modal-stars').innerHTML = getStarRating(product.rating.rate);
    document.getElementById('modal-rating-count').innerText = `(${product.rating.count} reviews)`;

    const addToCartBtn = document.getElementById('modal-add-to-cart-btn');
    // Remove old event listeners by cloning
    const newBtn = addToCartBtn.cloneNode(true);
    addToCartBtn.parentNode.replaceChild(newBtn, addToCartBtn);

    newBtn.addEventListener('click', () => {
        addToCart(product);
        closeModal();
    });

    productModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Stop background scrolling
}

function closeModal() {
    productModal.classList.add('hidden');
    document.body.style.overflow = '';
}


// --- Sidebar & Mobile Menu Logic ---

function openCart() {
    cartSidebar.classList.remove('translate-x-full');
    cartOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    cartSidebar.classList.add('translate-x-full');
    cartOverlay.classList.add('hidden');
    document.body.style.overflow = '';
}

function setupEventListeners() {
    cartBtn.addEventListener('click', openCart);
    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    closeModalBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeCart();
        }
    });

    // Add click event for "All" category button (hardcoded in HTML)
    const allBtn = document.querySelector('[data-category="all"]');
    if (allBtn) allBtn.addEventListener('click', (e) => handleCategoryClick(e, 'all'));
}
