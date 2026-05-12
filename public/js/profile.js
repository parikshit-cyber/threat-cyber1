let dossierId, dossierData, selectedFile;
document.addEventListener('DOMContentLoaded', () => {
  const parts = window.location.pathname.split('/');
  dossierId = parts[parts.length - 1];
  if (!dossierId) return window.location.href = '/dashboard';
  loadProfile();
  loadEvidence();
});

async function loadProfile() {
  try {
    const res = await fetch(`/api/dossiers/${dossierId}`);
    const data = await res.json();
    if (!data.success) return window.location.href = '/dashboard';
    dossierData = data.dossier;
    renderSidebar(dossierData);
  } catch (e) { console.error(e); }
}

function renderSidebar(d) {
  const f = (label, val) => `<div class="profile-field"><div class="profile-field-label">${label}</div><div class="profile-field-value ${val?'':'empty'}">${val || '—'}</div></div>`;
  document.getElementById('profileSidebar').innerHTML = `
    <div class="profile-avatar-section">
      <div class="profile-avatar-large">👤</div>
      <div class="profile-avatar-info">
        <div class="dossier-tag">DOSSIER ${d.dossierId}</div>
        <div class="profile-name">${d.fullName.toUpperCase()}</div>
      </div>
    </div>
    ${f('COMPANY', d.company)}${f('ROLE', d.role)}${f('EMAIL', d.email)}
    ${f('PHONE', d.phone)}${f('DATE OF BIRTH', d.dateOfBirth)}${f('ID NUMBER', d.idNumber)}
    ${f('ADDRESS', d.address)}${f('SOCIAL MEDIA', d.socialMedia)}${f('FAMILY INFO', d.familyInfo)}
    ${f('GENERAL NOTES', d.generalNotes)}
  `;
}

async function loadEvidence() {
  try {
    const res = await fetch(`/api/evidence/dossier/${dossierId}`);
    const data = await res.json();
    const list = document.getElementById('evidenceList');
    document.getElementById('evidenceCount').textContent = data.evidence?.length || 0;
    if (!data.success || !data.evidence.length) {
      list.innerHTML = '<div class="evidence-empty">// NO EVIDENCE ON RECORD</div>';
      return;
    }
    list.innerHTML = data.evidence.map(e => {
      const icons = { note:'📝', image:'🖼', file:'📄', report:'📋' };
      const size = e.fileSize ? `(${formatSize(e.fileSize)})` : '';
      const date = new Date(e.createdAt).toLocaleString();
      const isFile = e.type === 'file' || e.type === 'image';
      const isViewable = e.type === 'note' || e.type === 'report';

      let actionBtns = '';
      if (e.type === 'image') {
        actionBtns += `<button class="view-btn" onclick="event.stopPropagation();viewImage('${e._id}','${(e.title||e.originalName||'Image').replace(/'/g,"\\'")}')">👁 VIEW</button>`;
      } else if (e.type === 'file') {
        actionBtns += `<button class="view-btn" onclick="event.stopPropagation();viewFile('${e._id}','${(e.originalName||e.title||'File').replace(/'/g,"\\'")}','${e.mimeType||''}')">👁 VIEW</button>`;
      }
      if (isFile) {
        actionBtns += `<button class="download-btn" onclick="event.stopPropagation();downloadFile('${e._id}')">⬇ DOWNLOAD</button>`;
      }
      actionBtns += `<button class="delete-evidence-btn" onclick="event.stopPropagation();deleteEvidence('${e._id}')">🗑</button>`;

      return `<div class="evidence-item"${isViewable?` style="cursor:pointer" onclick="viewEvidence('${e._id}')"`:''}>
        <div class="evidence-icon ${e.type}">${icons[e.type]}</div>
        <div class="evidence-details">
          <div class="evidence-name">${e.title || e.originalName || 'Untitled'} ${size}</div>
          <div class="evidence-meta">${date}</div>
        </div>
        <span class="evidence-type-badge ${e.type}">${e.type.toUpperCase()}</span>
        <div class="evidence-item-actions">${actionBtns}</div>
      </div>`;
    }).join('');
  } catch (e) { console.error(e); }
}

function downloadFile(evidenceId) {
  const a = document.createElement('a');
  a.href = `/api/evidence/${evidenceId}/download`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 1000);
}

function viewImage(evidenceId, title) {
  const modal = document.getElementById('viewModal');
  document.getElementById('viewModalTitle').textContent = title || 'IMAGE PREVIEW';
  document.getElementById('viewContent').innerHTML = `
    <div style="text-align:center;padding:10px;">
      <img src="/api/evidence/${evidenceId}/view" alt="${title}"
           style="max-width:100%;max-height:70vh;border:1px solid var(--border);display:inline-block;" 
           onerror="this.outerHTML='<div style=\\'color:var(--red);padding:40px;\\'>// IMAGE FAILED TO LOAD</div>'" />
    </div>
    <div style="text-align:center;margin-top:12px;">
      <button class="download-btn" onclick="downloadFile('${evidenceId}')" style="display:inline-flex;">⬇ DOWNLOAD ORIGINAL</button>
    </div>`;
  modal.classList.add('active');
}

