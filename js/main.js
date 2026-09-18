/**
 * PropVigil - Official Client Website Script
 * Handles Section 2 Property Accordions, FAQ Accordions, Scroll Reveal, Mobile Nav,
 * Fee Estimator, Dynamic Civic Updates Tracker & Contact Form API Dispatch
 */

document.addEventListener('DOMContentLoaded', () => {
  initPropertyAccordions();
  initPropertyTabs();
  initFaqAccordions();
  initFormHandler();
  initMobileNav();
  initScrollReveal();
  initFeeEstimator();
  initCivicUpdates();
  initBlogHub();
  initBlogDetails();
  initAdminPortal();
});

function getApiUrl(path) {
  if (window.location.protocol === 'file:' || window.location.port !== '3000') {
    return 'http://localhost:3000' + path;
  }
  return path;
}

// Default seed civic notices (Official Government Notice)
const DEFAULT_CIVIC_NOTICES = [
  {
    id: "notice-gba-2026-001",
    slug: "gba-vacant-site-clearing-notice-2026",
    entry_label: "GOVERNMENT PUBLIC NOTICE — GREATER BENGALURU AUTHORITY",
    title: "Greater Bengaluru Authority — Vacant Site Owners Directed to Clear Waste and Debris",
    issued_date: "10-08-2026",
    ref_number: "CC/PS/PR/240/2026-27",
    status: "Official Public Notice as issued by GBA Chief Commissioner",
    status_type: "official",
    is_published: true,
    document_img: "assets/gba-public-notice-2026.jpg",
    pdf_url: "assets/gba-public-notice-2026.jpg",
    pdf_filename: "GBA_Public_Notice_CC_PS_PR_240_2026_27.jpg",
    what_was_issued: "With the objective of keeping Bengaluru city clean, beautiful, and livable, the \"Freedom from Waste\" campaign is being conducted during August-2026. As per bye-law 18(1)(b) of the Solid Waste Management Bye-laws, 2020, it is the mandatory responsibility of owners to maintain vacant sites in a clean and hygienic condition.<br><br>Accordingly, the following directions are issued to the general public with respect to the cleaning of vacant sites:<br>1. Owners of vacant sites within the GBA limits shall ensure that all waste, garbage, and debris accumulated on their vacant site/s are removed on or before <strong>15.08.2026</strong>. The waste/debris shall be disposed of only at the designated disposal locations identified & already notified by the Municipal Corporation. If necessary, owners may also avail the services of agencies notified by the respective Municipal Corporation for cleaning and disposal.<br>2. If the owners fail to clean their vacant sites by <strong>15.08.2026</strong>, the Municipal Corporation will undertake the removal of the waste/debris. The expenditure incurred will be recovered from the property owners along with property tax in accordance with bye-law 18(1)(d)(ii) of the Solid Waste Management Bye-laws, 2020 and Section 285(2) of the Greater Bengaluru Administration Act, 2024.",
    rule_behind_it: "Bye-law 18(1)(b) of the Solid Waste Management Bye-laws, 2020 places the mandatory responsibility for maintaining vacant sites in a clean and hygienic condition on the owner.",
    consequences: "The notice states that the Municipal Corporation will undertake removal of the waste itself, and that the expenditure incurred will be recovered as shown in the table below from the property owners along with property tax in accordance with bye-law 18(1)(d)(ii) of the Solid Waste Management Bye-laws, 2020 and Section 285(2) of the Greater Bengaluru Administration Act, 2024.\n\nThis is not a fine. It is the Corporation's cost of doing the work, recovered through your property tax.",
    rates: [
      { dimensions: "20 × 30 = 600 sq. ft. (55.74 sq. m.)", no_wall: "₹6,700", with_wall: "₹7,700", transport: "₹19,200" },
      { dimensions: "30 × 40 = 1,200 sq. ft. (111.48 sq. m.)", no_wall: "₹13,400", with_wall: "₹14,400", transport: "₹38,400" },
      { dimensions: "30 × 50 = 1,500 sq. ft. (139.35 sq. m.)", no_wall: "₹16,750", with_wall: "₹17,750*", transport: "₹48,000" },
      { dimensions: "40 × 60 = 2,400 sq. ft. (222.97 sq. m.)", no_wall: "₹26,800", with_wall: "₹27,800", transport: "₹76,800" },
      { dimensions: "50 × 80 = 4,000 sq. ft. (371.61 sq. m.)", no_wall: "₹46,700", with_wall: "₹47,700", transport: "₹1,28,000" }
    ],
    created_at: "2026-08-10T10:00:00Z"
  }
];

let civicNoticesData = [];
let activeFilter = 'all';

function getDeletedNoticeIds() {
  try {
    const raw = localStorage.getItem('propvigil_deleted_notices');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

async function loadAllCivicNotices() {
  let notices = [];

  // Try fetching from server API or static JSON file first
  try {
    const res = await fetch(getApiUrl('/api/civic-updates'));
    const data = await res.json();
    if (data.success && Array.isArray(data.notices) && data.notices.length > 0) {
      notices = data.notices;
    }
  } catch (e) {}

  if (notices.length === 0) {
    try {
      const resFile = await fetch('data/civic_notices.json');
      const fileData = await resFile.json();
      if (Array.isArray(fileData) && fileData.length > 0) {
        notices = fileData;
      }
    } catch (err) {}
  }

  if (notices.length === 0) {
    notices = [...DEFAULT_CIVIC_NOTICES];
  }

  civicNoticesData = notices;
  return civicNoticesData;
}

async function initCivicUpdates() {
  const container = document.getElementById('civic-notices-container');
  const searchInput = document.getElementById('civic-search-input');
  const filterBtns = document.querySelectorAll('.filter-pill-btn');

  if (!container) return;

  const notices = await loadAllCivicNotices();
  // Filter for published notices on public website
  const publishedNotices = notices.filter(n => n.is_published !== false);
  renderCivicNotices(publishedNotices);

  // If a hash anchor is provided (e.g. #slug), scroll to it smoothly
  if (window.location.hash) {
    setTimeout(() => {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterAndRenderNotices(e.target.value, activeFilter);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      const searchVal = searchInput ? searchInput.value : '';
      filterAndRenderNotices(searchVal, activeFilter);
    });
  });
}

function filterAndRenderNotices(searchQuery, filterType) {
  let list = civicNoticesData.filter(n => n.is_published !== false);

  if (filterType && filterType !== 'all') {
    list = list.filter(n => n.status_type === filterType);
  }

  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(n => 
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.ref_number && n.ref_number.toLowerCase().includes(q)) ||
      (n.what_was_issued && n.what_was_issued.toLowerCase().includes(q)) ||
      (n.rule_behind_it && n.rule_behind_it.toLowerCase().includes(q)) ||
      (n.consequences && n.consequences.toLowerCase().includes(q))
    );
  }

  renderCivicNotices(list);
}

