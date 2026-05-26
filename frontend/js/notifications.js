let currentUserId = "";

document.addEventListener('DOMContentLoaded', () => {
  const userStr = localStorage.getItem('localnest_user');
  if (!userStr) {
    window.location.href = 'login.html';
    return;
  }
  const user = JSON.parse(userStr);
  currentUserId = user._id;
  
  loadNotifications();
});

async function loadNotifications() {
  const list = document.getElementById('notifList');
  
  try {
    const res = await fetch(`${API}/api/notifications/${currentUserId}`, { headers: getAuthHeaders() });
    const data = await res.json();
    
    if (!data.data || data.data.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <div class="empty-text">You have no notifications yet</div>
        </div>
      `;
      updateNavBadge(0);
      return;
    }
    
    updateNavBadge(data.unreadCount);
    renderNotifications(data.data);
    
  } catch (err) {
    list.innerHTML = '<div class="empty-state">Error loading notifications</div>';
  }
}

const notifIcons = {
  item_needed_nearby: '📢',
  match_found: '🤝',
  borrow_request: '📩',
  request_approved: '✅',
  return_reminder: '⏰',
  review_received: '⭐'
};

function renderNotifications(notifs) {
  const list = document.getElementById('notifList');
  
  list.innerHTML = notifs.map(n => {
    const icon = notifIcons[n.type] || '🔔';
    const isUnread = !n.isRead;
    
    const d = new Date(n.createdAt);
    const timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    return `
      <div class="notif-card ${isUnread ? 'notif-unread' : ''} notif-type-${n.type}" id="notif-${n._id}">
        <div class="notif-icon">${icon}</div>
        <div class="notif-content" onclick="${isUnread ? `markAsRead('${n._id}')` : ''}">
          <div class="notif-text">${n.message}</div>
          <div class="notif-time">${timeStr}</div>
        </div>
        ${isUnread ? `
          <div class="notif-action">
            <button class="mark-read-btn" onclick="markAsRead('${n._id}')">Mark Read</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function markAsRead(id) {
  try {
    await fetch(`${API}/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    
    // Update UI immediately
    const card = document.getElementById(`notif-${id}`);
    if (card) {
      card.classList.remove('notif-unread');
      const actionDiv = card.querySelector('.notif-action');
      if(actionDiv) actionDiv.remove();
      
      // Update badge
      const badge = document.getElementById('nav-notif-count');
      let count = parseInt(badge.textContent);
      if (count > 0) {
        updateNavBadge(count - 1);
      }
    }
  } catch (e) {
    showToast('Failed to mark as read');
  }
}

async function markAllRead() {
  try {
    await fetch(`${API}/api/notifications/read-all/${currentUserId}`, {
      method: 'PUT',
      headers: getAuthHeaders()
    });
    
    document.querySelectorAll('.notif-unread').forEach(el => el.classList.remove('notif-unread'));
    document.querySelectorAll('.notif-action').forEach(el => el.remove());
    updateNavBadge(0);
    showToast('All caught up! ✅');
  } catch (e) {
    showToast('Failed to mark all as read');
  }
}

function updateNavBadge(count) {
  const badge = document.getElementById('nav-notif-count');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-block' : 'none';
  }
}