function viewFile(evidenceId, fileName, mimeType) {
  const modal = document.getElementById('viewModal');
  document.getElementById('viewModalTitle').textContent = fileName || 'FILE PREVIEW';
  const viewUrl = `/api/evidence/${evidenceId}/view`;

  // PDF or viewable types get an iframe preview
  if (mimeType === 'application/pdf' || (mimeType && mimeType.startsWith('text/'))) {
    document.getElementById('viewContent').innerHTML = `
      <iframe src="${viewUrl}" style="width:100%;height:70vh;border:1px solid var(--border);background:#111;" title="File preview"></iframe>
      <div style="text-align:center;margin-top:12px;">
        <button class="view-btn" onclick="window.open('${viewUrl}','_blank')" style="display:inline-flex;margin-right:8px;">⧉ OPEN IN TAB</button>
        <button class="download-btn" onclick="downloadFile('${evidenceId}')" style="display:inline-flex;">⬇ DOWNLOAD</button>
      </div>`;
  } else if (mimeType && mimeType.startsWith('image/')) {
    viewImage(evidenceId, fileName);
    return;
  } else if (mimeType && mimeType.startsWith('video/')) {
    document.getElementById('viewContent').innerHTML = `
      <video controls style="width:100%;max-height:70vh;border:1px solid var(--border);" src="${viewUrl}">Your browser does not support video.</video>
      <div style="text-align:center;margin-top:12px;">
        <button class="download-btn" onclick="downloadFile('${evidenceId}')" style="display:inline-flex;">⬇ DOWNLOAD</button>
      </div>`;
  } else if (mimeType && mimeType.startsWith('audio/')) {
    document.getElementById('viewContent').innerHTML = `
      <div style="padding:40px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">🎵</div>
        <audio controls src="${viewUrl}" style="width:100%;">Your browser does not support audio.</audio>
      </div>
      <div style="text-align:center;margin-top:12px;">
        <button class="download-btn" onclick="downloadFile('${evidenceId}')" style="display:inline-flex;">⬇ DOWNLOAD</button>
      </div>`;
  } else {
    // Unsupported preview — show info + download
    document.getElementById('viewContent').innerHTML = `
      <div style="padding:40px;text-align:center;">
        <div style="font-size:48px;margin-bottom:12px;">📦</div>
        <div style="color:var(--text);margin-bottom:4px;font-size:14px;">${fileName}</div>
        <div style="color:var(--text-dim);font-size:11px;margin-bottom:20px;">MIME: ${mimeType || 'unknown'}</div>
        <div style="color:var(--orange);font-size:12px;margin-bottom:20px;">// PREVIEW NOT AVAILABLE FOR THIS FILE TYPE</div>
        <button class="download-btn" onclick="downloadFile('${evidenceId}')" style="display:inline-flex;">⬇ DOWNLOAD FILE</button>
      </div>`;
  }
  modal.classList.add('active');
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}

function openEditModal() {
  if (!dossierData) return;
  const d = dossierData;
  document.getElementById('eName').value = d.fullName || '';
  document.getElementById('eAlias').value = d.alias || '';
  document.getElementById('eCompany').value = d.company || '';
  document.getElementById('eRole').value = d.role || '';
  document.getElementById('eEmail').value = d.email || '';
  document.getElementById('ePhone').value = d.phone || '';
  document.getElementById('eDob').value = d.dateOfBirth || '';
  document.getElementById('eIdNumber').value = d.idNumber || '';
  document.getElementById('eAddress').value = d.address || '';
  document.getElementById('eSocial').value = d.socialMedia || '';
  document.getElementById('eFamily').value = d.familyInfo || '';
  document.getElementById('eNotes').value = d.generalNotes || '';
  document.getElementById('editModal').classList.add('active');
}

function closeEditModal() { document.getElementById('editModal').classList.remove('active'); }

