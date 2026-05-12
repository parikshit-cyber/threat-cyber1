let searchTimer;
document.addEventListener('DOMContentLoaded', () => { loadStats(); loadDossiers(); });

async function loadStats() {
  try {
    const res = await fetch('/api/dossiers/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('statDossiers').textContent = data.stats.dossiers;
      document.getElementById('statEvidence').textContent = data.stats.evidence;
      document.getElementById('statFiles').textContent = data.stats.files;
    }
  } catch (e) { console.error(e); }
}

async function loadDossiers(search = '') {
  try {
    const url = search ? `/api/dossiers?search=${encodeURIComponent(search)}` : '/api/dossiers';
    const res = await fetch(url);
    const data = await res.json();
    const grid = document.getElementById('dossierGrid');
    
    if (!data.success || data.dossiers.length === 0) {
      grid.innerHTML = '<div class="empty-state">// NO DOSSIERS IN VAULT // CREATE A NEW DOSSIER TO BEGIN</div>';
      return;
    }
    
    grid.innerHTML = data.dossiers.map(d => `
      <div class="dossier-card" onclick="window.location.href='/profile/${d._id}'">
        <div class="dossier-avatar">👤</div>
        <div class="dossier-info">
          <div class="dossier-name">${d.fullName.toUpperCase()}<span class="dossier-id">${d.dossierId}</span></div>
          <div class="dossier-meta">
            ${d.email ? `<span>› ${d.email}</span>` : ''}
            ${d.company ? `<span>› ${d.company}</span>` : ''}
          </div>
          <div class="dossier-evidence-count">${d.evidenceCount} EVIDENCE</div>
        </div>
        <button class="dossier-delete" onclick="event.stopPropagation();deleteDossier('${d._id}','${d.fullName}')">🗑</button>
      </div>
    `).join('');
  } catch (e) { console.error(e); }
}

function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadDossiers(document.getElementById('searchInput').value), 300);
}

function openNewDossierModal() {
  document.getElementById('modalTitle').textContent = '+ NEW DOSSIER';
  document.getElementById('editDossierId').value = '';
  ['fFullName','fAlias','fCompany','fRole','fEmail','fPhone','fDob','fIdNumber','fAddress','fSocial','fFamily','fNotes']
    .forEach(id => document.getElementById(id).value = '');
  document.getElementById('dossierModal').classList.add('active');
}

function closeModal() { document.getElementById('dossierModal').classList.remove('active'); }

async function saveDossier() {
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
  
  const editId = document.getElementById('editDossierId').value;
  const url = editId ? `/api/dossiers/${editId}` : '/api/dossiers';
  const method = editId ? 'PUT' : 'POST';
  
  try {
    const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const data = await res.json();
    if (data.success) {
      closeModal();
      showToast(editId ? '✓ DOSSIER UPDATED' : '✓ DOSSIER CREATED');
      loadDossiers();
      loadStats();
    } else {
      showToast('// ERROR: ' + data.message, true);
    }
  } catch (e) { showToast('// CONNECTION FAILURE', true); }
}

async function deleteDossier(id, name) {
  if (!confirm(`PURGE DOSSIER: ${name}?\n\nThis will permanently delete all associated evidence.`)) return;
  try {
    const res = await fetch(`/api/dossiers/${id}`, { method:'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('✓ DOSSIER PURGED'); loadDossiers(); loadStats(); }
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
