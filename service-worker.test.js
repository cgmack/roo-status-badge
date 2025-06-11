// Mocking Chrome APIs
const chrome = {
  action: {
    setBadgeBackgroundColor: jest.fn(),
    setBadgeText: jest.fn(),
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
  },
  tabs: {
    onRemoved: {
      addListener: jest.fn(),
    },
    query: jest.fn((queryInfo, callback) => {
      // Mock initial tabs for service worker startup
      callback([{ id: 101, url: 'https://vscode.dev' }]);
    }),
  },
};

// Assign the mocked chrome object to global scope for the service worker script
global.chrome = chrome;

// Mock console.log
global.console = {
  log: jest.fn(),
};

describe('Service Worker', () => {
  let serviceWorkerModule; // To hold the re-required module
  let statesByTabFromModule; // To hold the statesByTab exported from the module

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Mock initial tabs for service worker startup
    chrome.tabs.query.mockImplementation((queryInfo, callback) => {
      callback([{ id: 101, url: 'https://vscode.dev' }]);
    });
    // Re-add the listener for each test, as require() only runs once
    // This simulates the service worker's onMessage listener being active
    chrome.runtime.onMessage.addListener.mockImplementation((callback) => {
      global.mockOnMessageCallback = callback;
    });

    // To ensure service-worker.js is re-evaluated and its listeners are set up
    // for each test, we need to clear the module cache and re-require it.
    jest.resetModules();
    serviceWorkerModule = require('./service-worker.js');
    // Access the exported statesByTab from the re-required module
    statesByTabFromModule = serviceWorkerModule.statesByTab;
  });

  // AC-1: Tab badge background becomes red and shows 👋 within 1 s when Roo state switches to waiting_for_user
  test('should set badge to red and 👋 when Roo state is waiting_for_user', () => {
    const tabId = 123;
    const message = { type: 'ROO_STATUS_UPDATE', status: 'waiting' };
    const sender = { tab: { id: tabId } };

    // Simulate receiving a message from content script
    global.mockOnMessageCallback(message, sender, jest.fn());

    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: tabId, color: '#d44' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: tabId, text: '👋' });
  });

  // AC-2: Tab badge background becomes yellow (no text) within 1 s when Roo state switches to running_task
  test('should set badge to yellow and blank when Roo state is running_task', () => {
    const tabId = 124;
    const message = { type: 'ROO_STATUS_UPDATE', status: 'running' };
    const sender = { tab: { id: tabId } };

    global.mockOnMessageCallback(message, sender, jest.fn());

    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: tabId, color: '#f6c20b' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: tabId, text: '' });
  });

  // AC-3: Tab badge background becomes green (no text) within 1 s when Roo state switches to idle
  test('should set badge to green and blank when Roo state is idle', () => {
    const tabId = 125;
    const message = { type: 'ROO_STATUS_UPDATE', status: 'idle' };
    const sender = { tab: { id: tabId } };

    global.mockOnMessageCallback(message, sender, jest.fn());

    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ tabId: tabId, color: '#2ea44f' });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: tabId, text: '' });
  });

  // AC-4: Desktop notification and default-on audio cue play once when tab is in background and transitions running_task → waiting_for_user
  test('should send notification and play audio when transitioning to waiting from running in background', () => {
    const tabId = 126;
    const sender = { tab: { id: tabId } };

    // Simulate initial state as running
    global.mockOnMessageCallback({ type: 'ROO_STATUS_UPDATE', status: 'running' }, sender, jest.fn());
    jest.clearAllMocks(); // Clear mocks after initial state set

    // Simulate transition to waiting
    global.mockOnMessageCallback({ type: 'ROO_STATUS_UPDATE', status: 'waiting' }, sender, jest.fn());

    expect(chrome.notifications.create).toHaveBeenCalledTimes(1);
    expect(chrome.notifications.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'basic',
      message: 'Roo is waiting for your input!'
    }));
    // For audio, we are checking console.log as a placeholder for now
    expect(console.log).toHaveBeenCalledWith('Playing audio cue for tab:', tabId);
  });

  test('should not send notification or play audio if already waiting', () => {
    const tabId = 127;
    const sender = { tab: { id: tabId } };

    // Simulate initial state as waiting
    global.mockOnMessageCallback({ type: 'ROO_STATUS_UPDATE', status: 'waiting' }, sender, jest.fn());
    jest.clearAllMocks(); // Clear mocks after initial state set

    // Simulate receiving waiting state again
    global.mockOnMessageCallback({ type: 'ROO_STATUS_UPDATE', status: 'waiting' }, sender, jest.fn());

    expect(chrome.notifications.create).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalledWith('Playing audio cue for tab:', tabId);
  });

  test('should clean up tab state when tab is removed', () => {
    const tabId = 128;
    const sender = { tab: { id: tabId } };

    // Simulate a tab being added and its state updated
    global.mockOnMessageCallback({ type: 'ROO_STATUS_UPDATE', status: 'running' }, sender, jest.fn());
    expect(statesByTabFromModule[tabId]).toBe('running');

    // Simulate tab removal
    const onRemovedCallback = chrome.tabs.onRemoved.addListener.mock.calls[0][0];
    onRemovedCallback(tabId);

    expect(statesByTabFromModule[tabId]).toBeUndefined();
  });
});