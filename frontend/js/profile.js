document.addEventListener('DOMContentLoaded', async () => {
  const userStr = localStorage.getItem('localnest_user');
  if (!userStr) {
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(userStr);
  
  // Set initial UI from localStorage
  updateSidebarUI(user);

  // Load live profile details from backend
  await refreshProfile(user);
  
  // Load listings and transactions
  loadProfileData();
});

function updateSidebarUI(user) {
  // Avatar handling (use profileImage if present)
  const avatarImg = document.getElementById('p-avatar-img');
  const avatarText = document.getElementById('p-avatar-text');
  if (user.profileImage && avatarImg) {
    avatarImg.src = user.profileImage;
    avatarImg.style.display = 'block';
    if (avatarText) avatarText.style.display = 'none';
  } else {
    if (avatarImg) avatarImg.style.display = 'none';
    if (avatarText) {
      avatarText.textContent = user.name.charAt(0).toUpperCase();
      avatarText.style.display = 'inline';
    }
  }

  document.getElementById('p-name').textContent = user.name;
  
  // Custom Badges and Trust Score Styling
  const badgeEl = document.getElementById('p-badge');
  const trustVal = user.trustScore !== undefined ? user.trustScore : 50;
  
  if (badgeEl) {
    badgeEl.textContent = user.badge || (trustVal >= 70 ? '✔ Trusted Member' : '⚠ New User');
    if (trustVal >= 70) {
      badgeEl.style.background = '#eefbf4';
      badgeEl.style.color = 'var(--green)';
    } else if (trustVal >= 50) {
      badgeEl.style.background = '#fdf6e2';
      badgeEl.style.color = '#d4a373';
    } else {
      badgeEl.style.background = '#ffebeb';
      badgeEl.style.color = '#ef473a';
    }
  }

  document.getElementById('p-bio').innerHTML = user.bio || 'Neighbor in your community.';
  document.getElementById('p-trust').textContent = trustVal;
  
  const trustBar = document.getElementById('p-trust-bar');
  if (trustBar) {
    trustBar.style.width = `${trustVal}%`;
    if (trustVal >= 70) {
      trustBar.style.backgroundColor = 'var(--green)';
    } else if (trustVal >= 50) {
      trustBar.style.backgroundColor = '#f1c40f';
    } else {
      trustBar.style.backgroundColor = '#ef473a';
    }
  }

  document.getElementById('p-rating').textContent = user.rating ? `⭐ ${user.rating}` : 'New';
  
  // Extra Sidebar Details
  document.getElementById('p-locality').textContent = user.locality || 'Bangalore';
  document.getElementById('p-response').textContent = `${user.responseRate || 100}%`;
  
  const verificationEl = document.getElementById('p-verification');
  if (verificationEl) {
    const vStatus = user.verificationStatus || 'none';
    verificationEl.textContent = vStatus.charAt(0).toUpperCase() + vStatus.slice(1);
    if (vStatus === 'verified') {
      verificationEl.style.color = 'var(--green)';
      verificationEl.style.fontWeight = 'bold';
    } else if (vStatus === 'pending') {
      verificationEl.style.color = '#f1c40f';
      verificationEl.style.fontWeight = 'bold';
    } else {
      verificationEl.style.color = '#777';
    }
  }

  document.getElementById('p-exchanges').textContent = `${user.successfulExchanges || 0} Successful`;
}

async function refreshProfile(user) {
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.user) {
      localStorage.setItem('localnest_user', JSON.stringify(data.user));
      updateSidebarUI(data.user);
    }
  } catch (err) {
    console.error('Error refreshing profile:', err);
  }
}

let myListings = [];
let myTransactions = [];

async function loadProfileData() {
  const user = JSON.parse(localStorage.getItem('localnest_user'));
  if (!user) return;

  try {
    // 1. Fetch Listings
    const listingsRes = await fetch(`${API}/api/listings`, { headers: getAuthHeaders() });
    const listingsData = await listingsRes.json();
    if (listingsData.success) {
      myListings = listingsData.data.filter(l => l.postedBy && (l.postedBy._id === user._id || l.postedBy === user._id));
      document.getElementById('p-listed').textContent = myListings.length;
      renderMyListings();
    }

    // 2. Fetch Transactions
    const txRes = await fetch(`${API}/api/transactions`, { headers: getAuthHeaders() });
    const txData = await txRes.json();
    if (txData.success) {
      myTransactions = txData.data;
      renderMyRequestsAndHistory();
    }

    // 3. Fetch activities timeline
    loadActivities(user._id);
  } catch (err) {
    console.error('Error loading profile data:', err);
  }
}

