const channelCardTemplate = document.querySelector("[data-channel-template]");
const channelCardContainer = document.querySelector("[data-item-container]");
const searchInput = document.getElementById("channel-search");

let activeChannels = [];
let selectedIndex = 0; // for roving tabindex within the listbox

// Filter channels based on search input
function getFilteredChannels() {
  const term = searchInput ? searchInput.value.toLowerCase() : "";
  if (!term) return activeChannels;

  return activeChannels.filter(channel => {
    return channel.name.toLowerCase().includes(term); 
  });
}

function updateDisplay() {
  const filtered = getFilteredChannels();
  renderChannels(filtered);
}

if (searchInput) {
  searchInput.addEventListener('input', updateDisplay);
}

// Fetch and load channels from the API
async function loadChannels() {
  try {
    const res = await fetch("https://api.nive.live/api/channels", { cache: "no-store" });
    const data = await res.json();
    
    if (Array.isArray(data)) {
      // Filter out explicitly hidden channels
      activeChannels = data.filter(channel => !channel.hidden);
      updateDisplay();
    }
  } catch (error) {
    console.error("Failed to fetch channel data:", error);
  }
}

// Render channels into DOM
function renderChannels(channels) {
  if (!channelCardContainer) return;

  // Clear the "loading..." text on the first render
  const loadingText = channelCardContainer.querySelector("p");
  if (loadingText) loadingText.remove();

  // Create or select shelves inside the listbox
  let liveHeader = channelCardContainer.querySelector('#live-header');
  let liveShelf = channelCardContainer.querySelector('#live-shelf');
  let offlineHeader = channelCardContainer.querySelector('#offline-header');
  let offlineShelf = channelCardContainer.querySelector('#offline-shelf');

  if (!liveHeader) {
    liveHeader = document.createElement("h2");
    liveHeader.id = "live-header";
    liveHeader.className = "section-title";
    liveHeader.textContent = "Live Now";
    channelCardContainer.appendChild(liveHeader);

    liveShelf = document.createElement("div");
    liveShelf.id = "live-shelf";
    liveShelf.className = "channel-shelf";
    channelCardContainer.appendChild(liveShelf);
  }

  if (!offlineHeader) {
    offlineHeader = document.createElement("h2");
    offlineHeader.id = "offline-header";
    offlineHeader.className = "section-title";
    offlineHeader.textContent = "Offline";
    channelCardContainer.appendChild(offlineHeader);

    offlineShelf = document.createElement("div");
    offlineShelf.id = "offline-shelf";
    offlineShelf.className = "channel-shelf";
    channelCardContainer.appendChild(offlineShelf);
  }

  const existingCards = new Map();
  channelCardContainer.querySelectorAll('.item').forEach(card => {
    existingCards.set(card.dataset.id, card);
  });

  // Track active items to remove stale cards
  const activeIds = new Set(channels.map(c => c.id.toString()));
  existingCards.forEach((card, id) => {
    if (!activeIds.has(id)) {
      card.remove();
    }
  });

  let hasLive = false;
  let hasOffline = false;

  channels.forEach(channel => {
    let card = existingCards.get(channel.id.toString());
    
    if (!card) {
      // Clone from the HTML template
      card = channelCardTemplate.content.cloneNode(true).children[0];
      card.dataset.id = channel.id;
      card.dataset.name = channel.name;

      // Strip out the channel icon/logo completely
      const icon = card.querySelector("[channel-icon]");
      if (icon) icon.remove();

      card.addEventListener("focus", () => {
        const items = getItems();
        const idx = items.indexOf(card);
        if (idx >= 0) setActiveIndex(idx, { focus: false });
      });

      // Basic Click Navigation
      const navigate = (newTab = false) => {
        const url = `https://ebnk.xyz/chnl/watch/${channel.name}`; 
        if (newTab) window.open(url, '_blank');
        else window.location.href = url;
      };

      card.addEventListener("click", (e) => {
        if (card.dataset.dragging === "true") return;
        if (e.button === 0) navigate(e.ctrlKey || e.metaKey);
      });

      card.addEventListener("auxclick", (e) => {
        if (e.button === 1) {
          e.preventDefault();
          navigate(true);
        }
      });
    }

    // Element selection
    const nameElement = card.querySelector("[channel-name]");
    const thumbnail = card.querySelector("[channel-thumbnail]");
    const viewerCountText = card.querySelector("[viewer-count-text]");
    const statusDot = card.querySelector(".status-dot");

    if (nameElement.textContent !== channel.name) {
      nameElement.textContent = channel.name;
    }

    thumbnail.draggable = false;

    // Handle Image assignments from the new Nive API endpoint
    const thumbUrl = `https://api.nive.live/thumbnails/${channel.id}.jpg`;
    
    if (!channel.is_live) thumbnail.classList.add("offline-thumbnail");
    else thumbnail.classList.remove("offline-thumbnail");
    
    if (thumbnail.getAttribute("src") !== thumbUrl) {
      thumbnail.setAttribute("src", thumbUrl);
    }

    // Live/Offline Routing
    if (!channel.is_live) {
      hasOffline = true;
      viewerCountText.textContent = "Offline";
      statusDot.style.backgroundColor = "gray";
      card.classList.add("offline");
      offlineShelf.appendChild(card);
    } else {
      hasLive = true;
      viewerCountText.textContent = channel.viewer_count;
      statusDot.style.backgroundColor = "rgb(255, 91, 91)";
      card.classList.remove("offline");
      liveShelf.appendChild(card);
    }
  });

  // Hide headers/shelves if empty
  liveHeader.style.display = hasLive ? "" : "none";
  liveShelf.style.display = hasLive ? "" : "none";
  offlineHeader.style.display = hasOffline ? "" : "none";
  offlineShelf.style.display = hasOffline ? "" : "none";

  initKeyboardNavigation();
  initDragScroll();
}