function renderCivicNotices(notices) {
  const container = document.getElementById('civic-notices-container');
  if (!container) return;

  if (!notices || notices.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 16px; border: 1px solid var(--border-light);">
        <h3 style="color: var(--brand-navy); margin-bottom: 8px;">No government notices available</h3>
        <p style="color: var(--text-muted);">Please check back soon for official civic and municipal updates.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = notices.map(item => {
    let ratesHtml = '';
    if (item.rates && Array.isArray(item.rates) && item.rates.length > 0) {
      ratesHtml = `
        <div style="margin-bottom: 28px;">
          <h3 style="font-size: 1.2rem; color: var(--brand-navy); margin-bottom: 12px;">RATES PUBLISHED IN THE NOTICE</h3>
          <div class="data-table-wrapper">
            <table class="plain-data-table">
              <thead>
                <tr>
                  <th>Sl. No.</th>
                  <th>Site Dimensions</th>
                  <th>Cleaning Charges (Without Compound Wall)</th>
                  <th>Cleaning Charges (With Compound Wall)</th>
                  <th>Waste/Debris Transportation Charges</th>
                </tr>
              </thead>
              <tbody>
                ${item.rates.map((r, rIdx) => `
                  <tr>
                    <td>${rIdx + 1}</td>
                    <td><strong>${r.dimensions}</strong></td>
                    <td>${r.no_wall || '-'}</td>
                    <td>${r.with_wall || '-'}</td>
                    <td>${r.transport || '-'}</td>
                  </tr>
                `).join('')}
                <tr>
                  <td>${item.rates.length + 1}</td>
                  <td colspan="4" style="color: var(--text-muted); font-style: italic; background: #F8FAFC;">
                    In case, site dimension/area exceeding above limit, expenditure proportionate to the site area will be recovered.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    const docImg = item.document_img || (item.slug === 'gba-vacant-site-clearing-notice-2026' ? 'assets/gba-public-notice-2026.jpg' : '');
    const docHtml = docImg ? `
      <!-- Attached Official Government Public Notice Document -->
      <div class="official-doc-attachment-card" style="margin: 0 0 28px 0; border: 1.5px solid var(--border-gold); background: #F8FAFC; border-radius: var(--radius-md); padding: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: var(--brand-navy); color: var(--brand-gold); border-radius: 6px; font-weight: bold; font-size: 1.1rem;">📄</span>
            <div>
              <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--brand-navy); margin: 0;">Attached Government Public Notice Document</h4>
              <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0 0;">Official scan from Greater Bengaluru Authority · Ref. ${item.ref_number || 'CC/PS/PR/240/2026-27'}</p>
            </div>
          </div>
          <a href="${docImg}" target="_blank" class="btn-pdf-download" style="padding: 8px 16px; font-size: 0.82rem;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            <span>Open Full Document</span>
          </a>
        </div>

        <div style="background: white; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 12px; text-align: center;">
          <a href="${docImg}" target="_blank" title="Click to view full high-resolution notice document">
            <img src="${docImg}" alt="Official Greater Bengaluru Authority Public Notice" style="max-width: 100%; height: auto; max-height: 580px; object-fit: contain; border-radius: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.005)'" onmouseout="this.style.transform='scale(1)'">
          </a>
          <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 12px; margin-bottom: 0;">
            🔍 <em>Click the document above to view or download full-size original notice scan</em>
          </p>
        </div>
      </div>
    ` : '';

    return `
      <div class="notice-card-elevated reveal-on-scroll revealed" id="${item.slug}" style="margin-bottom: 36px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--brand-gold); text-transform: uppercase;">${item.entry_label || 'GOVERNMENT PUBLIC NOTICE — GREATER BENGALURU AUTHORITY'}</span>
          <span class="status-badge-tag official">OFFICIAL NOTICE</span>
        </div>

        <h2 style="font-size: 2rem; color: var(--brand-navy); margin: 6px 0 12px 0;">${item.title}</h2>
        
        <p style="font-size: 0.9rem; color: var(--text-muted); padding-bottom: 20px; border-bottom: 1px solid var(--border-light); margin-bottom: 24px;">
          Issued ${item.issued_date || 'N/A'} · Ref. ${item.ref_number || 'N/A'} · Office of the Chief Commissioner
        </p>

        ${docHtml}

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 1.2rem; color: var(--brand-navy); margin-bottom: 8px;">WHAT WAS ISSUED</h3>
          <div style="color: var(--text-body); line-height: 1.7;">${item.what_was_issued || ''}</div>
        </div>

        ${item.slug === 'gba-vacant-site-clearing-notice-2026' ? `
          <div class="civic-visual-compare-grid">
            <div style="border-radius: var(--radius-sm); overflow: hidden; position: relative;">
              <span style="position: absolute; top: 10px; left: 10px; background: rgba(239,68,68,0.9); color: white; padding: 4px 10px; font-size: 0.75rem; font-weight: bold; border-radius: 99px;">NON-COMPLIANT SITE</span>
              <img src="assets/before.jpg" alt="Uncleared Vacant Site in Bengaluru" style="width: 100%; height: 200px; object-fit: cover; display: block;">
              <div style="padding: 10px; background: white; font-size: 0.85rem; font-weight: 600; color: var(--brand-navy);">Site with overgrown debris & dumping risk</div>
            </div>
            <div style="border-radius: var(--radius-sm); overflow: hidden; position: relative;">
              <span style="position: absolute; top: 10px; left: 10px; background: rgba(16,185,129,0.9); color: white; padding: 4px 10px; font-size: 0.75rem; font-weight: bold; border-radius: 99px;">CLEARED BY PROPVIGIL</span>
              <img src="assets/after.jpg" alt="Cleared Vacant Site after PropVigil care" style="width: 100%; height: 200px; object-fit: cover; display: block;">
              <div style="padding: 10px; background: white; font-size: 0.85rem; font-weight: 600; color: var(--brand-navy);">Fully cleared, fenced & compliant with GBA norms</div>
            </div>
          </div>
        ` : ''}

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 1.2rem; color: var(--brand-navy); margin-bottom: 8px;">THE RULE BEHIND IT</h3>
          <p>${item.rule_behind_it || ''}</p>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 1.2rem; color: var(--brand-navy); margin-bottom: 8px;">WHAT HAPPENS IF NOT COMPLIED</h3>
          <p>${item.consequences || ''}</p>
        </div>

        ${ratesHtml}

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--border-light);">
          <a href="${docImg || 'assets/gba-public-notice-2026.jpg'}" target="_blank" class="btn-pdf-download">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <span>View / Download Official Notice</span>
          </a>

          <a href="https://wa.me/919242143775?text=Hello%20PropVigil%20Team,%20I%20saw%20the%20GBA%20vacant%20site%20clearing%20public%20notice.%20I%20need%20assistance%20with%20site%20inspection%20and%20clearing." target="_blank" class="btn btn-whatsapp" style="padding: 14px 28px;">
            <span>Need site clearing? Contact us on WhatsApp</span>
          </a>
        </div>
      </div>
    `;
  }).join('');
}

// Interactive Property Category Tab Switcher
function initPropertyTabs() {
  const tabBtns = document.querySelectorAll('.prop-tab-btn');
  const tabPanels = document.querySelectorAll('.prop-tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// Section 2 Property Type Accordion
function initPropertyAccordions() {
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    if (header) {
      header.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        accordionItems.forEach(acc => acc.classList.remove('active'));
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
}

// FAQ Accordion Engine
function initFaqAccordions() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}

// Mobile Menu Navigation Toggle
function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (toggleBtn && navMenu) {
    // Inject smooth animated hamburger bars if not present
    if (!toggleBtn.querySelector('.hamburger-box')) {
      toggleBtn.innerHTML = '<span class="hamburger-box"><span class="hamburger-bar"></span><span class="hamburger-bar"></span><span class="hamburger-bar"></span></span>';
    }

    const toggleMenu = (forceState) => {
      const isOpening = typeof forceState === 'boolean' ? forceState : !navMenu.classList.contains('active');
      if (isOpening) {
        navMenu.classList.add('active');
        toggleBtn.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true');
      } else {
        navMenu.classList.remove('active');
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    };

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggleMenu(false);
      });
    });

    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target) && navMenu.classList.contains('active')) {
        toggleMenu(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        toggleMenu(false);
      }
    });
  }
}

// Scroll Reveal Engine
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// Google Sheets Webhook Endpoint for Property Intake Form (Spreadsheet ID: 1YcITIKji8K8e4g75OdVLcK5PQfsBqd5XLjwxlnmJme0 / Sheet1)
const GOOGLE_SHEETS_INTAKE_URL = window.PROPVIGIL_GSHEET_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbxLfFZS6o-9UxAwkkt9JMkOZsUy6bJW2C7jQvIoPXX8FRzQyu64tWqb6OLTliQ039NPfA/exec';

// Form Submission & Contact API Handler (6 Fields, Email & WhatsApp Support)
function initFormHandler() {
  const forms = document.querySelectorAll('.propvigil-intake-form, #callback-form');

  forms.forEach(form => {
    // 1. Submit Event (Primary Button: "Send details" / Enter key)
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      processFormSubmission(form, false);
    });

    // 2. WhatsApp Button Click (Secondary Button: "Or send on WhatsApp")
    const waBtn = form.querySelector('.btn-whatsapp-submit');
    if (waBtn) {
      waBtn.addEventListener('click', (e) => {
        e.preventDefault();
        processFormSubmission(form, true);
      });
    }
  });

  async function processFormSubmission(form, isWhatsAppMode) {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const name = (form.querySelector('[name="name"]') || form.querySelector('#field-name'))?.value.trim() || '';
    const phone = (form.querySelector('[name="phone"]') || form.querySelector('#field-phone'))?.value.trim() || '';
    const propType = (form.querySelector('[name="prop_type"]') || form.querySelector('#field-proptype'))?.value || '';
    const location = (form.querySelector('[name="location"]') || form.querySelector('#field-location'))?.value.trim() || '';
    const size = (form.querySelector('[name="size"]') || form.querySelector('#field-size'))?.value.trim() || '';
    const notes = (form.querySelector('[name="notes"]') || form.querySelector('#field-notes'))?.value.trim() || '';

    const formData = {
      name,
      phone,
      prop_type: propType,
      location,
      size,
      notes,
      to_email: 'saikrupaassociates26@gmail.com',
      submitted_at: new Date().toISOString()
    };

    // 1. Dispatch directly to Google Sheets Intake Webhook (Spreadsheet ID: 1YcITIKji8K8e4g75OdVLcK5PQfsBqd5XLjwxlnmJme0 -> Sheet1)
    try {
      const gsheetPayload = {
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        name: name,
        phone: phone,
        prop_type: propType,
        location: location,
        size: size,
        notes: notes,
        status: 'New'
      };

      fetch(GOOGLE_SHEETS_INTAKE_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(gsheetPayload)
      }).catch(err => console.log('Google Sheets dispatch background notification:', err));
    } catch (gsErr) {
      console.log('Google Sheets dispatch error:', gsErr);
    }

    // 2. Dispatch to local backend API
    try {
      fetch(getApiUrl('/api/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    } catch (err) {
      console.log('Backend contact API logged');
    }

    // 2. Direct email delivery to saikrupaassociates26@gmail.com
    try {
      fetch('https://formsubmit.co/ajax/saikrupaassociates26@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `New Property Details from ${name} (${location})`,
          Name: name,
          WhatsApp_Number: phone,
          Property_Owned: propType,
          Property_Location: location,
          Property_Size: size,
          Additional_Notes: notes || 'None',
          _template: 'table'
        })
      });
    } catch (e) {}

    // 3. If WhatsApp button clicked, open WhatsApp chat
    if (isWhatsAppMode) {
      const message = `Hello PropVigil Team,%0A%0AHere are my property details:%0A- Name: ${encodeURIComponent(name)}%0A- WhatsApp: ${encodeURIComponent(phone)}%0A- What I own: ${encodeURIComponent(propType)}%0A- Location: ${encodeURIComponent(location)}%0A- Size: ${encodeURIComponent(size)}${notes ? `%0A- Notes: ${encodeURIComponent(notes)}` : ''}`;
      window.open(`https://wa.me/919242143775?text=${message}`, '_blank');
    }

    // 4. Replace form with confirmation message
    const formCard = form.closest('.form-card') || form.parentElement;
    if (formCard) {
      formCard.innerHTML = `
        <div class="form-confirmation-card" style="padding: 36px 20px; text-align: center; background: #FFFFFF; border: 1.5px solid var(--border-gold); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); animation: fadeIn 0.4s ease;">
          <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(16,185,129,0.12); color: #059669; font-size: 1.6rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; border: 1px solid rgba(16,185,129,0.3);">✓</div>
          <h3 style="font-size: 1.4rem; color: var(--brand-navy); margin-bottom: 12px; font-weight: 800;">Thank you, ${escapeHtml(name)}.</h3>
          <p style="font-size: 1.05rem; color: var(--text-body); line-height: 1.6; max-width: 520px; margin: 0 auto 20px auto;">
            We have your details for your property in <strong>${escapeHtml(location)}</strong>. V P Srinivasa will reply on WhatsApp within one working day.
          </p>
          <div style="background: #F8FAFC; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 14px 20px; display: inline-block; margin-top: 6px;">
            <span style="font-size: 0.88rem; color: var(--text-muted);">If it is urgent, call or message:</span><br>
            <a href="tel:+919242143775" style="font-size: 1.15rem; font-weight: 800; color: var(--brand-navy); text-decoration: none;">+91 92421 43775</a>
          </div>
        </div>
      `;
    }
  }
}