function switchProfileTab(tabName, element) {
  // Hide all contents
  document.querySelectorAll('.p-tab-content').forEach(c => c.style.display = 'none');
  // Deactivate links
  document.querySelectorAll('.tab-link').forEach(t => t.classList.remove('active'));

  // Show selected content
  document.getElementById(`p-tab-${tabName}`).style.display = 'block';
  element.classList.add('active');
}

function renderMyListings() {
  const grid = document.getElementById('listingsGrid');
  if (myListings.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1; padding:20px; text-align:center; color:#888;">You have no active listings.</div>';
    return;
  }

  grid.innerHTML = myListings.map(l => {
    const isResource = l.type === 'resource';
    const detail = isResource ? l.resourceDetails?.category || 'resource' : l.type;
    return `
      <div style="border:1px solid #eee; border-radius:12px; padding:18px; display:flex; flex-direction:column; justify-content:space-between; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
        <div>
          <div style="font-weight:800; font-size:1.05rem; color:var(--dark); margin-bottom:6px;">${l.title}</div>
          <div style="font-size:0.8rem; color:#888; text-transform:uppercase; font-weight:700;">${detail}</div>
        </div>
        <div style="margin-top:12px; display:flex; justify-content:space-between; align-items:center;">
          <span class="tag" style="background:${l.isActive ? '#eefbf4; color:var(--green)' : '#fff0f2; color:#ff5252'}">
            ${l.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function renderMyRequestsAndHistory() {
  const reqContainer = document.getElementById('requestsContainer');
  const historyContainer = document.getElementById('historyContainer');
  const user = JSON.parse(localStorage.getItem('localnest_user'));

  // Filter requests (borrowed by current user)
  const borrowRequests = myTransactions.filter(t => t.borrower && (t.borrower._id === user._id || t.borrower === user._id));

  // Active requests (pending, approved, pickedUp)
  const activeReqs = borrowRequests.filter(r => ['pending', 'approved', 'pickedUp'].includes(r.status));
  // Completed/history (returned, completed, cancelled)
  const historyReqs = borrowRequests.filter(r => ['returned', 'completed', 'cancelled'].includes(r.status));

  // Render active requests
  if (activeReqs.length === 0) {
    reqContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">No active requests. Browse items to start borrowing!</div>';
  } else {
    reqContainer.innerHTML = activeReqs.map(req => {
      const listing = req.listing || {};
      const lender = req.lender || {};
      let statusColor = '#f39c12'; // yellow for pending
      let statusText = 'Pending Approval';
      let actionBtn = '';

      if (req.status === 'approved') {
        statusColor = 'var(--primary)';
        statusText = 'Approved — Ready for Pickup';
        actionBtn = `
          <button class="btn btn-sm btn-action" onclick="updateBorrowStatus('${req._id}', 'pickedUp')" style="margin-top:12px; background:var(--primary); color:white;">
            🤝 Confirm I Picked Up Item
          </button>`;
      } else if (req.status === 'pickedUp') {
        statusColor = 'var(--green)';
        statusText = 'Item is with You';
      }

      if (req.status === 'pending') {
        actionBtn = `
          <button class="btn btn-sm" onclick="updateBorrowStatus('${req._id}', 'cancelled')" style="margin-top:12px; background:#eee; color:#555;">
            ✕ Cancel Request
          </button>`;
      }

      return `
        <div class="profile-list-item">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
              <h4 style="font-weight:800; font-size:1.1rem; color:var(--dark);">${listing.title || 'Item'}</h4>
              <div style="font-size:0.8rem; color:var(--muted); margin-top:2px;">Lender: ${lender.name || 'Neighbor'}</div>
            </div>
            <span class="tag" style="background:${statusColor}22; color:${statusColor}; font-weight:700;">${statusText}</span>
          </div>
          <div style="font-size:0.85rem; color:#666; margin-top:10px;">
            ⏱️ <strong>Requested Duration:</strong> ${req.borrowDays} days
          </div>
          ${actionBtn}
        </div>
      `;
    }).join('');
  }

  // Render history
  if (historyReqs.length === 0) {
    historyContainer.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">No completed transactions in history.</div>';
  } else {
    historyContainer.innerHTML = historyReqs.map(req => {
      const listing = req.listing || {};
      const lender = req.lender || {};
      let statusColor = '#aaa';
      let statusText = req.status.toUpperCase();

      if (req.status === 'returned' || req.status === 'completed') {
        statusColor = 'var(--green)';
        statusText = 'COMPLETED';
      } else if (req.status === 'cancelled') {
        statusColor = '#ff5252';
        statusText = 'CANCELLED/REJECTED';
      }

      return `
        <div class="profile-list-item" style="opacity:0.85; background:#fafafa;">
          <div style="display:flex; justify-content:space-between; align-items:start;">
            <div>
              <h4 style="font-weight:800; font-size:1.1rem; color:var(--dark);">${listing.title || 'Item'}</h4>
              <div style="font-size:0.8rem; color:var(--muted); margin-top:2px;">Lender: ${lender.name || 'Neighbor'}</div>
            </div>
            <span class="tag" style="background:${statusColor}15; color:${statusColor}; font-weight:700;">${statusText}</span>
          </div>
          <div style="font-size:0.85rem; color:#666; margin-top:10px;">
            ⏱️ <strong>Duration:</strong> ${req.borrowDays} days · 📅 <strong>Returned on:</strong> ${req.updatedAt ? new Date(req.updatedAt).toDateString() : 'N/A'}
          </div>
        </div>
      `;
    }).join('');
  }
}

async function updateBorrowStatus(txId, status) {
  try {
    const res = await fetch(`${API}/api/transactions/${txId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Status updated successfully!');
      loadProfileData();
      
      // Update local score
      const user = JSON.parse(localStorage.getItem('localnest_user'));
      refreshProfile(user);
    } else {
      showToast(data.message || 'Error updating status');
    }
  } catch (err) {
    showToast('Connection error');
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

async function loadActivities(userId) {
  const container = document.getElementById('timelineContainer');
  if (!container) return;

  try {
    const res = await fetch(`${API}/api/users/${userId}/activities`);
    const resData = await res.json();

    if (!res.ok || !resData.success) {
      throw new Error(resData.message || 'Failed to fetch timeline');
    }

    const activities = resData.data || [];
    renderActivities(activities);
  } catch (err) {
    container.innerHTML = `<div style="padding:20px; text-align:center; color:#ff5252;">Error loading timeline: ${err.message}</div>`;
  }
}

function renderActivities(activities) {
  const container = document.getElementById('timelineContainer');
  if (activities.length === 0) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">No recent activity logs.</div>';
    return;
  }

  container.innerHTML = activities.map(act => {
    const date = new Date(act.createdAt);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Choose icon based on keywords
    let icon = '📝';
    if (act.action.includes('Lent') || act.action.includes('borrow')) icon = '🤝';
    if (act.action.includes('Listed') || act.action.includes('Offered')) icon = '🏠';
    if (act.action.includes('trust') || act.action.includes('Trust')) icon = '📈';
    if (act.action.includes('emergency') || act.action.includes('Emergency')) icon = '🚨';
    if (act.action.includes('Joined')) icon = '🎉';

    return `
      <div style="background:#fdfdfd; border:1px solid #eef0f6; border-radius:12px; padding:16px; display:flex; gap:16px; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.01); margin-bottom:12px;">
        <div style="font-size:1.6rem; background:#f0f2ff; width:44px; height:44px; display:flex; align-items:center; justify-content:center; border-radius:50%; flex-shrink:0;">${icon}</div>
        <div style="flex:1;">
          <div style="font-size:0.95rem; font-weight:700; color:var(--dark); line-height:1.4;">${act.action}</div>
          <div style="font-size:0.8rem; color:var(--muted); margin-top:4px;">⏱ ${dateStr}</div>
        </div>
      </div>
    `;
  }).join('');
}