function initDragScroll() {
  const shelves = document.querySelectorAll('.channel-shelf');
  shelves.forEach(shelf => {
    if (shelf.__dragInit) return;
    shelf.__dragInit = true;
    let isDown = false;
    let startX;
    let scrollLeft;
    let moveThreshold = 5;
    let hasMoved = false;

    shelf.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - shelf.offsetLeft;
      scrollLeft = shelf.scrollLeft;
      hasMoved = false;
    });

    shelf.addEventListener('mouseleave', () => {
      isDown = false;
      shelf.classList.remove('dragging');
      shelf.querySelectorAll('.item').forEach(item => item.dataset.dragging = "false");
    });

    shelf.addEventListener('mouseup', () => {
      isDown = false;
      shelf.classList.remove('dragging');
      setTimeout(() => {
        shelf.querySelectorAll('.item').forEach(item => item.dataset.dragging = "false");
      }, 10);
    });

    shelf.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      const x = e.pageX - shelf.offsetLeft;
      const walk = (x - startX);

      if (Math.abs(walk) > moveThreshold) {
        if (!hasMoved) {
          shelf.classList.add('dragging');
          hasMoved = true;
        }
        shelf.querySelectorAll('.item').forEach(item => item.dataset.dragging = "true");
        shelf.scrollLeft = scrollLeft - walk;
      }
    });
  });
}

// --- Keyboard Navigation Utilities ---

function getItems() {
  return Array.from(channelCardContainer.querySelectorAll('.item[role="option"]'));
}

function setActiveIndex(index, opts = { focus: true }) {
  const items = getItems();
  if (items.length === 0) return;
  const clamped = Math.max(0, Math.min(index, items.length - 1));
  selectedIndex = clamped;

  items.forEach((el, i) => {
    const isSelected = i === clamped;
    el.setAttribute('tabindex', isSelected ? '0' : '-1');
    el.setAttribute('aria-selected', isSelected ? 'true' : 'false');
  });

  if (opts.focus) {
    items[clamped].focus({ preventScroll: false });
    items[clamped].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function moveLinear(delta) {
  setActiveIndex(selectedIndex + delta);
}

function moveVertical(delta) {
  const items = getItems();
  const current = items[selectedIndex];
  if (!current) return;

  const currentRect = current.getBoundingClientRect();
  const currentCenter = currentRect.left + currentRect.width / 2;

  let candidates = [];
  items.forEach((item, idx) => {
    if (idx === selectedIndex) return;
    const rect = item.getBoundingClientRect();
    if (delta > 0 && rect.top >= currentRect.bottom - 1) { // Down
      candidates.push({ idx, rect });
    } else if (delta < 0 && rect.bottom <= currentRect.top + 1) { // Up
      candidates.push({ idx, rect });
    }
  });

  if (candidates.length > 0) {
    let minDistY = Infinity;
    candidates.forEach(c => {
      const distY = delta > 0 ? (c.rect.top - currentRect.bottom) : (currentRect.top - c.rect.bottom);
      if (distY < minDistY) minDistY = distY;
    });

    const rowCandidates = candidates.filter(c => {
      const distY = delta > 0 ? (c.rect.top - currentRect.bottom) : (currentRect.top - c.rect.bottom);
      return Math.abs(distY - minDistY) < 30;
    });

    let bestIdx = -1;
    let minDistX = Infinity;
    rowCandidates.forEach(c => {
      const centerX = c.rect.left + c.rect.width / 2;
      const distX = Math.abs(centerX - currentCenter);
      if (distX < minDistX) {
        minDistX = distX;
        bestIdx = c.idx;
      }
    });

    if (bestIdx !== -1) {
      setActiveIndex(bestIdx);
      return;
    }
  }
}

function initKeyboardNavigation() {
  const items = getItems();
  if (items.length === 0) return;

  if (selectedIndex >= items.length) selectedIndex = 0;
  setActiveIndex(selectedIndex, { focus: false });

  if (!channelCardContainer.__kbInit) {
    channelCardContainer.addEventListener('keydown', (e) => {
      const key = e.key;
      switch (key) {
        case 'ArrowDown':
        case 'Down':
          e.preventDefault();
          moveVertical(1);
          break;
        case 'ArrowUp':
        case 'Up':
          e.preventDefault();
          moveVertical(-1);
          break;
        case 'ArrowLeft':
        case 'Left':
          e.preventDefault();
          moveLinear(-1);
          break;
        case 'ArrowRight':
        case 'Right':
          e.preventDefault();
          moveLinear(1);
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(getItems().length - 1);
          break;
        case 'Enter':
        case ' ': // Space
          {
            const itemsNow = getItems();
            if (itemsNow[selectedIndex]) {
              e.preventDefault();
              const name = itemsNow[selectedIndex].dataset.name;
              if (name) window.location.href = `https://nive.live/watch/${name}`;
            }
          }
          break;
        default:
          break;
      }
    });

    // When the listbox itself receives focus (via Tab), place focus on selected item
    channelCardContainer.addEventListener('focus', (e) => {
      if (e.target === channelCardContainer) {
        const itemsNow = getItems();
        if (itemsNow.length) {
          setActiveIndex(selectedIndex);
        }
      }
    });

    channelCardContainer.__kbInit = true;
  }
}

// Startup execution
loadChannels();
setInterval(loadChannels, 20000); // refresh API fetch every 20 seconds
