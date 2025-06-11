# Roo Status Badge Chrome Extension

This Chrome Extension provides a visual status badge for Roo, indicating its current state (waiting for user, running task, or idle). It also provides desktop notifications and audio cues for state transitions.

## Features

- **Visual Status Badge**: Changes color and text based on Roo's state.
  - Red with 👋: Waiting for user input
  - Yellow (blank): Running a task
  - Green (blank): Idle
- **Desktop Notifications**: Notifies when Roo transitions to "waiting for user" from "running task" in the background.
- **Audio Cues**: Plays a default audio cue with desktop notifications.

## Quick Start

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/cgmack/roo-status-badge.git
    ```
2.  **Load the extension in Chrome**:
    *   Open Chrome and navigate to `chrome://extensions`.
    *   Enable "Developer mode" using the toggle switch in the top right corner.
    *   Click on "Load unpacked" and select the cloned `roo-status-badge` directory.
3.  **Integrate with your Roo application**:
    *   Ensure your Roo application sends status updates to the Chrome Extension. The extension listens for messages with `type: 'ROO_STATUS_UPDATE'` and a `status` field (`waiting`, `running`, or `idle`).
    *   Example of sending a message from your application's content script:
        ```javascript
        chrome.runtime.sendMessage({ type: 'ROO_STATUS_UPDATE', status: 'waiting' });
        ```

## License

[MIT License](LICENSE)
