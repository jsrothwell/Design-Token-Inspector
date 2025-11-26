// Background script for Design Token Inspector

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Design Token Inspector installed!');
    
    browser.storage.local.set({
      installDate: Date.now(),
      version: browser.runtime.getManifest().version
    });
  } else if (details.reason === 'update') {
    console.log('Design Token Inspector updated!');
  }
});

// Listen for messages from content scripts or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    browser.storage.local.get('settings').then(result => {
      sendResponse(result.settings || {});
    });
    return true;
  }
});