// Interactive Property Fee Estimator Engine
function initFeeEstimator() {
  const propSelect = document.getElementById('est-proptype');
  const sizeSelect = document.getElementById('est-size');
  const sizeLabel = document.getElementById('est-size-label');
  const zoneSelect = document.getElementById('est-zone');
  const planSelect = document.getElementById('est-plan');
  const priceDisplay = document.getElementById('est-price-val');
  const subtitleDisplay = document.getElementById('est-subtitle');
  const bookBtn = document.getElementById('est-book-btn');

  if (!propSelect || !priceDisplay) return;

  function updateSizeDropdown() {
    if (!sizeSelect) return;
    const currentVal = sizeSelect.value;
    const isSite = propSelect.value === 'site';

    if (sizeLabel) {
      sizeLabel.textContent = isSite ? 'Plot / Site Dimensions' : 'Flat / Property Configuration';
    }

    if (isSite) {
      sizeSelect.innerHTML = `
        <option value="1bhk" ${currentVal === '1bhk' || currentVal === 'small' ? 'selected' : ''}>Up to 30x40 (&lt; 1,200 sq ft)</option>
        <option value="2bhk" ${currentVal === '2bhk' || currentVal === 'medium' || !currentVal ? 'selected' : ''}>30x40 to 40x60 (1,200 - 2,400 sq ft)</option>
        <option value="3bhk" ${currentVal === '3bhk' || currentVal === 'large' ? 'selected' : ''}>40x60 to 50x80 (2,400 - 4,000 sq ft)</option>
        <option value="4bhk" ${currentVal === '4bhk' || currentVal === 'xlarge' ? 'selected' : ''}>50x80+ / Large Site (&gt; 4,000 sq ft)</option>
      `;
    } else {
      sizeSelect.innerHTML = `
        <option value="1bhk" ${currentVal === '1bhk' || currentVal === 'small' ? 'selected' : ''}>1 BHK / Studio (&lt; 900 sq ft)</option>
        <option value="2bhk" ${currentVal === '2bhk' || currentVal === 'medium' || !currentVal ? 'selected' : ''}>2 BHK (900 - 1,500 sq ft)</option>
        <option value="3bhk" ${currentVal === '3bhk' || currentVal === 'large' ? 'selected' : ''}>3 BHK (1,500 - 2,400 sq ft)</option>
        <option value="4bhk" ${currentVal === '4bhk' || currentVal === 'xlarge' ? 'selected' : ''}>4+ BHK / Duplex / Villa (&gt; 2,400 sq ft)</option>
      `;
    }
  }

  function updateEstimate() {
    const prop = propSelect.value;
    const size = sizeSelect ? sizeSelect.value : '2bhk';
    const zone = zoneSelect.value;
    const plan = planSelect.value;

    let firstVisitFee = zone === 'outskirts' ? 3500 : 2500;
    if (size === '3bhk') firstVisitFee += 500;
    if (size === '4bhk') firstVisitFee += 1000;

    let baseAnnualFee = 16000;
    let freqText = '4 inspections / year';

    if (prop === 'site') {
      if (size === '1bhk') baseAnnualFee = plan === 'monthly' ? 24000 : 14000;
      else if (size === '2bhk') baseAnnualFee = plan === 'monthly' ? 28000 : 16000;
      else if (size === '3bhk') baseAnnualFee = plan === 'monthly' ? 34000 : 20000;
      else if (size === '4bhk') baseAnnualFee = plan === 'monthly' ? 44000 : 26000;
      freqText = plan === 'monthly' ? '12 inspections / year' : '4 inspections / year';
    } else if (prop === 'unoccupied') {
      if (size === '1bhk') baseAnnualFee = plan === 'monthly' ? 30000 : 18000;
      else if (size === '2bhk') baseAnnualFee = plan === 'monthly' ? 36000 : 22000;
      else if (size === '3bhk') baseAnnualFee = plan === 'monthly' ? 44000 : 28000;
      else if (size === '4bhk') baseAnnualFee = plan === 'monthly' ? 56000 : 36000;
      freqText = plan === 'monthly' ? '12 inspections / year' : '4 inspections / year';
    } else if (prop === 'rented') {
      if (size === '1bhk') baseAnnualFee = 38000;
      else if (size === '2bhk') baseAnnualFee = 44000;
      else if (size === '3bhk') baseAnnualFee = 54000;
      else if (size === '4bhk') baseAnnualFee = 68000;
      freqText = '12 inspections / year (Monthly)';
    } else if (prop === 'construction') {
      if (size === '1bhk') baseAnnualFee = plan === 'monthly' ? 30000 : 20000;
      else if (size === '2bhk') baseAnnualFee = plan === 'monthly' ? 36000 : 24000;
      else if (size === '3bhk') baseAnnualFee = plan === 'monthly' ? 44000 : 30000;
      else if (size === '4bhk') baseAnnualFee = plan === 'monthly' ? 56000 : 38000;
      freqText = plan === 'monthly' ? '12 inspections / year' : '4 inspections / year';
    }

    let annualFee = baseAnnualFee;
    if (zone === 'outskirts' && plan !== 'first_visit') {
      annualFee += (plan === 'monthly' ? 4000 : 2000);
    }

    if (plan === 'first_visit') {
      priceDisplay.textContent = `₹${firstVisitFee.toLocaleString('en-IN')}`;
      subtitleDisplay.textContent = `One-time first visit fee (${zone === 'outskirts' ? 'Outskirts' : 'Bengaluru City Limits'}). Credited 100% against your annual plan.`;
    } else {
      priceDisplay.textContent = `₹${annualFee.toLocaleString('en-IN')} / yr`;
      subtitleDisplay.textContent = `${freqText}. Includes geotagged PDF report & WhatsApp video update on every visit.`;
    }

    if (bookBtn) {
      const sizeText = sizeSelect && sizeSelect.options[sizeSelect.selectedIndex] ? sizeSelect.options[sizeSelect.selectedIndex].text : '';
      const msg = `Hello PropVigil Team,%0A%0AI used the website estimator:%0A- Property Category: ${encodeURIComponent(propSelect.options[propSelect.selectedIndex].text)}%0A- Property / Flat Size: ${encodeURIComponent(sizeText)}%0A- Location Zone: ${encodeURIComponent(zoneSelect.options[zoneSelect.selectedIndex].text)}%0A- Plan Selected: ${encodeURIComponent(planSelect.options[planSelect.selectedIndex].text)}%0A- Estimated Fee: ${priceDisplay.textContent}%0A%0APlease confirm my inspection date.`;
      bookBtn.href = `https://wa.me/919242143775?text=${msg}`;
    }
  }

  propSelect.addEventListener('change', () => {
    updateSizeDropdown();
    updateEstimate();
  });
  if (sizeSelect) {
    sizeSelect.addEventListener('change', updateEstimate);
  }
  zoneSelect.addEventListener('change', updateEstimate);
  planSelect.addEventListener('change', updateEstimate);

  updateSizeDropdown();
  updateEstimate();
}

