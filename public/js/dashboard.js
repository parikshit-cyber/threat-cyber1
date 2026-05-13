let searchTimer;
document.addEventListener('DOMContentLoaded', () => { loadStats(); loadThreats(); });

async function loadStats() {
  try {
    const res = await fetch('/api/threats/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('statThreats').textContent = data.stats.threats;
      document.getElementById('statEvidence').textContent = data.stats.evidence;
      document.getElementById('statFiles').textContent = data.stats.files;
    }
  } catch (e) { console.error(e); }
}

async function loadThreats(search = '') {
  try {
    const url = search ? `/api/threats?search=${encodeURIComponent(search)}` : '/api/threats';
    const res = await fetch(url);
    const data = await res.json();
    const grid = document.getElementById('threatGrid');
    
    if (!data.success || data.threats.length === 0) {
      grid.innerHTML = '<div class="empty-state">// NO THREATS IN VAULT // CREATE A NEW THREAT TO BEGIN</div>';
      return;
    }
    
    grid.innerHTML = data.threats.map(d => `
      <div class="threat-card" onclick="window.location.href='/profile/${d._id}'">
        <div class="threat-avatar">👤</div>
        <div class="threat-info">
          <div class="threat-name">${d.fullName.toUpperCase()}<span class="threat-id">${d.threatId}</span></div>
          <div class="threat-meta">
            ${d.email ? `<span>› ${d.email}</span>` : ''}
            ${d.company ? `<span>› ${d.company}</span>` : ''}
          </div>
          <div class="threat-evidence-count">${d.evidenceCount} EVIDENCE</div>
        </div>
        <button class="threat-delete" onclick="event.stopPropagation();deleteThreat('${d._id}','${d.fullName}')">🗑</button>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadThreats(document.getElementById('searchInput').value), 300);
}

function openNewThreatModal() {
  document.getElementById('modalTitle').textContent = '+ NEW THREAT';
  document.getElementById('editThreatId').value = '';
  ['fFullName','fAlias','fCompany','fRole','fEmail','fPhone','fDob','fIdNumber','fAddress','fSocial','fFamily','fNotes']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('threatModal').classList.add('active');
}

function closeModal() { document.getElementById('threatModal').classList.remove('active'); }

async function saveThreat() {
  const name = document.getElementById('fFullName').value.trim();
  if (!name) { showToast('// NAME REQUIRED', true); return; }
  
  const body = {
    fullName: name,
    alias: document.getElementById('fAlias').value.trim(),
    company: document.getElementById('fCompany').value.trim(),
    role: document.getElementById('fRole').value.trim(),
    email: document.getElementById('fEmail').value.trim(),
    phone: document.getElementById('fPhone').value.trim(),
    dateOfBirth: document.getElementById('fDob').value,
    idNumber: document.getElementById('fIdNumber').value.trim(),
    address: document.getElementById('fAddress').value.trim(),
    socialMedia: document.getElementById('fSocial').value.trim(),
    familyInfo: document.getElementById('fFamily').value.trim(),
    generalNotes: document.getElementById('fNotes').value.trim()
  };
  
  const editId = document.getElementById('editThreatId').value;
  const url = editId ? `/api/threats/${editId}` : '/api/threats';
  const method = editId ? 'PUT' : 'POST';
  
  try {
    const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      closeModal();
      showToast(editId ? '✓ THREAT UPDATED' : '✓ THREAT CREATED');
      loadThreats();
      loadStats();
    } else {
      showToast('// ERROR: ' + data.message, true);
    }
  } catch (e) { showToast('// CONNECTION FAILURE', true); }
}

async function deleteThreat(id, name) {
  if (!confirm(`PURGE THREAT: ${name}?\n\nThis will permanently delete all associated evidence.`)) return;
  try {
    const res = await fetch(`/api/threats/${id}`, { method:'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('✓ THREAT PURGED'); loadThreats(); loadStats(); }
    else showToast('// ERROR: ' + data.message, true);
  } catch (e) { showToast('// CONNECTION FAILURE', true); }
}

function logout() {
  fetch('/api/auth/logout', { method:'POST' }).then(() => {
    sessionStorage.removeItem('authenticated');
    window.location.href = '/';
  });
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.classList.remove('show'), 3000);
}