async function saveEdit() {
  const name = document.getElementById('eName').value.trim();
  if (!name) { showToast('// NAME REQUIRED', true); return; }
  const body = {
    fullName: name, alias: document.getElementById('eAlias').value.trim(),
    company: document.getElementById('eCompany').value.trim(), role: document.getElementById('eRole').value.trim(),
    email: document.getElementById('eEmail').value.trim(), phone: document.getElementById('ePhone').value.trim(),
    dateOfBirth: document.getElementById('eDob').value, idNumber: document.getElementById('eIdNumber').value.trim(),
    address: document.getElementById('eAddress').value.trim(), socialMedia: document.getElementById('eSocial').value.trim(),
    familyInfo: document.getElementById('eFamily').value.trim(), generalNotes: document.getElementById('eNotes').value.trim()
  };
  try {
    const res = await fetch(`/api/dossiers/${dossierId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    const data = await res.json();
    if (data.success) { closeEditModal(); showToast('✓ DOSSIER UPDATED'); loadProfile(); }
    else showToast('// ERROR', true);
  } catch (e) { showToast('// CONNECTION FAILURE', true); }
}

async function purgeDossier() {
  if (!confirm('PURGE THIS DOSSIER?\n\nAll evidence will be permanently destroyed.')) return;
  try {
    const res = await fetch(`/api/dossiers/${dossierId}`, { method:'DELETE' });
    const data = await res.json();
    if (data.success) window.location.href = '/dashboard';
    else showToast('// ERROR', true);
  } catch (e) { showToast('// CONNECTION FAILURE', true); }
}

function openEvidenceModal(type) {
  selectedFile = null;
  document.getElementById('evType').value = type;
  document.getElementById('evTitle').value = '';
  const titles = { note:'+ ADD NOTE', image:'+ ADD IMAGE', file:'+ ADD FILE', report:'+ ADD REPORT' };
  document.getElementById('evModalTitle').textContent = titles[type];
  const area = document.getElementById('evContentArea');
  if (type === 'note' || type === 'report') {
    area.innerHTML = `<textarea id="evContent" placeholder="${type === 'report' ? 'Write your intelligence report here...\n\nInclude observations, analysis, conclusions...' : 'Write your note here...'}" style="width:100%;min-height:200px;background:var(--bg-input);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:13px;padding:12px;resize:vertical;outline:none;"></textarea>`;
  } else {
    area.innerHTML = `
      <div class="file-upload-area" id="dropZone" onclick="document.getElementById('fileInput').click()">
        <div class="upload-icon">⬆</div>
        <div class="upload-text">Click or drag & drop to upload ${type}</div>
        <div class="file-selected" id="fileInfo"></div>
      </div>
      <input type="file" class="file-input-hidden" id="fileInput" ${type==='image'?'accept="image/*"':''} onchange="handleFileSelect(event)">`;
    setTimeout(() => {
      const dz = document.getElementById('dropZone');
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); if(e.dataTransfer.files.length){ selectedFile=e.dataTransfer.files[0]; document.getElementById('fileInfo').textContent='✓ '+selectedFile.name+' ('+formatSize(selectedFile.size)+')'; }});
    }, 100);
  }
  document.getElementById('evidenceModal').classList.add('active');
}

function handleFileSelect(e) {
  if (e.target.files.length) {
    selectedFile = e.target.files[0];
    document.getElementById('fileInfo').textContent = '✓ ' + selectedFile.name + ' (' + formatSize(selectedFile.size) + ')';
  }
}

function closeEvidenceModal() { document.getElementById('evidenceModal').classList.remove('active'); }

async function saveEvidence() {
  const type = document.getElementById('evType').value;
  const title = document.getElementById('evTitle').value.trim();
  
  if (type === 'note' || type === 'report') {
    const content = document.getElementById('evContent').value.trim();
    if (!content) { showToast('// CONTENT REQUIRED', true); return; }
    try {
      const res = await fetch(`/api/evidence/${type}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ dossierId, title: title || `Untitled ${type}`, content })
      });
      const data = await res.json();
      if (data.success) { closeEvidenceModal(); showToast('✓ ' + type.toUpperCase() + ' ADDED'); loadEvidence(); }
      else showToast('// ERROR', true);
    } catch (e) { showToast('// CONNECTION FAILURE', true); }
  } else {
    if (!selectedFile) { showToast('// NO FILE SELECTED', true); return; }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('dossierId', dossierId);
    formData.append('title', title || selectedFile.name);
    try {
      const res = await fetch(`/api/evidence/${type}`, { method:'POST', body: formData });
      const data = await res.json();
      if (data.success) { closeEvidenceModal(); showToast('✓ ' + type.toUpperCase() + ' UPLOADED'); loadEvidence(); }
      else showToast('// UPLOAD ERROR', true);
    } catch (e) { showToast('// CONNECTION FAILURE', true); }
  }
}

async function deleteEvidence(id) {
  if (!confirm('DELETE THIS EVIDENCE?')) return;
  try {
    const res = await fetch(`/api/evidence/${id}`, { method:'DELETE' });
    const data = await res.json();
    if (data.success) { showToast('✓ EVIDENCE PURGED'); loadEvidence(); }
    else showToast('// ERROR', true);
  } catch (e) { showToast('// CONNECTION FAILURE', true); }
}

async function viewEvidence(id) {
  try {
    const res = await fetch(`/api/evidence/${id}`);
    const data = await res.json();
    if (data.success) {
      document.getElementById('viewModalTitle').textContent = data.evidence.title || 'UNTITLED';
      document.getElementById('viewContent').textContent = data.evidence.content || '';
      document.getElementById('viewModal').classList.add('active');
    }
  } catch (e) { console.error(e); }
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  setTimeout(() => t.classList.remove('show'), 3000);
}