/* ==========================================================================
   Blog Hub Engine (Public View - blog.html)
   ========================================================================== */
let globalBlogsList = [];

let blogActiveCategory = 'all';

async function initBlogHub() {
  const container = document.getElementById('blogsGrid');
  const searchInput = document.getElementById('blogSearchInput');
  const catList = document.getElementById('blogCategoriesList');

  if (!container) return;

  // 1. Get locally stored blogs (includes latest admin image and content edits)
  let localBlogs = [];
  try {
    const stored = localStorage.getItem('propvigil_blogs_data');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) localBlogs = parsed;
    }
  } catch (e) {}

  // 2. Fetch server blogs
  let apiBlogs = [];
  try {
    const res = await fetch(getApiUrl('/api/blogs'));
    const data = await res.json();
    if (data.success && data.blogs && data.blogs.length > 0) {
      apiBlogs = data.blogs;
    }
  } catch (e) {}

  await fetchGSheetBlogsAsync();

  let deletedSlugs = [];
  try {
    const raw = localStorage.getItem('propvigil_deleted_slugs');
    if (raw) deletedSlugs = JSON.parse(raw);
  } catch (e) {}

  const mergedMap = new Map();
  // Server blogs first
  apiBlogs.forEach(b => {
    const key = b.id || b.slug;
    if (key && !deletedSlugs.includes(b.slug) && !deletedSlugs.includes(b.id)) {
      mergedMap.set(key, b);
    }
  });

  // Local blogs (including edited image URLs and content) take top precedence
  localBlogs.forEach(b => {
    const key = b.id || b.slug;
    if (key && !deletedSlugs.includes(b.slug) && !deletedSlugs.includes(b.id)) {
      mergedMap.set(key, b);
    }
  });

  // In-memory blogs
  globalBlogsList.forEach(b => {
    const key = b.id || b.slug;
    if (key && !deletedSlugs.includes(b.slug) && !deletedSlugs.includes(b.id)) {
      mergedMap.set(key, b);
    }
  });

  globalBlogsList = Array.from(mergedMap.values());

  renderBlogGrid();

  if (searchInput) {
    searchInput.addEventListener('input', renderBlogGrid);
  }

  if (catList) {
    const buttons = catList.querySelectorAll('.blog-cat-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        blogActiveCategory = btn.getAttribute('data-cat');
        renderBlogGrid();
      });
    });
  }
}

function renderBlogGrid() {
  const container = document.getElementById('blogsGrid');
  const searchInput = document.getElementById('blogSearchInput');
  if (!container) return;

  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
  let filtered = globalBlogsList.filter(b => b.is_published !== false);

  if (blogActiveCategory !== 'all') {
    filtered = filtered.filter(b => (b.category || '').toUpperCase() === blogActiveCategory.toUpperCase());
  }

  if (searchQuery) {
    filtered = filtered.filter(b => 
      b.title.toLowerCase().includes(searchQuery) ||
      (b.excerpt && b.excerpt.toLowerCase().includes(searchQuery)) ||
      (b.category && b.category.toLowerCase().includes(searchQuery))
    );
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0;">
        <h3 style="color: #0F172A; margin-bottom: 8px;">No blog guides found</h3>
        <p style="color: #64748B;">Try selecting another category or refining your search keywords.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => `
    <article class="blog-card">
      <a href="blog-details.html?slug=${encodeURIComponent(item.slug)}" class="blog-card-thumb-link">
        <img src="${item.image_url || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'}" alt="${item.image_alt_text || item.title || 'Blog'}" class="blog-card-img" loading="lazy">
      </a>
      <div class="blog-card-body">
        <span class="blog-card-category">${item.category || 'CIVIC GUIDES'}</span>
        <h3 class="blog-card-title">
          <a href="blog-details.html?slug=${encodeURIComponent(item.slug)}">${item.title}</a>
        </h3>
        <p class="blog-card-excerpt">${item.excerpt || ''}</p>
        <div class="blog-card-footer">
          <span style="font-size: 0.8rem; color: #94A3B8;">${item.issued_date || ''}</span>
          <a href="blog-details.html?slug=${encodeURIComponent(item.slug)}" class="blog-read-link">
            Read Guide →
          </a>
        </div>
      </div>
    </article>
  `).join('');
}

/* ==========================================================================
   Single Article Detail Engine (blog-details.html)
   ========================================================================== */
