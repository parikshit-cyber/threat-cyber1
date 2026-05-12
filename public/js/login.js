document.addEventListener('DOMContentLoaded', () => {
  const digits = document.querySelectorAll('.code-digit');
  
  digits.forEach((digit, i) => {
    digit.addEventListener('input', (e) => {
      digit.classList.toggle('filled', digit.value.length > 0);
      if (digit.value.length === 1 && i < 3) digits[i + 1].focus();
    });
    digit.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !digit.value && i > 0) digits[i - 1].focus();
      if (e.key === 'Enter') authenticate();
    });
    digit.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').trim();
      for (let j = 0; j < Math.min(text.length, 4); j++) {
        digits[j].value = text[j];
        digits[j].classList.add('filled');
      }
      if (text.length >= 4) digits[3].focus();
    });
  });
});

async function authenticate() {
  const digits = document.querySelectorAll('.code-digit');
  const code = Array.from(digits).map(d => d.value).join('');
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('authBtn');
  
  if (code.length !== 4) {
    errEl.textContent = '// INCOMPLETE CODE SEQUENCE';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'AUTHENTICATING ...';
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    
    if (data.success) {
      errEl.style.color = 'var(--green)';
      errEl.textContent = '✓ ACCESS GRANTED';
      sessionStorage.setItem('authenticated', 'true');
      setTimeout(() => window.location.href = '/dashboard', 800);
    } else {
      errEl.style.color = 'var(--red)';
      errEl.textContent = data.message;
      document.getElementById('codeGroup').classList.add('shake');
      setTimeout(() => document.getElementById('codeGroup').classList.remove('shake'), 500);
      digits.forEach(d => { d.value = ''; d.classList.remove('filled'); });
      digits[0].focus();
      btn.disabled = false;
      btn.textContent = 'AUTHENTICATE';
    }
  } catch (err) {
    errEl.style.color = 'var(--red)';
    errEl.textContent = '// CONNECTION FAILURE';
    btn.disabled = false;
    btn.textContent = 'AUTHENTICATE';
  }
}
