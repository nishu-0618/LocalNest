// js/emergency.js
// Client-side controller for Bangalore emergency page

document.addEventListener('DOMContentLoaded', () => {
  fetchEmergencies();
});

let currentEmergencies = [];

async function fetchEmergencies() {
  const grid = document.getElementById('emergencyGrid');
  try {
    const response = await fetch(`${API}/api/needs?category=emergency`);
    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.message || 'Failed to fetch emergencies');
    }

    currentEmergencies = resData.data || [];
    renderEmergencies(currentEmergencies);
  } catch (error) {
    console.error('Error fetching emergencies:', error);
    grid.innerHTML = `<div class="error">❌ Error loading active emergencies: ${error.message}</div>`;
  }
}

function renderEmergencies(emergencies) {
  const grid = document.getElementById('emergencyGrid');
  grid.innerHTML = '';

  if (emergencies.length === 0) {
    grid.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 1px dashed #ef473a;">
        <div style="font-size: 3rem; margin-bottom: 16px;">💖</div>
        <h3 style="font-size: 1.4rem; font-weight: 800; color: var(--dark); margin-bottom: 8px;">All Clear!</h3>
        <p style="color: var(--muted); max-width: 400px; margin: 0 auto;">There are no active high-priority emergencies in your neighborhood right now. Great job keeping the community safe!</p>
      </div>
    `;
    return;
  }

  emergencies.forEach(item => {
    const user = item.userId || {};
    const userName = user.name || 'Anonymous Neighbor';
    const trustScore = user.trustScore !== undefined ? user.trustScore : 50;
    const rating = user.rating !== undefined ? user.rating : 4.0;
    const locationName = user.location?.address || 'Bangalore';
    const userImage = user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';

    // Format relative time
    const timeAgoStr = formatRelativeTime(new Date(item.createdAt));

    // Determine trust badge color class
    let trustClass = 'trust-mid';
    if (trustScore >= 70) trustClass = 'trust-high';
    if (trustScore < 50) trustClass = 'trust-low';

    // Urgency level display
    const urgencyLabel = item.urgency === 'critical' ? '⚡ CRITICAL' : '🚨 HIGH URGENCY';

    const initials = userName.charAt(0).toUpperCase();

    const card = document.createElement('div');
    card.className = 'emergency-card';
    card.innerHTML = `
      <div class="emergency-avatar-col">
        <div class="emergency-avatar">
          ${initials}
        </div>
        <div class="emergency-trust ${trustClass}">
          ★ ${trustScore} Trust
        </div>
      </div>
      <div class="emergency-info">
        <div class="emergency-meta-row">
          <span class="emergency-badge">${urgencyLabel}</span>
          <span style="color: var(--muted); font-size: 0.82rem; font-weight: 600;">📍 ${locationName}</span>
          <span style="color: #ef473a; font-size: 0.82rem; font-weight: 700; margin-left: auto;">⏱ ${timeAgoStr}</span>
        </div>
        <h3 class="emergency-title">${item.itemName}</h3>
        <p class="emergency-desc">${item.description}</p>
        <div style="font-size: 0.85rem; font-weight: 700; color: #555;">
          Requested By: <span style="color: var(--primary);">${userName}</span> (Rating: ${rating} ★)
        </div>
      </div>
      <div>
        <button class="help-action-btn" onclick="offerHelp('${item._id}')">Fulfill Need</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHrs < 24) return `${diffHrs} hours ago`;
  return date.toLocaleDateString();
}

function offerHelp(needId) {
  const modal = document.getElementById('contactModal');
  const body = document.getElementById('modalBody');
  
  const token = localStorage.getItem('localnest_token');
  const need = currentEmergencies.find(n => n._id === needId);

  if (!need) return;

  const user = need.userId || {};
  const userName = user.name || 'Neighbor';

  modal.classList.add('show');

  if (!token) {
    // Guest Experience - Action Blocked
    body.innerHTML = `
      <div class="guest-alert">
        🔑 <strong>Authentication Required</strong><br/>
        You must log in to view neighbor contact details and coordinate emergency assistance.
      </div>
      <div style="text-align: center;">
        <button onclick="window.location.href='login.html'" class="btn" style="background: #ef473a; color: white; width: 100%; border-radius: 30px; padding: 12px; font-weight: bold; border:none; cursor:pointer;">Go to Login / Demo Page</button>
      </div>
    `;
    return;
  }

  // Authenticated user - expose high-fidelity details
  body.innerHTML = `
    <div style="background: #fdf2f2; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #ffe3e3;">
      <h4 style="font-weight: 800; color: var(--dark); margin-bottom: 12px;">Contact Information:</h4>
      <p style="margin-bottom: 8px; font-size: 0.95rem;">📞 <strong>Phone:</strong> <a href="tel:${user.phone || '9876543210'}" style="color: #ef473a; font-weight: 700;">+91 ${user.phone || '9876543210'}</a></p>
      <p style="margin-bottom: 8px; font-size: 0.95rem;">✉ <strong>Email:</strong> <a href="mailto:${user.email || 'neighbor@demo.com'}" style="color: #ef473a; font-weight: 700;">${user.email || 'neighbor@demo.com'}</a></p>
      <p style="margin-bottom: 0; font-size: 0.95rem;">📍 <strong>Address:</strong> ${user.location?.address || 'Kengeri, Bangalore'}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <label style="display:block; font-weight:700; margin-bottom:6px; font-size:0.85rem; color:var(--muted);">Send Direct Message:</label>
      <textarea id="volunteerMsg" style="width:100%; height:80px; border-radius:8px; border:1px solid #ddd; padding:10px; font-family:inherit; font-size:0.9rem;" placeholder="Hi ${userName.split(' ')[0]}, I reside nearby. I have this ready and can help you immediately!"></textarea>
    </div>

    <button onclick="submitVolunteer('${need._id}')" class="btn" style="background:#ef473a; color:white; font-weight:bold; width:100%; border-radius:30px; padding:14px; border:none; cursor:pointer; box-shadow: 0 4px 12px rgba(239, 71, 58, 0.25);">🚀 Submit Help Volunteer Alert</button>
  `;
}

async function submitVolunteer(needId) {
  const textMsg = document.getElementById('volunteerMsg').value || 'I am ready to help you with this emergency!';
  const need = currentEmergencies.find(n => n._id === needId);
  const token = localStorage.getItem('localnest_token');

  if (!need || !token) return;

  try {
    // Send standard message or notify the poster of help
    // In our hyperlocal platform, let's create a notification in the database for the emergency requester!
    // And mark the need as fulfilled, or trigger a successful help action!
    const res = await fetch(`${API}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient: need.userId._id,
        type: 'match_found',
        message: `A neighbor volunteered to help with: "${need.itemName}"! Message: "${textMsg}"`,
        relatedListing: null
      })
    });

    if (!res.ok) {
      throw new Error('Failed to submit volunteer notification');
    }

    // Soft update local status
    showToast('💖 Help alert sent! The neighbor will reach out to you.');
    closeContactModal();

    // Optionally re-fetch to keep it synced
    fetchEmergencies();
  } catch (err) {
    console.error(err);
    showToast('❌ Error: ' + err.message);
  }
}

function closeContactModal() {
  document.getElementById('contactModal').classList.remove('show');
}
