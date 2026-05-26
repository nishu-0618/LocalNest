document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('localnest_user');
  if (!userStr) {
    window.location.href = 'login.html';
    return;
  }

  const user = JSON.parse(userStr);
  document.getElementById('l-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('l-name').textContent = user.name;
  document.getElementById('l-role').textContent = user.role === 'both' ? 'Lender & Borrower' : 'Lender Account';
  document.getElementById('l-trust').textContent = user.trustScore || 50;

  loadLenderData();
  
  // Poll for updates every 10 seconds
  setInterval(loadLenderData, 10000);
});

let lenderListings = [];
let lenderTransactions = [];

async function loadLenderData() {
  const user = JSON.parse(localStorage.getItem('localnest_user'));
  if (!user) return;

  try {
    // 1. Load Listings
    const listingsRes = await fetch(`${API}/api/listings`, { headers: getAuthHeaders() });
    const listingsData = await listingsRes.json();
    if (listingsData.success) {
      lenderListings = listingsData.data.filter(l => l.postedBy && (l.postedBy._id === user._id || l.postedBy === user._id));
      document.getElementById('l-active-count').textContent = lenderListings.filter(l => l.isActive).length;
      renderLenderListings();
    }

    // 2. Load Transactions (acting as requests/exchanges)
    const txRes = await fetch(`${API}/api/transactions`, { headers: getAuthHeaders() });
    const txData = await txRes.json();
    if (txData.success) {
      lenderTransactions = txData.data;
      renderRequestsAndExchanges();
    }
  } catch (err) {
    console.error('Error fetching lender dashboard data:', err);
  }
}

function switchTab(tabName, element) {
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  // Deactivate all tab links
  document.querySelectorAll('.dashboard-tab').forEach(t => t.classList.remove('active'));

  // Show active tab content
  document.getElementById(`tab-${tabName}`).style.display = 'block';
  // Highlight clicked tab link
  element.classList.add('active');
}

