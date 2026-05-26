let userLat = null;
let userLng = null;
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
  loadLendListings();
});

function setCategory(cat) {
  currentCategory = cat;
  
  // Update active button state
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const btns = document.querySelectorAll('.cat-btn');
  for (const btn of btns) {
    if (btn.getAttribute('onclick').includes(cat)) {
      btn.classList.add('active');
      break;
    }
  }
  
  applyLendFilters();
}

async function detectLocationAndFilter() {
  const status = document.getElementById('locationStatus');
  status.textContent = '📍 Detecting...';
  
  if (!navigator.geolocation) {
    status.textContent = 'Geo not supported';
    showToast('Geolocation not supported by your browser');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      status.textContent = `📍 Location detected (Lat: ${userLat.toFixed(2)}, Lng: ${userLng.toFixed(2)})`;
      showToast('Location detected successfully');
      applyLendFilters();
    },
    (err) => {
      status.textContent = '📍 Location denied';
      showToast('Could not get your location.');
    }
  );
}

function applyLendFilters() {
  const params = new URLSearchParams();
  
  if (currentCategory !== 'all') {
    params.append('category', currentCategory);
  }
  
  const isFree = document.getElementById('f-free').checked;
  if (isFree) params.append('isFree', 'true');
  
  const today = document.getElementById('f-today').checked;
  if (today) params.append('availableToday', 'true');
  
  const distance = document.getElementById('f-distance').value;
  if (userLat && userLng) {
    params.append('lat', userLat);
    params.append('lng', userLng);
    params.append('radius', distance);
  }
  
  loadLendListings(`?${params.toString()}`);
}

async function loadLendListings(queryString = '') {
  const grid = document.getElementById('listingsGrid');
  const info = document.getElementById('resultsInfo');
  grid.innerHTML = '<div class="loading">⏳ Loading items...</div>';

  try {
    const res = await fetch(`${API}/api/listings/lend${queryString}`);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      grid.innerHTML = `
        <div class="empty">
          <h3>No items found</h3>
          <p>Try removing filters or expanding distance</p>
        </div>`;
      info.textContent = 'No items found';
      return;
    }

    allListings = data.data; // store globally for modal
    info.textContent = `Showing ${allListings.length} item${allListings.length === 1 ? '' : 's'}`;
    
    renderLendCards(allListings);

  } catch (err) {
    grid.innerHTML = `
      <div class="empty">
        <h3>⚠️ Could not connect to server</h3>
      </div>`;
    info.textContent = 'Error loading results';
  }
}

const catIcons = {
  electronics: '💻',
  tools: '🔧',
  books: '📚',
  furniture: '🪑',
  sports: '⚽',
  kitchen: '🍳',
  emergency: '🚨',
  others: '📦'
};

function renderLendCards(listings) {
  const grid = document.getElementById('listingsGrid');

  grid.innerHTML = listings.map(listing => {
    const poster = listing.postedBy;
    const name = poster?.name || 'Neighbor';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const r = listing.resourceDetails || {};
    
    const cat = r.category || 'others';
    const icon = catIcons[cat] || '📦';
    
    const priceText = r.isFree ? '<span style="color:var(--green)">Free</span>' : (r.deposit ? `Dep: ₹${r.deposit}` : 'Free');
    
    let badgeHtml = '';
    if (r.isEmergency) {
      badgeHtml = '<div class="emergency-badge">🚨 EMERGENCY</div>';
    } else if (r.availableToday) {
      badgeHtml = '<div class="available-badge">Available Today</div>';
    }

    let distanceHtml = '';
    if (listing.distanceInMeters !== undefined) {
      const km = (listing.distanceInMeters / 1000).toFixed(1);
      distanceHtml = `<div style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); color:white; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:600; backdrop-filter:blur(4px);">📍 ${km} km</div>`;
    }

    return `
      <div class="listing-card lend-card" onclick="openModal('${listing._id}')" style="position:relative;">
        <div style="position:relative;">
          <div class="lend-img-placeholder">
            ${listing.images && listing.images.length > 0 ? `<img src="${listing.images[0]}" style="width:100%; height:100%; object-fit:cover;" />` : icon}
          </div>
          ${badgeHtml}
          ${distanceHtml}
        </div>
        <div class="card-body" style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div class="card-title" style="margin-bottom:0;">${listing.title}</div>
            <div class="card-price" style="font-size:1rem; white-space:nowrap; margin-left:10px;">${priceText}</div>
          </div>
          
          <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
            <span class="tag" style="background:#f5f5f5; color:#555; text-transform:capitalize;">${icon} ${cat}</span>
            <span class="tag">Max ${r.borrowDurationDays || 1} day(s)</span>
            ${r.condition ? `<span class="tag">Cond: ${r.condition}</span>` : ''}
          </div>
          
          <div class="card-desc">${listing.description}</div>
        </div>
        <div class="card-footer">
          <div class="poster-info">
            <div class="avatar" style="width:28px; height:28px; font-size:0.7rem;">${initials}</div>
            <div>
              <div class="poster-name" style="font-size:0.8rem;">${name}</div>
              <div class="trust-score" style="font-size:0.75rem;">Trust: ${poster?.trustScore || 50}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
