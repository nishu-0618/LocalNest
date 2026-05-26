const API = 'http://localhost:3000';
let allListings = []; // store listings to avoid duplicates

// ─────────────────────────────────────────────
// AUTH & NAV STATE
// ─────────────────────────────────────────────
function checkAuth() {
  const userStr = localStorage.getItem('localnest_user');
  const token = localStorage.getItem('localnest_token');
  
  const navLogin = document.getElementById('nav-login');
  const navLogout = document.getElementById('nav-logout');
  const navPost = document.getElementById('nav-post');
  const navNotif = document.getElementById('nav-notif-icon');
  const navProfile = document.getElementById('nav-profile-link');
  
  if (userStr && token) {
    if (navLogin) navLogin.style.display = 'none';
    if (navLogout) navLogout.style.display = 'inline-block';
    if (navPost) navPost.style.display = 'inline-block';
    if (navNotif) navNotif.style.display = 'inline-block';
    if (navProfile) navProfile.style.display = 'inline-block';
  } else {
    if (navLogin) navLogin.style.display = 'inline-block';
    if (navLogout) navLogout.style.display = 'none';
    if (navPost) navPost.style.display = 'none';
    if (navNotif) navNotif.style.display = 'none';
    if (navProfile) navProfile.style.display = 'none';
  }
}

