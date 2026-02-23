---
title: Local Queer Makers
layout: layouts/base.njk
---

<style>
.makers-intro { margin-bottom: 1.25rem; padding-bottom: .75rem; border-bottom: 3px dashed #6d28d9; }
.makers-grid { display: flex; flex-direction: column; gap: 1rem; }
.maker-card { background: linear-gradient(135deg,#111 0%,#2d1b4e 100%); border:2px solid #9333ea; border-radius:0; padding:1rem 1.25rem; color:#f5f5f5; box-shadow:4px 4px 0 #6d28d9; }
.maker-card:hover { transform: translate(-2px,-2px); box-shadow:6px 6px 0 #9333ea; }
.maker-biz { font-size:1.15rem; font-weight:700; color:#e9d5ff; margin:0 0 .25rem 0; letter-spacing:.02em; }
.maker-human { font-size:.9rem; color:#a78bfa; margin:0 0 .5rem 0; font-style:italic; }
.maker-desc { font-size:.95rem; line-height:1.5; color:#d4d4d4; margin:0 0 .75rem 0; }
.maker-links { display:flex; gap:.75rem; flex-wrap:wrap; }
.maker-links a { color:#c084fc !important; font-size:.85rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; border-bottom:2px solid #7c3aed !important; padding-bottom:1px; }
.makers-loading { text-align:center; padding:2rem; color:#6d28d9; font-weight:500; }
.makers-error { text-align:center; padding:2rem; color:#dc2626; background:#fef2f2; border:2px solid #dc2626; }
.makers-empty { text-align:center; padding:2rem; color:#6d28d9; font-style:italic; }
</style>


<h2 style="margin-bottom: 1.5rem;">Featured Makers</h2>

<div class="makers-intro">
Here are the makerz
</div>

<div id="makers-container" class="makers-grid">
  <div class="makers-loading">Loading makers...</div>
</div>

<script>
async function loadMakers() {
  const container = document.getElementById('makers-container');
  try {
    const response = await fetch('/api/makers');
    if (!response.ok) throw new Error('Failed to fetch makers');
    
    const makers = await response.json();
    
    if (makers.length === 0) {
      container.innerHTML = '<div class="makers-empty">No makers yet. Be the first to submit!</div>';
      return;
    }
    
    container.innerHTML = makers.map(maker => `
      <div class="maker-card">
        <div class="maker-biz">${maker.biz_name || maker.human_name}</div>
        <div class="maker-human">${maker.biz_name ? '– ' + maker.human_name : ''}</div>
        ${maker.description ? `<div class="maker-desc">${escapeHtml(maker.description)}</div>` : ''}
        <div class="maker-links">
          ${maker.website ? `<a href="${ensureUrl(maker.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
          ${maker.instagram ? `<a href="${ensureUrl(maker.instagram, 'https://instagram.com/')}" target="_blank" rel="noopener noreferrer">Instagram</a>` : ''}
          ${maker.facebook ? `<a href="${ensureUrl(maker.facebook, 'https://facebook.com/')}" target="_blank" rel="noopener noreferrer">Facebook</a>` : ''}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading makers:', error);
    container.innerHTML = '<div class="makers-error">Unable to load makers. Please try again later.</div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function ensureUrl(url, defaultProtocol = 'https://') {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('@')) return 'https://instagram.com/' + url.substring(1);
  return defaultProtocol + url;
}

// Load makers after DOMContentLoaded to ensure base layout finishes processing first
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadMakers, 100);
});
</script>

<hr style="margin: 1.5rem 0; border: none; border-top: 3px dashed #6d28d9;" />

<h3 style="margin-top: 0;">Add a maker!</h3>

<form id="maker-form" method="POST" onsubmit="return handleMakerSubmit(event)">
<p>
    <label for="human_name">Name (required)</label><br />
    <input id="human_name" name="human_name" required aria-required="true" placeholder="Your Real Human Name" maxlength="100" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:4px;" />
  </p>

  <p>
    <label for="email">Email (required)</label><br />
    <input type="email" id="email" name="email" required aria-required="true" placeholder="you@cool.biz" maxlength="255" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:4px;" />
  </p>

  <p>
    <label for="biz_name">Business Name (optional)</label><br />
    <input id="biz_name" name="biz_name" placeholder="Cool Biz" maxlength="150" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:4px;" />
  </p>

  <p>
    <label for="instagram">Instagram Link (optional)</label><br />
    <input id="instagram" name="instagram" placeholder="@username or full URL" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:4px;" />
  </p>

  <p>
    <label for="facebook">Facebook Link (optional)</label><br />
    <input type="text" id="facebook" name="facebook" placeholder="facebook page name or full URL" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:4px;" />
  </p>


  <p>
    <label for="website">Website Link (optional)</label><br />
    <input type="text" id="website" name="website" inputmode="url" placeholder="cool.biz" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:4px;" />
  </p>


<p>
    <label for="description">Short description (max 280 chars, optional)</label><br />
    <textarea id="description" name="description" maxlength="280" rows="4" placeholder="What do they make?" style="width:100%; padding:0.5rem; margin-top:0.25rem; border:1px solid #ddd; border-radius:4px; font-family:inherit;"></textarea>
  </p>

  <p>
    <button type="submit" style="background:#6d28d9; color:#fff; padding:0.75rem 1.5rem; border:none; border-radius:6px; cursor:pointer; font-size:1rem; font-weight:600;">Submit</button>
  </p>

  <p style="font-size:0.85rem; color:#555;">Submissions are moderated before posting.</p>
</form>

<script>
async function handleMakerSubmit(event) {
  event.preventDefault();
  
  const form = document.getElementById('maker-form');
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  submitBtn.style.background = '#6d28d9';
  
  try {
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);
    
    const response = await fetch('/.netlify/functions/submission-created', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Submission failed');
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    submitBtn.textContent = 'Success!';
    submitBtn.style.background = '#890a8d';
    
    setTimeout(() => {
      form.style.display = 'none';
      document.getElementById('submission-success').style.display = 'block';
    }, 600);
    
  } catch (error) {
    submitBtn.textContent = 'Error - Try Again';
    submitBtn.style.background = '#5a2671';
    submitBtn.disabled = false;
    
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.background = '#6d28d9';
      submitBtn.disabled = false;
    }, 3000);
  }
  
  return false;
}
</script>

<div id="submission-success" style="display: none; padding: 1.5rem; background: #f0fdf4; border: 2px solid #16a34a; border-radius: 6px; color: #15803d; text-align: center;">
  <div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Thanks for submitting a maker!</div>
  <p style="margin: 0; font-size: 0.95rem;">Your submission has been received and will be reviewed soon.</p>
</div>

<hr style="margin: 1.5rem 0; border: none; border-top: 3px dashed #6d28d9;" />
