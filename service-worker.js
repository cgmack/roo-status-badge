const COLORS = {
  waiting: '#d44',
  running: '#f6c20b',
  idle: '#2ea44f'
};

const TEXT = {
  waiting: '👋',
  running: '',
  idle: ''
};

let statesByTab = {};

// Export statesByTab for testing purposes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { statesByTab, updateBadge, sendNotificationAndAudio }; // Export functions for testing as well
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'ROO_STATUS_UPDATE' && sender.tab) {
    const tabId = sender.tab.id;
    const newState = message.status;
    const oldState = statesByTab[tabId];

    statesByTab[tabId] = newState;

    updateBadge(tabId, newState);

    if (oldState !== 'waiting' && newState === 'waiting') {
      // Only notify if the tab was not already waiting
      sendNotificationAndAudio(tabId);
    }
  }
});

function updateBadge(tabId, state) {
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: COLORS[state] });
  chrome.action.setBadgeText({ tabId: tabId, text: TEXT[state] });
}

function sendNotificationAndAudio(tabId) {
  // TODO: Implement user preference for audio and notifications
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Roo Status Update',
    message: 'Roo is waiting for your input!',
    priority: 2
  });

  // Play audio cue (assuming an audio file exists)
  // For a real extension, this would be more robust, potentially using an offscreen document
  // or a dedicated audio element in the service worker if supported directly.
  // For now, this is a placeholder.
  // A common approach is to use an offscreen document for audio playback in Manifest V3.
  // Example: chrome.offscreen.createDocument for audio playback.
  // This requires 'offscreen' permission in manifest.json
  // and a separate offscreen.html and offscreen.js file.
  console.log('Playing audio cue for tab:', tabId);
}

// Handle tab removal to clean up statesByTab
chrome.tabs.onRemoved.addListener((tabId) => {
  delete statesByTab[tabId];
});

// Initial setup for existing tabs when the service worker starts
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    if (tab.id) {
      // Initialize state for existing tabs to 'idle' or a default
      // This might be refined later if we can query initial Roo state
      statesByTab[tab.id] = 'idle';
      updateBadge(tab.id, 'idle');
    }
  });
});