function renderLenderListings() {
  const container = document.getElementById('myListingsContainer');
  if (lenderListings.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px; color:#888;">
        <h3>No active listings</h3>
        <p>Post your first listing to start sharing with your neighborhood!</p>
      </div>`;
    return;
  }

  container.innerHTML = lenderListings.map(listing => {
    const isResource = listing.type === 'resource';
    const subTitle = isResource ? listing.resourceDetails?.category || 'resource' : listing.type;
    return `
      <div class="dashboard-card" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:800; font-size:1.1rem; color:var(--dark);">${listing.title}</div>
          <div style="display:flex; gap:8px; margin-top:6px; align-items:center;">
            <span class="tag" style="text-transform:capitalize;">${subTitle}</span>
            <span class="tag" style="background:${listing.isActive ? '#eefbf4; color:var(--green)' : '#fff0f2; color:#ff5252'}">
              ${listing.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div>
          <button class="btn btn-outline btn-sm" onclick="deleteListing('${listing._id}')" style="border-color:#ff5252; color:#ff5252;">
            🗑️ Delete
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderRequestsAndExchanges() {
  const incomingContainer = document.getElementById('incomingRequestsContainer');
  const activeContainer = document.getElementById('activeExchangesContainer');
  const badge = document.getElementById('req-badge');

  // Filter transactions
  const pendingRequests = lenderTransactions.filter(t => t.status === 'pending');
  const activeExchanges = lenderTransactions.filter(t => t.status === 'approved' || t.status === 'pickedUp');

  // Update badge count
  if (pendingRequests.length > 0) {
    badge.textContent = pendingRequests.length;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }

  // Render Incoming Requests
  if (pendingRequests.length === 0) {
    incomingContainer.innerHTML = `
      <div style="text-align:center; padding:40px; color:#888;">
        <h3>No incoming borrow requests</h3>
        <p>When neighbors request your items, they'll appear here.</p>
      </div>`;
  } else {
    incomingContainer.innerHTML = pendingRequests.map(req => {
      const borrower = req.borrower || {};
      const listing = req.listing || {};
      return `
        <div class="request-item">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
            <div>
              <span style="font-size:0.8rem; font-weight:700; color:var(--primary); text-transform:uppercase;">Request to Borrow</span>
              <h3 style="font-weight:800; margin-top:2px;">${listing.title || 'Item'}</h3>
            </div>
            <span class="tag" style="background:var(--primary); color:white;">Pending</span>
          </div>
          <p style="font-size:0.9rem; margin-bottom:10px; background:#fff; padding:12px; border-radius:8px; border-left:4px solid var(--primary); font-style:italic;">
            "${req.message || 'No message provided'}"
          </p>
          <div style="font-size:0.85rem; color:#555; display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
            <div>👤 <strong>Borrower:</strong> ${borrower.name || 'Neighbor'}</div>
            <div>⭐ <strong>Trust Score:</strong> ${borrower.trustScore || 50}/100</div>
            <div>⏱️ <strong>Duration:</strong> ${req.borrowDays} day(s)</div>
            <div>📅 <strong>Requested Pickup:</strong> ${req.requestedPickupDate ? new Date(req.requestedPickupDate).toDateString() : 'Immediate'}</div>
          </div>
          <div class="action-btn-group">
            <button class="btn btn-sm btn-approve" onclick="updateTxStatus('${req._id}', 'approved')">✔️ Approve</button>
            <button class="btn btn-sm btn-reject" onclick="updateTxStatus('${req._id}', 'cancelled')">✕ Reject</button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Render Active Exchanges
  if (activeExchanges.length === 0) {
    activeContainer.innerHTML = `
      <div style="text-align:center; padding:40px; color:#888;">
        <h3>No active exchanges</h3>
        <p>Tracks items currently with borrowers or approved for handover.</p>
      </div>`;
  } else {
    activeContainer.innerHTML = activeExchanges.map(ex => {
      const borrower = ex.borrower || {};
      const listing = ex.listing || {};
      const isApproved = ex.status === 'approved';
      const actionText = isApproved ? 'Handover Item (Picked Up)' : 'Confirm Return (Complete)';
      const nextStatus = isApproved ? 'pickedUp' : 'returned';
      const statusLabel = isApproved ? 'Approved - Waiting Pickup' : 'Item Handed Over (Picked Up)';

      return `
        <div class="request-item" style="border-left: 4px solid var(--green); background:#fdfdfd;">
          <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
            <div>
              <span style="font-size:0.8rem; font-weight:700; color:var(--green); text-transform:uppercase;">Active Sharing</span>
              <h3 style="font-weight:800; margin-top:2px;">${listing.title || 'Item'}</h3>
            </div>
            <span class="tag" style="background:#eefbf4; color:var(--green); font-weight:700;">${statusLabel}</span>
          </div>
          <div style="font-size:0.85rem; color:#555; display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:14px;">
            <div>👤 <strong>Borrower:</strong> ${borrower.name || 'Neighbor'}</div>
            <div>📞 <strong>Phone:</strong> ${borrower.phone || 'N/A'}</div>
            <div>⏱️ <strong>Duration:</strong> ${ex.borrowDays} day(s)</div>
            <div>📅 <strong>Pickup Date:</strong> ${ex.actualPickupDate ? new Date(ex.actualPickupDate).toDateString() : (ex.requestedPickupDate ? new Date(ex.requestedPickupDate).toDateString() : 'N/A')}</div>
          </div>
          <button class="btn btn-sm btn-action" onclick="updateTxStatus('${ex._id}', '${nextStatus}')">
            🤝 ${actionText}
          </button>
        </div>
      `;
    }).join('');
  }
}

async function deleteListing(listingId) {
  if (!confirm('Are you sure you want to delete this listing?')) return;

  try {
    const res = await fetch(`${API}/api/listings/${listingId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      showToast('Listing removed successfully');
      loadLenderData();
    } else {
      showToast(data.message || 'Error deleting listing');
    }
  } catch (err) {
    showToast('Connection error');
  }
}

async function updateTxStatus(txId, status) {
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
      showToast(`Transaction updated successfully!`);
      loadLenderData();
      
      // Update trust score in localstorage if needed
      refreshCurrentUserProfile();
    } else {
      showToast(data.message || 'Failed to update transaction status');
    }
  } catch (err) {
    showToast('Connection error');
  }
}

async function refreshCurrentUserProfile() {
  try {
    const res = await fetch(`${API}/api/auth/me`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.user) {
      localStorage.setItem('localnest_user', JSON.stringify(data.user));
      document.getElementById('l-trust').textContent = data.user.trustScore;
    }
  } catch(e) {}
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
