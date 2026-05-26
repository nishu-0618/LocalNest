let userLat = null;
let userLng = null;

// Initialize housing page
document.addEventListener('DOMContentLoaded', () => {
  loadHousingListings();
});

async function detectLocationAndFilter() {
  const status = document.getElementById('locationStatus');
  status.textContent = '📍 Detecting location...';
  
  if (!navigator.geolocation) {
    status.textContent = 'Geolocation not supported';
    showToast('Geolocation not supported by your browser');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      status.textContent = `📍 Location detected (Lat: ${userLat.toFixed(2)}, Lng: ${userLng.toFixed(2)})`;
      showToast('Location detected successfully');
      applyHousingFilters();
    },
    (err) => {
      status.textContent = '📍 Location access denied';
      showToast('Could not get your location. Showing default results.');
    }
  );
}

function applyHousingFilters() {
  const params = new URLSearchParams();
  
  const flatType = document.getElementById('f-flattype').value;
  if (flatType) params.append('flatType', flatType);
  
  const minRent = document.getElementById('f-minrent').value;
  if (minRent) params.append('minRent', minRent);
  
  const maxRent = document.getElementById('f-maxrent').value;
  if (maxRent) params.append('maxRent', maxRent);
  
  const gender = document.getElementById('f-gender').value;
  if (gender && gender !== 'any') params.append('genderPreference', gender);
  
  const furnished = document.getElementById('f-furnished').value;
  if (furnished) params.append('furnished', furnished);
  
  const society = document.getElementById('f-society').value;
  if (society) params.append('societyName', society);
  
  const distance = document.getElementById('f-distance').value;
  if (userLat && userLng) {
    params.append('lat', userLat);
    params.append('lng', userLng);
    params.append('radius', distance);
  }
  
  loadHousingListings(`?${params.toString()}`);
}

async function loadHousingListings(queryString = '') {
  const grid = document.getElementById('listingsGrid');
  const info = document.getElementById('resultsInfo');
  grid.innerHTML = '<div class="loading">⏳ Loading housing listings...</div>';

  try {
    const res = await fetch(`${API}/api/listings/housing${queryString}`);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      grid.innerHTML = `
        <div class="empty">
          <h3>No housing found</h3>
          <p>Try adjusting your filters or distance</p>
        </div>`;
      info.textContent = 'No results found';
      return;
    }

    // Reuse deduplication from app.js if needed, or just assign
    allListings = data.data; // store globally for modal access
    info.textContent = `Showing ${allListings.length} housing ${allListings.length === 1 ? 'listing' : 'listings'}`;
    
    renderHousingCards(allListings);

  } catch (err) {
    grid.innerHTML = `
      <div class="empty">
        <h3>⚠️ Could not connect to server</h3>
      </div>`;
    info.textContent = 'Error loading results';
  }
}

function calculateCompatibility(listing) {
  // Mock compatibility logic based on some basic traits
  let score = 50;
  if (listing.housingDetails) {
    if (listing.housingDetails.societyName) score += 20; // High score for society match (mocked)
    if (listing.housingDetails.amenities && listing.housingDetails.amenities.length > 3) score += 10;
    if (listing.housingDetails.genderPreference === 'any') score += 10;
  }
  return Math.min(99, score + Math.floor(Math.random() * 10)); // Add a little randomness for demo
}

function renderHousingCards(listings) {
  const grid = document.getElementById('listingsGrid');

  grid.innerHTML = listings.map(listing => {
    const poster = listing.postedBy;
    const name = poster?.name || 'Neighbor';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const h = listing.housingDetails || {};
    
    const rent = h.rent ? `₹${h.rent.toLocaleString()}/mo` : 'Price on request';
    const flatType = h.flatType || h.roomType || 'Room';
    const society = h.societyName ? `<div class="society-badge">🏢 ${h.societyName}</div>` : '';
    
    let genderClass = '';
    let genderIcon = '👤';
    if (h.genderPreference === 'male') { genderClass = 'gender-male'; genderIcon = '👨'; }
    if (h.genderPreference === 'female') { genderClass = 'gender-female'; genderIcon = '👩'; }
    const genderBadge = h.genderPreference && h.genderPreference !== 'any' 
      ? `<span class="gender-badge ${genderClass}">${genderIcon} ${h.genderPreference} only</span>` 
      : `<span class="gender-badge">👫 Any gender</span>`;

    let distanceHtml = '';
    if (listing.distanceInMeters !== undefined) {
      const km = (listing.distanceInMeters / 1000).toFixed(1);
      distanceHtml = `<div class="distance-pill">📍 ${km} km</div>`;
    }

    const compScore = calculateCompatibility(listing);

    return `
      <div class="listing-card housing-card" onclick="openModal('${listing._id}')">
        <div style="position:relative;">
          <div class="housing-img-placeholder">
            ${listing.images && listing.images.length > 0 ? `<img src="${listing.images[0]}" style="width:100%; height:100%; object-fit:cover;" />` : '🏠'}
          </div>
          ${distanceHtml}
        </div>
        <div class="card-body" style="flex:1;">
          ${society}
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div class="card-title" style="margin-bottom:0;">${listing.title}</div>
            <div class="card-price" style="font-size:1.1rem;">${rent}</div>
          </div>
          <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
            <span class="tag" style="background:#e8eaf6; color:#3f51b5;">🛏️ ${flatType.toUpperCase()}</span>
            ${h.furnished ? `<span class="tag">🛋️ ${h.furnished}</span>` : ''}
            ${genderBadge}
          </div>
          <div class="card-desc">${listing.description}</div>
          <div class="compatibility-score">
            ⚡ ${compScore}% Match based on your preferences
          </div>
        </div>
        <div class="card-footer">
          <div class="poster-info">
            <div class="avatar">${initials}</div>
            <div>
              <div class="poster-name">${name}</div>
              <div class="trust-score">Trust: ${poster?.trustScore || 50} ⭐ ${poster?.rating || 'New'}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}