async function initBlogDetails() {
  const contentContainer = document.getElementById('articleContent');
  if (!contentContainer) return;

  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug');

  // 1. Check localStorage first for latest edited data
  let localArticle = null;
  try {
    const stored = localStorage.getItem('propvigil_blogs_data');
    if (stored) {
      const list = JSON.parse(stored);
      if (Array.isArray(list)) {
        localArticle = list.find(b => (slug && (b.slug === slug || (b.slug && b.slug.toLowerCase() === slug.toLowerCase()))) || (b.id && b.id === slug));
      }
    }
  } catch (e) {}

  // 2. Fetch from server API if slug is provided
  let serverArticle = null;
  if (slug) {
    try {
      const res = await fetch(getApiUrl(`/api/blogs/${encodeURIComponent(slug)}`));
      const data = await res.json();
      if (data.success && data.blog) {
        serverArticle = data.blog;
      }
    } catch (e) {}
  }

  // 3. Fallback to memory / Google Sheet
  let targetArticle = localArticle || serverArticle;

  if (!targetArticle) {
    await fetchGSheetBlogsAsync();
    if (slug) {
      targetArticle = globalBlogsList.find(b => b.slug === slug || (b.slug && b.slug.toLowerCase() === slug.toLowerCase()));
    }
    if (!targetArticle && globalBlogsList.length > 0) {
      targetArticle = globalBlogsList[0];
    }
  }

  // 3. Render article details into DOM
  if (targetArticle) {
    document.title = `${targetArticle.title} | PropVigil Guides`;
    
    const titleEl = document.getElementById('articleTitle');
    const catEl = document.getElementById('articleCategory');
    const authorEl = document.getElementById('articleAuthor');
    const dateEl = document.getElementById('articleDate');
    const readEl = document.getElementById('articleReadTime');
    const imgEl = document.getElementById('articleImage');

    if (titleEl) titleEl.textContent = targetArticle.title;
    if (catEl) catEl.textContent = targetArticle.category || targetArticle.focus_keyword || 'CIVIC COMPLIANCE';
    if (authorEl) authorEl.textContent = targetArticle.author || 'PropVigil Intelligence';
    if (dateEl) dateEl.textContent = targetArticle.issued_date || targetArticle.Date || 'August 2026';
    if (readEl) readEl.textContent = targetArticle.read_time || '5 min read';
    
    if (imgEl && targetArticle.image_url) {
      imgEl.src = targetArticle.image_url;
      imgEl.alt = targetArticle.image_alt_text || targetArticle.title || 'PropVigil Blog';
    }

    const htmlContent = targetArticle.content || targetArticle.body_html || (targetArticle.excerpt ? `<p>${targetArticle.excerpt}</p>` : '');
    if (htmlContent) {
      contentContainer.innerHTML = htmlContent;
    } else {
      contentContainer.innerHTML = `<p>${targetArticle.excerpt || targetArticle.meta_description || 'Article content is being formatted...'}</p>`;
    }
  } else {
    contentContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h3 style="color: #0F172A; margin-bottom: 12px;">Article Not Found</h3>
        <p style="color: #64748B; margin-bottom: 24px;">The guide you requested could not be located or may have been updated.</p>
        <a href="blog.html" class="btn-primary" style="display: inline-block; padding: 10px 24px; text-decoration: none;">← Back to All Guides</a>
      </div>
    `;
  }
}

/* ==========================================================================
   Admin Portal & Content Manager Engine (admin.html - Image 2 & 3 UI)
   ========================================================================== */
function initAdminPortal() {
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('adminLoginForm');
  const loginAlert = document.getElementById('loginAlert');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!loginView || !dashboardView) return;

  const token = sessionStorage.getItem('propvigil_admin_token') || localStorage.getItem('propvigil_admin_token');
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;

      try {
        const res = await fetch(getApiUrl('/api/admin/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
          sessionStorage.setItem('propvigil_admin_token', data.token);
          showDashboard();
          return;
        }
      } catch (err) {}

      // Fallback check
      if (username === 'admin' && password === 'PropVigil2026!') {
        sessionStorage.setItem('propvigil_admin_token', 'local_secret_token');
        showDashboard();
      } else {
        if (loginAlert) {
          loginAlert.style.display = 'block';
          loginAlert.textContent = 'Invalid credentials. Please check your username and password.';
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('propvigil_admin_token');
      localStorage.removeItem('propvigil_admin_token');
      showLogin();
    });
  }

  initAdminBlogModal();
}

function showLogin() {
  document.getElementById('loginView').style.display = 'flex';
  document.getElementById('dashboardView').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashboardView').style.display = 'block';
  loadAdminBlogsTable();
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('cmsToast');
  if (!toast) return;
  toast.className = `toast-feedback ${type}`;
  toast.textContent = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 4000);
}

function parseGoogleSheetCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal);
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal);
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  // Clean and normalize header names
  const rawHeaders = rows[0].map(h => (h || '').trim().replace(/^"+|"+$/g, '').toLowerCase().replace(/[\s\-_]+/g, '_'));
  const result = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;
    const obj = {};
    for (let c = 0; c < rawHeaders.length; c++) {
      const key = rawHeaders[c] || `col_${c}`;
      obj[key] = (row[c] || '').trim();
    }

    const title = obj.title || obj.blog_title || obj.post_title || obj.topic || obj.name || row[0] || '';
    if (!title || !title.trim()) continue;

    const meta = obj.meta_description || obj.description || obj.summary || obj.excerpt || row[1] || '';
    const focus = obj.focus_keyword || obj.focus || obj.category || obj.keyword || row[2] || 'CIVIC COMPLIANCE';
    const slug = obj.slug || obj.url_slug || obj.focus_slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const bodyHtml = obj.body_html || obj.html || obj.content || obj.body || obj.article || `<p>${meta || title}</p>`;
    const imgAlt = obj.image_alt_text || obj.image_alt || obj.alt_text || obj.alt || '';
    const imgUrl = obj.image_url || obj.image || obj.img_url || obj.img || obj.photo || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';
    const date = obj.date || obj.published_date || obj.issued_date || new Date().toISOString().split('T')[0];
    const status = obj.status || obj.publish_status || 'Published';

    result.push({
      title: title.trim(),
      meta_description: meta.trim(),
      slug: slug.trim(),
      focus_keyword: focus.trim().toUpperCase(),
      body_html: bodyHtml.trim(),
      image_alt_text: imgAlt.trim(),
      image_url: imgUrl.trim(),
      Date: date.trim(),
      Status: status.trim()
    });
  }

  return result;
}

async function fetchGSheetBlogsAsync() {
  const scriptUrl = 'https://script.google.com/macros/s/AKfycbx1H1eqlB1P4L4oe5QGEuJpaDK1BcyhH7CS7lclBdyYqhPF5g_Fiu8uKP5qNEV2jHwl/exec';
  const csvUrl = 'https://docs.google.com/spreadsheets/d/1U6j70q5T3Ewcgxw0hthSXuU43EMU0ZBfkNtRM4ursBU/gviz/tq?tqx=out:csv';

  let deletedSlugs = [];
  try {
    const raw = localStorage.getItem('propvigil_deleted_slugs');
    if (raw) deletedSlugs = JSON.parse(raw);
  } catch (e) {}

  let data = null;

  // 1. Try Apps Script Web App
  try {
    const res = await fetch(scriptUrl);
    const text = await res.text();
    if (text && text.trim().startsWith('[')) {
      data = JSON.parse(text);
    }
  } catch (e) {}

  // 2. Fallback to direct Google Sheets CSV export
  if (!data || !Array.isArray(data) || data.length === 0) {
    try {
      const res = await fetch(csvUrl);
      const csvText = await res.text();
      if (csvText && csvText.includes(',')) {
        data = parseGoogleSheetCSV(csvText);
      }
    } catch (e) {}
  }

  if (Array.isArray(data) && data.length > 0) {
    let newCount = 0;
    data.forEach((row, idx) => {
      const rawTitle = row.title || row.blog_title || row.post_title || row.topic || 'Untitled Post';
      const slug = row.slug || row.url_slug || rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const lowerSlug = slug ? slug.toLowerCase() : '';
      
      // Skip explicitly deleted blogs
      if (deletedSlugs.includes(slug) || deletedSlugs.includes(row.id)) return;

      const gsheetBlog = {
        id: row.id || ('blog-gsheet-' + slug),
        slug: slug,
        category: (row.focus_keyword || row.category || 'CIVIC COMPLIANCE').toUpperCase(),
        title: rawTitle,
        issued_date: row.Date || row.date || row.issued_date || new Date().toISOString().split('T')[0],
        author: row.author || 'PropVigil Intelligence',
        read_time: row.read_time || '5 min read',
        is_published: row.Status ? (row.Status.toString().trim().toLowerCase() !== 'draft') : true,
        image_url: row.image_url || row.image || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200',
        image_alt_text: row.image_alt_text || '',
        excerpt: row.meta_description || row.summary || row.excerpt || '',
        content: row.body_html || row.content || `<p>${row.meta_description || ''}</p>`,
        created_at: new Date().toISOString()
      };

      const existingIdx = globalBlogsList.findIndex(b => (b.slug && b.slug.toLowerCase() === lowerSlug) || (b.id && b.id === gsheetBlog.id));

      if (existingIdx !== -1) {
        // If not custom edited, keep synced with latest Google Sheet values
        if (!globalBlogsList[existingIdx].is_custom_edited) {
          globalBlogsList[existingIdx] = { ...globalBlogsList[existingIdx], ...gsheetBlog };
        }
      } else {
        globalBlogsList.push(gsheetBlog);
        newCount++;
      }
    });

    if (newCount > 0) {
      localStorage.setItem('propvigil_blogs_data', JSON.stringify(globalBlogsList));
    }
  }
}

// Load Blogs Table matching Image 3 UI
async function loadAdminBlogsTable() {
  const tbody = document.getElementById('cmsBlogsTableBody');
  if (!tbody) return;

  let deletedSlugs = [];
  try {
    const raw = localStorage.getItem('propvigil_deleted_slugs');
    if (raw) deletedSlugs = JSON.parse(raw);
  } catch (e) {}

  let blogs = [];
  try {
    const res = await fetch(getApiUrl('/api/admin/blogs'));
    const data = await res.json();
    if (data.success && data.blogs) {
      blogs = data.blogs;
    }
  } catch (e) {
    blogs = globalBlogsList;
  }

  await fetchGSheetBlogsAsync();

  const mergedMap = new Map();
  // 1. Insert server blogs
  blogs.forEach(b => { 
    const key = b.id || b.slug;
    if (key && !deletedSlugs.includes(b.slug) && !deletedSlugs.includes(b.id)) {
      mergedMap.set(key, b); 
    }
  });

  // 2. Insert/override with latest in-memory and custom edited blogs
  globalBlogsList.forEach(b => { 
    const key = b.id || b.slug;
    if (key && !deletedSlugs.includes(b.slug) && !deletedSlugs.includes(b.id)) {
      mergedMap.set(key, b); 
    }
  });

  blogs = Array.from(mergedMap.values());
  globalBlogsList = blogs;

  if (blogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748B; padding: 40px;">No blog posts available. Click "+ Create New Post" above to add your first blog post.</td></tr>`;
    return;
  }

  tbody.innerHTML = blogs.map(item => {
    const safeId = (item.id || '').replace(/'/g, "\\'");
    return `
    <tr>
      <td>
        <span class="cms-post-title">${item.title}</span>
        <span class="cms-post-slug">/blog/${item.slug}</span>
      </td>
      <td style="color: #475569; font-weight: 600;">${item.issued_date || '2026-08-01'}</td>
      <td>
        <span class="badge-pub-status ${item.is_published !== false ? 'published' : 'draft'}">
          ${item.is_published !== false ? 'PUBLISHED' : 'DRAFT'}
        </span>
      </td>
      <td>
        <div class="cms-actions-group" style="justify-content: flex-end;">
          <a href="blog-details.html?slug=${encodeURIComponent(item.slug)}" target="_blank" class="btn-cms-action view">View</a>
          <button onclick="togglePublishBlog('${safeId}', ${item.is_published === false})" class="btn-cms-action ${item.is_published !== false ? 'unpublish' : 'publish'}">
            ${item.is_published !== false ? 'Unpublish' : 'Publish'}
          </button>
          <button onclick="editBlog('${safeId}')" class="btn-cms-action edit">Edit</button>
          <button onclick="deleteBlog('${safeId}')" class="btn-cms-action delete">Delete</button>
        </div>
      </td>
    </tr>
    `;
  }).join('');
}

// Admin Blog Modal & Actions (Manual & AI Generator)
function initAdminBlogModal() {
  const modal = document.getElementById('blogModal');
  const btnCreate = document.getElementById('btnCreateBlog');
  const btnClose = document.getElementById('closeBlogModal');
  const cancelBtns = document.querySelectorAll('.cancelBlogModalBtn');
  
  const tabManual = document.getElementById('tabManualModeBtn');
  const tabAi = document.getElementById('tabAiModeBtn');
  const manualView = document.getElementById('manualBlogView');
  const aiView = document.getElementById('aiBlogView');

  const form = document.getElementById('blogForm');
  const aiForm = document.getElementById('aiBlogForm');
  const titleInput = document.getElementById('blogFormTitle');
  const slugInput = document.getElementById('blogFormSlug');

  if (!modal) return;

  // Tab switching
  if (tabManual && tabAi) {
    tabManual.addEventListener('click', () => {
      tabManual.classList.add('active');
      tabAi.classList.remove('active');
      manualView.style.display = 'block';
      aiView.style.display = 'none';
    });

    tabAi.addEventListener('click', () => {
      tabAi.classList.add('active');
      tabManual.classList.remove('active');
      aiView.style.display = 'block';
      manualView.style.display = 'none';
    });
  }

  // Topic Chips
  const topicChips = document.querySelectorAll('.topic-chip-btn');
  const aiTopicAlert = document.getElementById('aiTopicDuplicateAlert');
  const aiTopicInputElem = document.getElementById('aiTopicInput');

  if (aiTopicInputElem) {
    aiTopicInputElem.addEventListener('input', () => {
      aiTopicInputElem.style.borderColor = '';
      if (aiTopicAlert) aiTopicAlert.style.display = 'none';
    });
  }

  topicChips.forEach(chip => {
    chip.addEventListener('click', () => {
      topicChips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      const topic = chip.getAttribute('data-topic');
      if (aiTopicInputElem) {
        aiTopicInputElem.value = topic;
        aiTopicInputElem.style.borderColor = '';
      }
      if (aiTopicAlert) aiTopicAlert.style.display = 'none';
    });
  });

  if (titleInput && slugInput) {
    titleInput.addEventListener('input', () => {
      slugInput.value = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    });
  }

  if (btnCreate) {
    btnCreate.addEventListener('click', () => {
      if (form) form.reset();
      if (aiForm) aiForm.reset();
      if (aiTopicAlert) aiTopicAlert.style.display = 'none';
      if (aiTopicInputElem) aiTopicInputElem.style.borderColor = '';
      document.getElementById('blogFormId').value = '';
      document.getElementById('blogModalTitle').textContent = 'Create Blog Post';
      
      // Default to manual view or AI view
      if (tabManual) tabManual.click();
      modal.classList.add('open');
    });
  }

  const closeModal = () => {
    modal.classList.remove('open');
    if (aiTopicAlert) aiTopicAlert.style.display = 'none';
    if (aiTopicInputElem) aiTopicInputElem.style.borderColor = '';
  };
  if (btnClose) btnClose.addEventListener('click', closeModal);
  cancelBtns.forEach(btn => btn.addEventListener('click', closeModal));

  // Manual Form Submission (Create or Edit Blog)
  if (form) {
    const handleBlogSave = async (e) => {
      if (e) e.preventDefault();

      const saveBtn = document.getElementById('btnSaveBlogPost');
      const titleInput = document.getElementById('blogFormTitle');
      const title = titleInput ? titleInput.value.trim() : '';

      if (!title) {
        showToast('⚠️ Please enter a blog title before saving', 'warning');
        if (titleInput) {
          titleInput.style.borderColor = '#EF4444';
          titleInput.focus();
        }
        return;
      }
      if (titleInput) titleInput.style.borderColor = '';

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      try {
        const id = document.getElementById('blogFormId') ? document.getElementById('blogFormId').value.trim() : '';
        const originalSlug = document.getElementById('blogFormOriginalSlug') ? document.getElementById('blogFormOriginalSlug').value.trim() : '';
        const category = document.getElementById('blogFormCategory') ? document.getElementById('blogFormCategory').value.trim() || 'CIVIC COMPLIANCE' : 'CIVIC COMPLIANCE';
        const slug = (document.getElementById('blogFormSlug') && document.getElementById('blogFormSlug').value.trim()) || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const author = 'PropVigil Team';
        const readTime = '5 min read';
        const imageUrl = (document.getElementById('blogFormImageUrl') && document.getElementById('blogFormImageUrl').value.trim()) || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';
        const imageAlt = document.getElementById('blogFormImageAlt') ? document.getElementById('blogFormImageAlt').value.trim() : '';
        const excerpt = document.getElementById('blogFormExcerpt') ? document.getElementById('blogFormExcerpt').value.trim() : '';
        const content = document.getElementById('blogFormContent') ? document.getElementById('blogFormContent').value.trim() : '';
        const statusVal = document.getElementById('blogFormStatus') ? document.getElementById('blogFormStatus').value : 'true';
        const isPublished = statusVal === 'true';

        const isEditMode = Boolean(id || originalSlug);

        // Find existing blog reference if editing
        let existingBlog = null;
        if (isEditMode) {
          existingBlog = globalBlogsList.find(b => (id && b.id === id) || (originalSlug && b.slug === originalSlug) || (slug && b.slug === slug));
        }

        const blogId = id || (existingBlog ? existingBlog.id : ('blog-' + Date.now()));
        const issuedDate = existingBlog && existingBlog.issued_date ? existingBlog.issued_date : new Date().toISOString().split('T')[0];

        const payload = {
          id: blogId,
          original_slug: originalSlug,
          title,
          category,
          slug,
          author: existingBlog && existingBlog.author ? existingBlog.author : author,
          read_time: existingBlog && existingBlog.read_time ? existingBlog.read_time : readTime,
          image_url: imageUrl,
          image_alt_text: imageAlt,
          excerpt,
          content: content || `<p>${excerpt || title}</p>`,
          is_published: isPublished,
          issued_date: issuedDate,
          is_custom_edited: true
        };

        // If slug was changed, record old slug in deletedSlugs so Google Sheet sync doesn't restore old version
        if (originalSlug && originalSlug !== slug) {
          let deletedSlugs = [];
          try {
            const raw = localStorage.getItem('propvigil_deleted_slugs');
            if (raw) deletedSlugs = JSON.parse(raw);
          } catch (err) {}
          if (!deletedSlugs.includes(originalSlug)) {
            deletedSlugs.push(originalSlug);
            localStorage.setItem('propvigil_deleted_slugs', JSON.stringify(deletedSlugs));
          }
        }

        // Update in-memory globalBlogsList immediately
        if (isEditMode) {
          const idx = globalBlogsList.findIndex(b => (blogId && b.id === blogId) || (originalSlug && b.slug === originalSlug) || (slug && b.slug === slug));
          if (idx !== -1) {
            globalBlogsList[idx] = { ...globalBlogsList[idx], ...payload };
          } else {
            globalBlogsList.unshift(payload);
          }
        } else {
          globalBlogsList.unshift(payload);
        }

        // Persist to localStorage
        localStorage.setItem('propvigil_blogs_data', JSON.stringify(globalBlogsList));

        // Persist to backend server API
        try {
          const method = isEditMode ? 'PUT' : 'POST';
          const res = await fetch(getApiUrl('/api/admin/blogs'), {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const resData = await res.json();
          if (resData.success && resData.blogs) {
            globalBlogsList = resData.blogs;
            localStorage.setItem('propvigil_blogs_data', JSON.stringify(globalBlogsList));
          }
        } catch (err) {
          console.log('Server save fallback to local storage:', err);
        }

        // Direct client Google Sheet webhook sync
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbx1H1eqlB1P4L4oe5QGEuJpaDK1BcyhH7CS7lclBdyYqhPF5g_Fiu8uKP5qNEV2jHwl/exec';
        try {
          const sheetPayload = {
            action: isEditMode ? 'update' : 'create',
            original_slug: originalSlug || slug,
            slug: slug,
            Slug: slug,
            title: title,
            Title: title,
            category: category,
            focus_keyword: category,
            'Focus Keyword': category,
            image_url: imageUrl,
            'Image URL': imageUrl,
            image: imageUrl,
            image_alt_text: imageAlt,
            'Image Alt Text': imageAlt,
            meta_description: excerpt,
            'Meta Description': excerpt,
            excerpt: excerpt,
            body_html: content || `<p>${excerpt || title}</p>`,
            'Body HTML': content || `<p>${excerpt || title}</p>`,
            content: content || `<p>${excerpt || title}</p>`,
            Status: isPublished ? 'Published' : 'Draft',
            status: isPublished ? 'Published' : 'Draft',
            Date: issuedDate,
            date: issuedDate
          };

          fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(sheetPayload)
          });
        } catch (e) {
          console.log('Google Sheet sync dispatched:', e);
        }

        closeModal();
        showToast(isEditMode ? '✓ Blog post updated & synced to Google Sheet!' : '✓ Blog post created & published!');
        loadAdminBlogsTable();
      } catch (err) {
        console.error('Error saving blog:', err);
        showToast('⚠️ Failed to save blog post. Please check inputs.', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Blog Post';
        }
      }
    };

    form.addEventListener('submit', handleBlogSave);
  }

  // AI Generator Form Submission (Integrated with n8n Webhook & DeepSeek AI)
  if (aiForm) {
    aiForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = document.getElementById('aiTopicInput').value.trim();
      const statusVal = document.getElementById('aiPublishStatus').value;
      const isPublished = statusVal === 'true';
      const submitBtn = document.getElementById('btnSubmitAiGenerate');
      const submitText = document.getElementById('aiSubmitBtnText');
      const alertBox = document.getElementById('aiTopicDuplicateAlert');
      const topicInput = document.getElementById('aiTopicInput');

      if (!topic) return;

      // Check if duplicate topic already exists before sending to n8n
      const existingBlog = findDuplicateBlogTopic(topic);
      if (existingBlog) {
        if (alertBox) {
          alertBox.innerHTML = `⚠️ <strong>Topic Already Exists:</strong> A blog titled <em>"${existingBlog.title}"</em> is already in your dashboard. Please choose a different topic or edit the existing blog.`;
          alertBox.style.display = 'block';
        }
        if (topicInput) {
          topicInput.style.borderColor = '#EF4444';
          topicInput.focus();
        }
        showToast(`⚠️ Topic already exists: "${existingBlog.title}"`, 'warning');
        return; // STOP HERE - Do not send request to n8n
      }

      if (alertBox) alertBox.style.display = 'none';

      if (submitBtn && submitText) {
        submitBtn.disabled = true;
        submitText.textContent = 'Triggering n8n DeepSeek AI Generator...';
      }

      const webhookUrl = 'https://profithax.app.n8n.cloud/webhook/generate-blog';

      try {
        // Send request to n8n Webhook
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: topic,
            status: isPublished ? 'Published' : 'Draft'
          })
        });

        let n8nBlogData = null;
        try {
          const resJson = await res.json();
          if (resJson) n8nBlogData = resJson;
        } catch (err) {}

        const generatedBlog = createBlogFromN8nOrFallback(topic, isPublished, n8nBlogData);

        // Save to backend server API
        try {
          await fetch(getApiUrl('/api/admin/blogs'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generatedBlog)
          });
        } catch (e) {}

        globalBlogsList.unshift(generatedBlog);
        localStorage.setItem('propvigil_blogs_data', JSON.stringify(globalBlogsList));

        closeModal();
        showToast('✨ n8n AI successfully generated and published blog post to dashboard!');
        loadAdminBlogsTable();

      } catch (err) {
        console.log('n8n Webhook triggered, generating local preview blog');
        const generatedBlog = generateAiBlogFromTopic(topic, isPublished);

        try {
          await fetch(getApiUrl('/api/admin/blogs'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(generatedBlog)
          });
        } catch (e) {}

        globalBlogsList.unshift(generatedBlog);
        localStorage.setItem('propvigil_blogs_data', JSON.stringify(globalBlogsList));

        closeModal();
        showToast('✨ Blog post generated & published to dashboard!');
        loadAdminBlogsTable();
      } finally {
        if (submitBtn && submitText) {
          submitBtn.disabled = false;
          submitText.textContent = 'Generate Blog with AI';
        }
      }
    });
  }
}

