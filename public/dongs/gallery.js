(function () {
  const dataElement = document.getElementById('data');
  const data = JSON.parse(dataElement.textContent);
  const tagVocabulary = [...new Set(data.flatMap((item) => item.tags || []))]
    .sort((a, b) => a.localeCompare(b));
  const batchSize = 48;
  const params = new URLSearchParams(window.location.search);

  const initialSearch = params.get('q') || '';
  const requestedRating = params.get('stars');
  const initialRating = ['1', '2', '3', 'all'].includes(requestedRating)
    ? requestedRating
    : (initialSearch ? 'all' : '3');

  const state = {
    search: initialSearch,
    rating: initialRating,
    tag: tagVocabulary.includes(params.get('tag')) ? params.get('tag') : '',
    visible: batchSize,
    filtered: [],
  };

  const searchInput = document.getElementById('search');
  const tagSelect = document.getElementById('tag-select');
  const grid = document.getElementById('grid');
  const count = document.getElementById('count');
  const clearButton = document.getElementById('clear-filters');
  const loadMoreButton = document.getElementById('load-more');
  const randomButton = document.getElementById('random-dong');
  const ratingButtons = [...document.querySelectorAll('[data-rating]')];

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character]));
  }

  function displayName(item) {
    if (item.name && item.name !== '???') return item.name;
    try {
      return new URL(item.url).hostname.replace(/^www\./, '');
    } catch (error) {
      return item.name || 'Untitled';
    }
  }

  function destinationFor(item) {
    if (item.works === 'no' || item.works === 'unclear') {
      return `https://web.archive.org/web/*/${item.url}`;
    }
    return item.url;
  }

  function syncUrl() {
    const next = new URLSearchParams();
    if (state.search) next.set('q', state.search);
    if (state.rating !== '3') next.set('stars', state.rating);
    if (state.tag) next.set('tag', state.tag);
    const query = next.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }

  function updateControls() {
    ratingButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.rating === state.rating));
    });
    searchInput.value = state.search;
    tagSelect.value = tagVocabulary.includes(state.tag) ? state.tag : '';
    const isDefault = !state.search && state.rating === '3' && !state.tag;
    clearButton.hidden = isDefault;
  }

  function filterData() {
    const query = state.search.trim().toLowerCase();
    const rows = data.filter((item) => {
      if (state.rating !== 'all' && String(item.score) !== state.rating) return false;
      if (state.tag && !(item.tags || []).includes(state.tag)) return false;
      if (!query) return true;
      const searchable = [displayName(item), item.purpose, ...(item.tags || [])]
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });

    rows.sort((a, b) => {
      if (state.rating === 'all' && b.score !== a.score) return b.score - a.score;
      return displayName(a).localeCompare(displayName(b));
    });
    return rows;
  }

  function tagsMarkup(tags) {
    return (tags || []).map((tag, index) => `
      ${index ? '<span class="tag-separator" aria-hidden="true">·</span>' : ''}
      <button class="tag-link" type="button" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
    `).join('');
  }

  function itemMarkup(item) {
    const name = displayName(item);
    const destination = destinationFor(item);
    const stars = item.score > 0
      ? `<span class="stars" aria-label="${item.score} star${item.score === 1 ? '' : 's'}">${'★'.repeat(item.score)}</span>`
      : '';
    const archiveTitle = item.works === 'no' || item.works === 'unclear'
      ? 'View archived versions'
      : `Open ${name}`;

    return `
      <article class="dong">
        <a class="shot-link" href="${escapeHtml(destination)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(archiveTitle)}">
          <img loading="lazy" decoding="async" src="${escapeHtml(item.screenshot)}" alt="Screenshot of ${escapeHtml(name)}" />
        </a>
        <div class="dong-heading">
          <h2><a class="dong-link" href="${escapeHtml(destination)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(archiveTitle)}">${escapeHtml(name)}</a></h2>
          ${stars}
        </div>
        <div class="what-it-is">
          <span class="field-label">What it is</span>
          <p>${escapeHtml(item.purpose)}</p>
        </div>
        ${item.tags && item.tags.length ? `<div class="tags" aria-label="Tags">${tagsMarkup(item.tags)}</div>` : ''}
      </article>
    `;
  }

  function render() {
    state.filtered = filterData();
    const visibleItems = state.filtered.slice(0, state.visible);

    if (!visibleItems.length) {
      grid.innerHTML = '<div class="empty-state"><p>No DONGs match those filters.</p></div>';
    } else {
      grid.innerHTML = visibleItems.map(itemMarkup).join('');
    }

    count.textContent = state.filtered.length
      ? `Showing ${visibleItems.length.toLocaleString()} of ${state.filtered.length.toLocaleString()} DONGs`
      : 'No DONGs found';

    const remaining = state.filtered.length - visibleItems.length;
    loadMoreButton.hidden = remaining <= 0;
    loadMoreButton.textContent = remaining > 0
      ? `Show ${Math.min(batchSize, remaining)} more`
      : 'Show more';

    updateControls();
    syncUrl();
  }

  function resetVisibleAndRender() {
    state.visible = batchSize;
    render();
  }

  tagVocabulary.forEach((tag) => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagSelect.appendChild(option);
  });

  ratingButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.rating = button.dataset.rating;
      resetVisibleAndRender();
    });
  });

  searchInput.addEventListener('input', (event) => {
    if (event.target.value && !state.search && state.rating === '3') state.rating = 'all';
    state.search = event.target.value;
    resetVisibleAndRender();
  });

  tagSelect.addEventListener('change', (event) => {
    state.tag = event.target.value;
    resetVisibleAndRender();
  });

  grid.addEventListener('click', (event) => {
    const tagButton = event.target.closest('.tag-link');
    if (!tagButton) return;
    state.tag = tagButton.dataset.tag;
    tagSelect.value = state.tag;
    resetVisibleAndRender();
    document.querySelector('.controls').scrollIntoView({ block: 'start' });
  });

  clearButton.addEventListener('click', () => {
    state.search = '';
    state.rating = '3';
    state.tag = '';
    resetVisibleAndRender();
  });

  loadMoreButton.addEventListener('click', () => {
    state.visible += batchSize;
    render();
  });

  randomButton.addEventListener('click', () => {
    const candidates = data.filter((item) => item.score >= 2 && item.works === 'yes');
    const choice = candidates[Math.floor(Math.random() * candidates.length)];
    const opened = window.open(choice.url, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
  });

  updateControls();
  render();
})();
