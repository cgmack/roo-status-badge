(function() {
  const ROO_WAITING_SELECTOR = '[aria-label="Roo"]';
  const DEBOUNCE_TIME = 200; // ms

  let debounceTimer;
  let lastKnownRooState = 'idle'; // 'waiting', 'running', 'idle'

  function sendMessageToServiceWorker(status) {
    if (lastKnownRooState === status) {
      return; // Avoid sending redundant messages
    }
    lastKnownRooState = status;
    chrome.runtime.sendMessage({ type: 'ROO_STATUS_UPDATE', status: status });
  }

  function detectRooStateFromDOM() {
    const rooElements = document.querySelectorAll(ROO_WAITING_SELECTOR);
    let newState = 'idle';

    for (const element of rooElements) {
      if (element.textContent.includes('waiting')) {
        newState = 'waiting';
        break;
      }
      // Add more conditions here if 'running' or other states can be detected from DOM
    }
    
    // For simplicity, assuming if not 'waiting', it's 'running' if Roo element exists, else 'idle'
    // This part might need refinement based on actual Roo DOM structure for 'running' state
    if (newState === 'idle' && rooElements.length > 0) {
        newState = 'running'; // If Roo element exists but not 'waiting', assume 'running'
    }

    if (newState !== lastKnownRooState) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        sendMessageToServiceWorker(newState);
      }, DEBOUNCE_TIME);
    }
  }

  // Primary pathway: listen for window.postMessage
  window.addEventListener('message', (event) => {
    if (event.source === window && event.data && event.data.rooStatus) {
      const rooStatus = event.data.rooStatus;
      // Map helper VSIX states to our internal states if necessary
      // For now, assuming rooStatus directly maps to 'waiting', 'running', 'idle'
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        sendMessageToServiceWorker(rooStatus);
      }, DEBOUNCE_TIME);
    }
  });

  // Fallback: MutationObserver on elements with aria-label="Roo"
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList' || mutation.type === 'characterData' || mutation.type === 'attributes') {
        detectRooStateFromDOM();
      }
    });
  });

  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label']
  });

  // Initial detection on script load
  detectRooStateFromDOM();

  // Handle extension disablement (AC-6)
  // This is a simplified approach. A more robust solution might involve
  // listening for chrome.runtime.onSuspend or similar, but content scripts
  // are typically re-injected on page load.
  // For AC-6, the main point is that listeners/observers are cleaned up.
  // When the extension is disabled, the content script is no longer injected.
  // If it was already injected, it would ideally clean up.
  // For now, relying on the browser's lifecycle for content scripts.
})();