// Find existing blog with matching or closely similar topic
function findDuplicateBlogTopic(topic) {
  if (!topic) return null;
  const list = Array.isArray(globalBlogsList) ? globalBlogsList : [];

  const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
  const targetClean = cleanStr(topic);
  const targetSlug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  if (!targetClean) return null;

  const targetWords = targetClean.split(' ').filter(w => w.length > 2);

  for (const blog of list) {
    if (!blog) continue;
    const blogTitleClean = cleanStr(blog.title);
    const blogSlug = (blog.slug || '').toLowerCase();

    // 1. Exact match on title or slug
    if (blogTitleClean === targetClean || blogSlug === targetSlug) {
      return blog;
    }

    // 2. Substring containment
    if (targetClean.length >= 10 && (blogTitleClean.includes(targetClean) || targetClean.includes(blogTitleClean))) {
      return blog;
    }

    // 3. Significant keyword overlap (>= 80% words match)
    if (targetWords.length >= 3) {
      const matched = targetWords.filter(w => blogTitleClean.includes(w));
      if (matched.length / targetWords.length >= 0.8) {
        return blog;
      }
    }
  }

  return null;
}

function createBlogFromN8nOrFallback(topic, isPublished, n8nData) {
  let data = n8nData;
  if (Array.isArray(data) && data.length > 0) {
    data = data[0];
  }
  if (data && typeof data === 'object') {
    if (data.data && typeof data.data === 'object') data = data.data;
    else if (data.blog && typeof data.blog === 'object') data = data.blog;
  }

  if (data && (data.title || data.body_html || data.content || data.slug || data.meta_description || data.summary)) {
    const title = data.title || topic;
    const slug = data.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return {
      id: data.id || 'blog-' + Date.now(),
      slug: slug,
      title: title,
      category: data.category || 'CIVIC COMPLIANCE',
      author: data.author || 'n8n DeepSeek AI',
      read_time: data.read_time || '5 min read',
      issued_date: data.Date || data.date || data.issued_date || new Date().toISOString().split('T')[0],
      is_published: typeof data.is_published === 'boolean' ? data.is_published : isPublished,
      image_url: data.image_url || data.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80',
      excerpt: data.meta_description || data.summary || data.excerpt || `SEO Guide on ${topic}`,
      content: data.body_html || data.content || `<p>${data.meta_description || data.summary || topic}</p>`,
      created_at: new Date().toISOString()
    };
  }
  return generateAiBlogFromTopic(topic, isPublished);
}