function logout() {
  localStorage.removeItem('localnest_user');
  localStorage.removeItem('localnest_token');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', checkAuth);

// Helper to get auth headers for API calls
function getAuthHeaders() {
  const token = localStorage.getItem('localnest_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// ─────────────────────────────────────────────
// LOAD ALL LISTINGS
// ─────────────────────────────────────────────
async function loadListings(type = 'all') {
  const grid = document.getElementById('listingsGrid');
  const info = document.getElementById('resultsInfo');
  if (!grid) return;

  grid.innerHTML = '<div class="loading">⏳ Loading listings...</div>';

  try {
    const url = type === 'all'
      ? `${API}/api/listings`
      : `${API}/api/listings?type=${type}`;

    const res  = await fetch(url, { headers: getAuthHeaders() });
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      grid.innerHTML = `
        <div class="empty">
          <h3>No listings found</h3>
          <p>Try a different filter</p>
        </div>`;
      return;
    }

    // Remove duplicates by _id
    const seen = new Set();
    allListings = data.data.filter(l => {
      if (seen.has(l._id)) return false;
      seen.add(l._id);
      return true;
    });

    if (info) info.textContent = `Showing ${allListings.length} listings`;
    renderListings(allListings);

  } catch (err) {
    if (grid) {
      grid.innerHTML = `
        <div class="empty">
          <h3>⚠️ Could not connect to server</h3>
          <p>Make sure your backend is running on port 3000</p>
        </div>`;
    }
    if (info) info.textContent = 'Error loading results';
  }
}

// ─────────────────────────────────────────────
// NOTIFICATIONS BADGE
// ─────────────────────────────────────────────
async function updateGlobalNotifBadge() {
  const badge = document.getElementById('nav-notif-count');
  if (!badge) return;
  
  try {
    // Real user ID from auth
    const userStr = localStorage.getItem('localnest_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      const res = await fetch(`${API}/api/notifications/${user._id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.unreadCount > 0) {
        badge.textContent = data.unreadCount;
        badge.style.display = 'inline-block';
      }
    }
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', updateGlobalNotifBadge);

// ─────────────────────────────────────────────
// SEARCH LISTINGS
// ─────────────────────────────────────────────
let searchTimeout;

async function handleSearch(query) {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(async () => {
    if (!query.trim()) {
      loadListings();
      return;
    }

    const grid = document.getElementById('listingsGrid');
    const info = document.getElementById('resultsInfo');
    grid.innerHTML = '<div class="loading">🔍 Searching...</div>';

    try {
      const res  = await fetch(`${API}/api/listings/search?q=${query}`, { headers: getAuthHeaders() });
      const data = await res.json();

      if (!data.data || data.data.length === 0) {
        grid.innerHTML = `
          <div class="empty">
            <h3>No results for "${query}"</h3>
            <p>Try keywords like "bicycle", "guitar", "camera"</p>
          </div>`;
        return;
      }

      // Deduplicate
      const seen = new Set();
      allListings = data.data.filter(l => {
        if (seen.has(l._id)) return false;
        seen.add(l._id);
        return true;
      });

      if (info) info.textContent = `Found ${allListings.length} results for "${query}"`;
      renderListings(allListings);

    } catch (err) {
      showToast('Search failed. Is your server running?');
    }
  }, 400);
}

// ─────────────────────────────────────────────
// NEARBY LISTINGS
// ─────────────────────────────────────────────
async function loadNearby() {
  const distance = document.getElementById('distanceSelect')?.value;
  
  if (!distance) {
    loadListings(); // Load all if 'Everywhere' selected
    return;
  }

  const grid = document.getElementById('listingsGrid');
  const info = document.getElementById('resultsInfo');
  const status = document.getElementById('locationStatus');
  grid.innerHTML = '<div class="loading">📍 Getting your location...</div>';

  if (!navigator.geolocation) {
    showToast('Geolocation not supported. Showing default location.');
    fetchNearbyWithCoords(12.9178, 77.4835, distance); // Default Kengeri
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      fetchNearbyWithCoords(position.coords.latitude, position.coords.longitude, distance);
      if(status) status.textContent = `📍 Using your location (${distance}km)`;
    },
    () => {
      showToast('Location denied — showing default Kengeri area');
      fetchNearbyWithCoords(12.9178, 77.4835, distance);
    }
  );
}

async function fetchNearbyWithCoords(lat, lng, radiusKm) {
  const grid = document.getElementById('listingsGrid');
  const info = document.getElementById('resultsInfo');

  try {
    const res  = await fetch(`${API}/api/listings/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`, { headers: getAuthHeaders() });
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      grid.innerHTML = `
        <div class="empty">
          <h3>No listings within ${radiusKm}km</h3>
        </div>`;
      if(info) info.textContent = 'No results';
      return;
    }

    const seen = new Set();
    allListings = data.data.filter(l => {
      if (seen.has(l._id)) return false;
      seen.add(l._id);
      return true;
    });

    if (info) info.textContent = `Found ${allListings.length} listings within ${radiusKm}km`;
    renderListings(allListings);

  } catch (err) {
    loadListings();
  }
}

// ─────────────────────────────────────────────
// FILTER
// ─────────────────────────────────────────────
function filterListings(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';

  const info = document.getElementById('resultsInfo');
  if (info) info.textContent = '';

  loadListings(type);
}

// ─────────────────────────────────────────────
// RENDER LISTING CARDS
// ─────────────────────────────────────────────
function renderListings(listings) {
  const grid = document.getElementById('listingsGrid');

  grid.innerHTML = listings.map(listing => {
    const poster   = listing.postedBy;
    const name     = poster?.name || 'Neighbor';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const trust    = poster?.trustScore || '–';
    const rating   = poster?.rating ? `⭐ ${poster.rating}` : '';

    const typeClass = `type-${listing.type}`;
    const typeLabel = listing.type.charAt(0).toUpperCase() + listing.type.slice(1);

    const tags = (listing.tags || []).slice(0, 3)
      .map(t => `<span class="tag">#${t}</span>`)
      .join('');

    let priceLabel = '';
    if (listing.type === 'housing' && listing.housingDetails?.rent) {
      priceLabel = `₹${listing.housingDetails.rent.toLocaleString()}/mo`;
    } else if (listing.type === 'resource' && listing.resourceDetails?.borrowDurationDays) {
      priceLabel = `Max ${listing.resourceDetails.borrowDurationDays} day(s)`;
    } else if (listing.type === 'skill' && listing.skillDetails) {
      priceLabel = listing.skillDetails.isExchange
        ? '🔄 Skill Exchange'
        : `₹${listing.skillDetails.ratePerHour}/hr`;
    }

    const address = listing.location?.address || 'Nearby';
    
    // Distance calculation from backend $geoNear aggregation
    let distanceLabel = '';
    if (listing.distanceInMeters !== undefined) {
      const km = (listing.distanceInMeters / 1000).toFixed(1);
      distanceLabel = `<div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; backdrop-filter:blur(4px);">📍 ${km} km away</div>`;
    }

    return `
      <div class="listing-card" onclick="openModal('${listing._id}')" style="position:relative;">
        ${distanceLabel}
        <div class="card-header">
          <span class="card-type ${typeClass}">${typeLabel}</span>
          <span class="card-views">👁 ${listing.views || 0}</span>
        </div>
        <div class="card-body">
          <div class="card-title">${listing.title}</div>
          <div class="card-desc">${listing.description}</div>
          <div style="margin-top:6px; font-size:0.8rem; color:#aaa;">📍 ${address}</div>
        </div>
        <div class="card-tags">${tags}</div>
        <div class="card-footer">
          <div class="poster-info">
            <div class="avatar">${initials}</div>
            <div>
              <div class="poster-name">${name}</div>
              <div class="trust-score">Trust: ${trust}/100 ${rating}</div>
            </div>
          </div>
          <div class="card-price">${priceLabel}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─────────────────────────────────────────────
// MODAL — full listing + contact details
// ─────────────────────────────────────────────
function openModal(listingId) {
  const listing = allListings.find(l => l._id === listingId);
  if (!listing) return;

  const poster = listing.postedBy;
  const name   = poster?.name || 'Unknown';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();

  let extraDetails = '';

  if (listing.type === 'housing' && listing.housingDetails) {
    const h = listing.housingDetails;
    extraDetails = `
      <div class="modal-section">
        <div class="modal-section-title">🏠 Housing Details</div>
        <div class="modal-row"><span>Rent</span><span>₹${h.rent?.toLocaleString()}/month</span></div>
        <div class="modal-row"><span>Room Type</span><span>${h.roomType?.toUpperCase()}</span></div>
        <div class="modal-row"><span>Amenities</span><span>${(h.amenities || []).join(', ')}</span></div>
        <div class="modal-row"><span>Available From</span><span>${h.availableFrom ? new Date(h.availableFrom).toDateString() : 'Immediately'}</span></div>
      </div>`;
  }

  if (listing.type === 'resource' && listing.resourceDetails) {
    const r = listing.resourceDetails;
    extraDetails = `
      <div class="modal-section">
        <div class="modal-section-title">🔧 Resource Details</div>
        <div class="modal-row"><span>Item</span><span>${r.itemName}</span></div>
        <div class="modal-row"><span>Condition</span><span>${r.condition}</span></div>
        <div class="modal-row"><span>Max Borrow Duration</span><span>${r.borrowDurationDays} days</span></div>
      </div>`;
  }

  if (listing.type === 'skill' && listing.skillDetails) {
    const s = listing.skillDetails;
    extraDetails = `
      <div class="modal-section">
        <div class="modal-section-title">🎓 Skill Details</div>
        <div class="modal-row"><span>Skill</span><span>${s.skillName}</span></div>
        <div class="modal-row"><span>Rate</span><span>${s.isExchange ? '🔄 Skill Exchange (Free)' : `₹${s.ratePerHour}/hr`}</span></div>
      </div>`;
  }

  const typeLabel = listing.type.charAt(0).toUpperCase() + listing.type.slice(1);

  document.getElementById('modal-overlay').innerHTML = `
    <div class="modal-box">

      <!-- Close -->
      <button class="modal-close" onclick="closeModal()">✕</button>

      <!-- Type badge -->
      <span class="card-type type-${listing.type}" style="margin-bottom:12px;display:inline-block">
        ${typeLabel}
      </span>

      <!-- Title -->
      <h2 class="modal-title">${listing.title}</h2>
      <p class="modal-desc">${listing.description}</p>

      <!-- Tags -->
      <div style="margin-bottom:16px">
        ${(listing.tags || []).map(t => `<span class="tag">#${t}</span>`).join(' ')}
      </div>

      <!-- Location -->
      <div class="modal-section">
        <div class="modal-section-title">📍 Location</div>
        <div class="modal-row">
          <span>Address</span>
          <span>${listing.location?.address || '—'}</span>
        </div>
        <div class="modal-row">
          <span>Coordinates</span>
          <span>${listing.location?.coordinates?.[1]?.toFixed(4)}, ${listing.location?.coordinates?.[0]?.toFixed(4)}</span>
        </div>
      </div>

      <!-- Extra type details -->
      ${extraDetails}

      <!-- Contact info -->
      <div class="modal-section contact-section">
        <div class="modal-section-title">👤 Contact the Owner</div>
        <div class="contact-card">
          <div class="contact-avatar">${initials}</div>
          <div class="contact-info">
            <div class="contact-name">${name}</div>
            ${localStorage.getItem('localnest_user') ? `
              <div class="contact-detail">📧 ${poster?.email || '—'}</div>
              <div class="contact-detail">📞 ${poster?.phone || '—'}</div>
              <div class="contact-detail">📍 ${poster?.location?.address || '—'}</div>
              <div class="contact-detail">⭐ Rating: ${poster?.rating || 0} · Trust: ${poster?.trustScore || 0}/100</div>
            ` : `
              <div style="margin-top: 8px; padding: 10px; font-size: 0.85rem; background: #fff5f5; border-left: 3px solid #ef473a; color: #b71c1c; border-radius: 4px; font-weight: 600;">
                🔒 Login to view contact phone, email, and exact location.
              </div>
            `}
          </div>
        </div>
      </div>

      <!-- Action button / request form -->
      <div id="modal-action-section"></div>

    </div>
  `;

  // Render Action Section dynamically
  const actionContainer = document.getElementById('modal-action-section');
  const currentUserStr = localStorage.getItem('localnest_user');
  
  if (!currentUserStr) {
    actionContainer.innerHTML = `
      <div style="text-align:center; padding: 20px; background: #fff0f2; border-radius: var(--radius); border: 1px solid #ffccd5; margin-top:20px;">
        <p style="font-weight:700; color: #ff3366; margin-bottom: 10px;">Want to borrow this?</p>
        <button class="btn btn-primary" onclick="window.location.href='login.html'" style="padding:10px 24px; font-size:0.9rem;">🔒 Login to Request</button>
      </div>`;
  } else {
    const currentUser = JSON.parse(currentUserStr);
    const isOwner = listing.postedBy && (listing.postedBy._id === currentUser._id || listing.postedBy === currentUser._id);
    if (isOwner) {
      actionContainer.innerHTML = `
        <div style="text-align:center; padding: 20px; background: #f0f7ff; border-radius: var(--radius); border: 1px solid #ccdff5; margin-top:20px; color: var(--primary); font-weight:700;">
          ⭐ You own this listing
        </div>`;
    } else {
      if (listing.type === 'resource') {
        const r = listing.resourceDetails || {};
        actionContainer.innerHTML = `
          <div class="modal-section" style="background:#f8f9ff; border:1px solid #e0e4fc; border-radius:var(--radius); padding:20px; margin-top:20px; text-align:left;">
            <div class="modal-section-title" style="color:var(--primary); font-weight:800; margin-bottom:12px;">🤝 Send Borrow Request</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:12px;">
              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:#555; margin-bottom:4px;">Borrow Days (Max: ${r.borrowDurationDays || 7})</label>
                <input id="req-days" type="number" min="1" max="${r.borrowDurationDays || 7}" value="1" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px;" />
              </div>
              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:#555; margin-bottom:4px;">Pickup Date</label>
                <input id="req-pickup" type="date" value="${new Date().toISOString().split('T')[0]}" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px;" />
              </div>
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block; font-size:0.8rem; font-weight:700; color:#555; margin-bottom:4px;">Message to ${name.split(' ')[0]}</label>
              <textarea id="req-message" placeholder="Hi ${name.split(' ')[0]}, I'd like to borrow your ${listing.title}..." style="width:100%; height:60px; padding:10px; border:1px solid #ccc; border-radius:8px; resize:none; font-family:inherit;"></textarea>
            </div>
            <button class="btn btn-primary" onclick="submitBorrowRequest('${listing._id}', '${poster?._id || poster}')" style="width:100%; padding:12px;">
              📤 Submit Borrow Request
            </button>
          </div>`;
      } else {
        actionContainer.innerHTML = `
          <button class="modal-interest-btn" onclick="showInterest('${name}', '${poster?.phone || ''}')" style="margin-top:20px; width:100%;">
            🤝 I'm Interested — Contact ${name.split(' ')[0]}
          </button>`;
      }
    }
  }

  document.getElementById('modal-overlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

async function submitBorrowRequest(listingId, lenderId) {
  const days = document.getElementById('req-days').value;
  const pickupDate = document.getElementById('req-pickup').value;
  const message = document.getElementById('req-message').value;

  if (!days || days < 1) {
    showToast('Please specify a valid duration');
    return;
  }

  try {
    const res = await fetch(`${API}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        listing: listingId,
        lender: lenderId,
        borrowDays: parseInt(days),
        requestedPickupDate: pickupDate,
        message: message
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast('🎉 Borrow request submitted successfully!');
      closeModal();
    } else {
      showToast(data.message || 'Failed to submit request');
    }
  } catch (err) {
    showToast('Error connecting to server');
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.body.style.overflow = '';
}

function showInterest(name, phone) {
  showToast(`📞 Call ${name} at ${phone || 'number not available'}`);
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
loadListings();

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) {
    closeModal();
  }
}