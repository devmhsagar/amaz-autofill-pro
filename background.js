// Amaz Autofill Pro - Background Service Worker

function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // Emerald green
    chrome.action.setBadgeText({ text: "ON" });
  } else {
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" }); // Red
    chrome.action.setBadgeText({ text: "OFF" });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('autoFillEnabled', (data) => {
    updateBadge(data.autoFillEnabled || false);
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('autoFillEnabled', (data) => {
    updateBadge(data.autoFillEnabled || false);
  });
});

// Sync badge when autoFillEnabled changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.autoFillEnabled) {
    updateBadge(changes.autoFillEnabled.newValue);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab && tab.url) {
    // Skip internal/restricted URLs
    if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://") || tab.url.startsWith("edge://")) {
      return;
    }

    chrome.storage.local.get('autoFillEnabled', (data) => {
      const autoFillEnabled = data.autoFillEnabled || false;
      updateBadge(autoFillEnabled);

      if (autoFillEnabled) {
        // Send message to content script (which strictly checks tender ID match)
        chrome.tabs.sendMessage(tabId, { action: "autoFillOnLoad" }, (response) => {
          if (chrome.runtime.lastError) {
            // If content script wasn't ready, inject and trigger once
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              files: ['content.js']
            }).then(() => {
              chrome.tabs.sendMessage(tabId, { action: "autoFillOnLoad" }, () => {
                if (chrome.runtime.lastError) {
                  // Silently ignore if tab closed
                }
              });
            }).catch(() => {});
          }
        });
      }
    });
  }
});