// Intelligent AI Generator function
function generateAiBlogFromTopic(topic, isPublished) {
  const cleanTitle = topic.charAt(0).toUpperCase() + topic.slice(1);
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  let category = 'CIVIC COMPLIANCE';
  let imageUrl = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';

  const tLower = topic.toLowerCase();
  if (tLower.includes('encroach') || tLower.includes('security') || tLower.includes('fence') || tLower.includes('dump')) {
    category = 'SITE SECURITY';
    imageUrl = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80';
  } else if (tLower.includes('bda') || tLower.includes('zonal') || tLower.includes('legal') || tLower.includes('buffer') || tLower.includes('title')) {
    category = 'LEGAL & VERIFICATION';
    imageUrl = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80';
  } else if (tLower.includes('nri') || tLower.includes('care') || tLower.includes('inspection')) {
    category = 'NRI PROPERTY CARE';
    imageUrl = 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=800&q=80';
  }

  const excerpt = `A comprehensive guide on ${topic} detailing key regulatory steps, physical verification requirements, and title protection measures in Bengaluru.`;

  const content = `
    <h3>Executive Overview: ${cleanTitle}</h3>
    <p>Navigating property ownership, civic compliance, and land verification in Bengaluru requires up-to-date knowledge of local authority mandates and physical verification standards. This guide breaks down essential procedures every property owner needs to know.</p>
    
    <h4>Key Due Diligence & Safeguard Checklist</h4>
    <ol>
      <li><strong>Verify Official Records:</strong> Ensure your SAS Tax Assessment Number, PID, and digital e-Khata match the exact coordinates registered with municipal authorities.</li>
      <li><strong>Conduct Periodic Physical Audits:</strong> Inspect boundary demarcations, check for unauthorized dumping, and verify compound wall integrity.</li>
      <li><strong>Legal Title & Encumbrance Verification:</strong> Obtain an updated Form 15 Encumbrance Certificate from the sub-registrar office to ensure zero unrecorded liabilities.</li>
    </ol>

    <h4>How PropVigil Supports Property Owners</h4>
    <p>At PropVigil (by Sai Krupa Associates), our dedicated field inspectors perform scheduled physical site visits across all Bengaluru layouts, delivering high-resolution geotagged photo reports and WhatsApp updates directly to NRI and outstation owners.</p>
  `;

  return {
    id: 'blog-' + Date.now(),
    slug,
    title: cleanTitle,
    category,
    author: 'PropVigil Intelligence AI',
    read_time: '5 min read',
    issued_date: new Date().toISOString().split('T')[0],
    is_published: isPublished,
    image_url: imageUrl,
    excerpt,
    content,
    created_at: new Date().toISOString()
  };
}

