let userLat = null;
let userLng = null;
let simulatedUserId = "64b1a2c3e4d5f6a7b8c9d0e1"; // Mock ID for demo, usually from localStorage

document.addEventListener('DOMContentLoaded', () => {
  loadNeedRequests();
  // Try to load user ID from previous registrations if available
  const storedUsers = localStorage.getItem('localnest_users');
  // (In a real app, this would be handled by JWT/Auth)
});

async function detectLocationForNeed() {
  const status = document.getElementById('needLocStatus');
  status.textContent = 'Detecting...';
  
  if (!navigator.geolocation) {
    status.textContent = 'Geo not supported';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      status.textContent = `📍 Location set`;
      status.style.color = 'var(--green)';
      // Reload board with location to show distance
      loadNeedRequests();
    },
    (err) => {
      status.textContent = '📍 Location denied';
    }
  );
}

async function postNeedRequest() {
  const item = document.getElementById('n-item').value.trim();
  const cat = document.getElementById('n-category').value;
  const urgency = document.getElementById('n-urgency').value;
  const date = document.getElementById('n-date').value;
  const desc = document.getElementById('n-desc').value.trim();

  if (!item) {
    showToast('Please enter what you need');
    return;
  }
  
  if (!userLat || !userLng) {
    showToast('Please auto-detect location first');
    return;
  }

  const btn = document.querySelector('.request-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Broadcasting...';

  const body = {
    userId: simulatedUserId,
    itemName: item,
    category: urgency === 'critical' ? 'emergency' : cat,
    urgency: urgency,
    description: desc,
    location: {
      type: 'Point',
      coordinates: [userLng, userLat]
    }
  };
  
  if (date) body.requiredBy = date;

  try {
    const loggedUserStr = localStorage.getItem('localnest_user');
    if (loggedUserStr) {
      const loggedUser = JSON.parse(loggedUserStr);
      body.userId = loggedUser._id;
    } else {
      // Hack: Get a real user ID from backend first for demo purposes
      const usersRes = await fetch(`${API}/api/users?limit=1`);
      const usersData = await usersRes.json();
      if (usersData.data && usersData.data.length > 0) {
        body.userId = usersData.data[0]._id;
      }
    }

    const res = await fetch(`${API}/api/needs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await res.json();
    if (data.success) {
      showToast('🎉 Request broadcasted to nearby neighbors!');
      // Reset form
      document.getElementById('n-item').value = '';
      document.getElementById('n-desc').value = '';
      loadNeedRequests();
    } else {
      showToast(data.message || 'Failed to post request');
    }
  } catch (err) {
    showToast('Error connecting to server');
  }

  btn.disabled = false;
  btn.textContent = 'Broadcast Request to Neighbors 🚀';
}

async function loadNeedRequests() {
  const grid = document.getElementById('needsGrid');
  const urgencyFilter = document.getElementById('filter-urgency').value;
  
  let url = `${API}/api/needs?excludeEmergency=true&`;
  if (urgencyFilter) url += `urgency=${urgencyFilter}&`;
  if (userLat && userLng) url += `lat=${userLat}&lng=${userLng}&radius=20000`; // 20km search

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!data.data || data.data.length === 0) {
      grid.innerHTML = `
        <div class="empty" style="background:white; border-radius:12px; padding:40px;">
          <h3>No open requests</h3>
          <p>Your neighborhood is fully provided for right now!</p>
        </div>`;
      return;
    }

    renderNeedCards(data.data);

  } catch (err) {
    grid.innerHTML = `
      <div class="empty">
        <h3>⚠️ Could not connect to server</h3>
      </div>`;
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const catIcons = {
  electronics: '💻', tools: '🔧', books: '📚', furniture: '🪑',
  sports: '⚽', kitchen: '🍳', emergency: '🚨', others: '📦'
};

function renderNeedCards(needs) {
  const grid = document.getElementById('needsGrid');

  grid.innerHTML = needs.map(need => {
    const poster = need.userId;
    const name = poster?.name || 'Neighbor';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    const icon = catIcons[need.category] || '📦';
    
    let distHtml = '';
    if (userLat && userLng && need.location && need.location.coordinates) {
      const dist = calculateDistance(userLat, userLng, need.location.coordinates[1], need.location.coordinates[0]);
      if (dist !== null) distHtml = `<span>📍 ${dist.toFixed(1)} km away</span>`;
    }
    
    let dateHtml = '';
    if (need.requiredBy) {
      const d = new Date(need.requiredBy);
      dateHtml = `<span>📅 Needed by: ${d.toLocaleDateString()}</span>`;
    }
    
    let urgencyBadge = `<span class="urgency-badge badge-${need.urgency}">${need.urgency} Priority</span>`;
    
    // Help action - in real app, opens chat or creates transaction
    const helpAction = `showToast('Sending message to ${name.split(' ')[0]}...')`;

    return `
      <div class="need-card urgency-${need.urgency}">
        <div class="avatar" style="width:48px; height:48px; font-size:1.1rem; background: #e0e7ff; color:var(--primary);">${initials}</div>
        
        <div class="need-info">
          <div class="need-meta" style="margin-bottom:4px; font-weight:600; color:var(--text);">
            ${name} needs help
          </div>
          <div class="need-title">${icon} ${need.itemName}</div>
          <div class="need-meta" style="margin-bottom:8px;">
            ${urgencyBadge}
            ${distHtml}
            ${dateHtml}
          </div>
          <p style="font-size:0.9rem; color:#555;">${need.description || ''}</p>
        </div>
        
        <div>
          <button class="help-btn" onclick="${helpAction}">🤝 I Have This!</button>
        </div>
      </div>
    `;
  }).join('');
}
