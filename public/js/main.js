// ==========================================================================
// OKdevTV Markdown Documentation Client Scripts (omd)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSidebar();
  initSidebarFilter();
  initTOCScrollspy();
  initSearchModal();
});

// --------------------------------------------------------------------------
// Theme Toggle (Dark / Light)
// --------------------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('omd-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('omd-theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }
}

function updateThemeIcon(theme) {
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  if (!sunIcon || !moonIcon) return;

  if (theme === 'light') {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
}

// --------------------------------------------------------------------------
// Sidebar & Mobile Drawer
// --------------------------------------------------------------------------
function initSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  const toggleBtn = document.getElementById('menu-toggle-btn');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (toggleBtn && sidebar && backdrop) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('open');
    });

    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    });
  }

  // Category Collapsible Folders
  const categoryHeaders = document.querySelectorAll('.category-header');
  categoryHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const parent = header.closest('.nav-category');
      if (parent) {
        parent.classList.toggle('collapsed');
      }
    });
  });

  // Scroll active document link into view in sidebar
  const activeLink = document.querySelector('.doc-link.active');
  if (activeLink) {
    // Ensure parent category is not collapsed
    const parentCat = activeLink.closest('.nav-category');
    if (parentCat) {
      parentCat.classList.remove('collapsed');
    }
    activeLink.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// --------------------------------------------------------------------------
// Sidebar Category / Doc Filter
// --------------------------------------------------------------------------
function initSidebarFilter() {
  const filterInput = document.getElementById('sidebar-filter');
  if (!filterInput) return;

  filterInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const categories = document.querySelectorAll('.nav-category');

    categories.forEach(cat => {
      const catName = cat.getAttribute('data-category') || '';
      const docLinks = cat.querySelectorAll('.doc-link');
      let hasMatchingDoc = false;

      docLinks.forEach(link => {
        const text = link.textContent.toLowerCase();
        if (!query || text.includes(query) || catName.includes(query)) {
          link.style.display = '';
          hasMatchingDoc = true;
        } else {
          link.style.display = 'none';
        }
      });

      if (!query) {
        cat.style.display = '';
      } else if (hasMatchingDoc || catName.includes(query)) {
        cat.style.display = '';
        cat.classList.remove('collapsed');
      } else {
        cat.style.display = 'none';
      }
    });
  });
}

// --------------------------------------------------------------------------
// Table of Contents Scrollspy
// --------------------------------------------------------------------------
function initTOCScrollspy() {
  const tocLinks = document.querySelectorAll('.toc-link');
  if (tocLinks.length === 0) return;

  const headings = Array.from(document.querySelectorAll('.markdown-body h2, .markdown-body h3'));
  if (headings.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        if (id) {
          tocLinks.forEach(link => {
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      }
    });
  }, {
    rootMargin: '-80px 0px -70% 0px'
  });

  headings.forEach(h => observer.observe(h));
}

// --------------------------------------------------------------------------
// Copy Code Block to Clipboard
// --------------------------------------------------------------------------
window.copyCode = function(button) {
  const codeBlock = button.closest('.code-block-wrapper');
  if (!codeBlock) return;
  const code = codeBlock.querySelector('pre code');
  if (!code) return;

  navigator.clipboard.writeText(code.innerText).then(() => {
    const textSpan = button.querySelector('.btn-text');
    const originalText = textSpan.innerText;
    textSpan.innerText = 'Copied!';
    button.classList.add('copied');

    setTimeout(() => {
      textSpan.innerText = originalText;
      button.classList.remove('copied');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy code:', err);
  });
};

// --------------------------------------------------------------------------
// Search Modal & Autocomplete
// --------------------------------------------------------------------------
function initSearchModal() {
  const modalBackdrop = document.getElementById('search-modal-backdrop');
  const triggerBtn = document.getElementById('search-trigger-btn');
  const searchInput = document.getElementById('search-modal-input');
  const resultsContainer = document.getElementById('search-results-list');
  if (!modalBackdrop || !searchInput || !resultsContainer) return;

  let selectedIndex = -1;
  let currentResults = [];
  let debounceTimeout = null;

  function openSearch() {
    modalBackdrop.classList.add('open');
    searchInput.value = '';
    resultsContainer.innerHTML = '<li class="search-result-item" style="color:var(--text-muted);text-align:center;">Type to search 470+ documents...</li>';
    selectedIndex = -1;
    setTimeout(() => searchInput.focus(), 50);
  }

  function closeSearch() {
    modalBackdrop.classList.remove('open');
  }

  if (triggerBtn) {
    triggerBtn.addEventListener('click', openSearch);
  }

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closeSearch();
    }
  });

  // Global Keyboard Shortcuts (Cmd+K, Ctrl+K, or '/')
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (modalBackdrop.classList.contains('open')) {
        closeSearch();
      } else {
        openSearch();
      }
    } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && modalBackdrop.classList.contains('open')) {
      closeSearch();
    }
  });

  // Query API with Debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    const query = searchInput.value.trim();

    if (!query) {
      resultsContainer.innerHTML = '<li class="search-result-item" style="color:var(--text-muted);text-align:center;">Type to search 470+ documents...</li>';
      currentResults = [];
      selectedIndex = -1;
      return;
    }

    debounceTimeout = setTimeout(() => {
      fetch('/api/search?q=' + encodeURIComponent(query))
        .then(res => res.json())
        .then(data => {
          currentResults = data;
          selectedIndex = -1;
          renderResults(data, query);
        })
        .catch(err => {
          console.error('Search error:', err);
        });
    }, 150);
  });

  // Key navigation in results (ArrowDown, ArrowUp, Enter)
  searchInput.addEventListener('keydown', (e) => {
    const items = resultsContainer.querySelectorAll('.search-result-item[href]');
    if (items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      updateSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      updateSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        items[selectedIndex].click();
      } else if (items[0]) {
        items[0].click();
      }
    }
  });

  function updateSelection(items) {
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  function renderResults(results, query) {
    if (results.length === 0) {
      resultsContainer.innerHTML = `<li class="search-result-item" style="color:var(--text-muted);text-align:center;">No documents found matching "${escapeHtml(query)}"</li>`;
      return;
    }

    resultsContainer.innerHTML = results.map((item, idx) => {
      return `
        <a href="${item.url}" class="search-result-item ${idx === 0 ? 'selected' : ''}">
          <div class="search-item-top">
            <span class="search-item-title">${escapeHtml(item.title)}</span>
            <span class="search-item-cat">${escapeHtml(item.category)}</span>
          </div>
          <div class="search-item-path">${escapeHtml(item.relPath)}</div>
        </a>
      `;
    }).join('');
    selectedIndex = 0;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