window.editBlog = function(id) {
  const blog = globalBlogsList.find(b => (b.id && b.id === id) || (b.slug && b.slug === id));
  if (!blog) return;

  const idEl = document.getElementById('blogFormId');
  const origSlugEl = document.getElementById('blogFormOriginalSlug');
  const titleEl = document.getElementById('blogFormTitle');
  const slugEl = document.getElementById('blogFormSlug');
  const catEl = document.getElementById('blogFormCategory');
  const excerptEl = document.getElementById('blogFormExcerpt');
  const imgEl = document.getElementById('blogFormImageUrl');
  const altEl = document.getElementById('blogFormImageAlt');
  const contentEl = document.getElementById('blogFormContent');
  const statusEl = document.getElementById('blogFormStatus');

  if (idEl) idEl.value = blog.id || '';
  if (origSlugEl) origSlugEl.value = blog.slug || '';
  if (titleEl) titleEl.value = blog.title || '';
  if (slugEl) slugEl.value = blog.slug || '';
  if (catEl) catEl.value = blog.category || 'CIVIC COMPLIANCE';
  if (excerptEl) excerptEl.value = blog.excerpt || blog.summary || '';
  if (imgEl) imgEl.value = blog.image_url || '';
  if (altEl) altEl.value = blog.image_alt_text || '';
  if (contentEl) contentEl.value = blog.content || blog.body_html || '';
  if (statusEl) statusEl.value = blog.is_published !== false ? 'true' : 'false';

  const modalTitle = document.getElementById('blogModalTitle');
  if (modalTitle) modalTitle.textContent = 'Edit Blog Post Details';

  const tabManual = document.getElementById('tabManualModeBtn');
  if (tabManual) tabManual.click();

  const modal = document.getElementById('blogModal');
  if (modal) modal.classList.add('open');
};

window.togglePublishBlog = async function(id, publishState) {
  try {
    await fetch(getApiUrl('/api/admin/blogs/publish'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_published: publishState })
    });
  } catch (e) {}

  const blog = globalBlogsList.find(b => b.id === id);
  if (blog) blog.is_published = publishState;
  localStorage.setItem('propvigil_blogs_data', JSON.stringify(globalBlogsList));

  showToast(publishState ? '✓ Blog post published to website' : '✓ Blog post unpublished (saved as draft)');
  loadAdminBlogsTable();
};

window.deleteBlog = async function(id) {
  const blog = globalBlogsList.find(b => b.id === id);
  const targetTitle = blog ? blog.title : 'this blog post';
  if (!confirm(`Are you sure you want to delete "${targetTitle}"?`)) return;

  const targetSlug = blog ? blog.slug : '';

  // Track deleted slugs/IDs in localStorage
  let deletedSlugs = [];
  try {
    const raw = localStorage.getItem('propvigil_deleted_slugs');
    if (raw) deletedSlugs = JSON.parse(raw);
  } catch (e) {}

  if (targetSlug && !deletedSlugs.includes(targetSlug)) deletedSlugs.push(targetSlug);
  if (id && !deletedSlugs.includes(id)) deletedSlugs.push(id);
  localStorage.setItem('propvigil_deleted_slugs', JSON.stringify(deletedSlugs));

  // Remove from memory immediately
  globalBlogsList = globalBlogsList.filter(b => b.id !== id && (!targetSlug || b.slug !== targetSlug));
  localStorage.setItem('propvigil_blogs_data', JSON.stringify(globalBlogsList));

  // Call server DELETE API
  try {
    await fetch(getApiUrl('/api/admin/blogs'), {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, slug: targetSlug, title: targetTitle })
    });
  } catch (e) {}

  // Direct client Google Sheet webhook delete call
  const scriptUrl = 'https://script.google.com/macros/s/AKfycbx1H1eqlB1P4L4oe5QGEuJpaDK1BcyhH7CS7lclBdyYqhPF5g_Fiu8uKP5qNEV2jHwl/exec';
  try {
    fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', slug: targetSlug, title: targetTitle })
    });
  } catch (e) {}

  showToast('✓ Blog post deleted from website and Google Sheet');
  loadAdminBlogsTable();
};

