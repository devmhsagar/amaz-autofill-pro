// Amaz Autofill Pro - Popup Controller

document.addEventListener('DOMContentLoaded', () => {
  loadFormNames();
  initializeAutoFillToggle();
  detectActiveTabTender();

  // Open Options page
  const openOptionsBtn = document.getElementById('openOptions');
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }
});

// Helper to detect number of rate item rows in a saved form
function getItemCountFromForm(formObj) {
  if (!formObj) return 0;
  if (formObj['editRowCount'] && !isNaN(parseInt(formObj['editRowCount'], 10))) {
    return parseInt(formObj['editRowCount'], 10) - 1;
  }
  const unitPriceRows = new Set();
  Object.keys(formObj).forEach(k => {
    const m = k.match(/^row\d+_(\d+)_7$/);
    if (m) unitPriceRows.add(parseInt(m[1], 10));
  });
  if (unitPriceRows.size > 0) return unitPriceRows.size;

  const allRows = new Set();
  Object.keys(formObj).forEach(k => {
    const m = k.match(/^row\d+_(\d+)_(\d+)$/);
    if (m) allRows.add(parseInt(m[1], 10));
  });
  if (allRows.size > 1) return allRows.size - 1;
  return allRows.size;
}

// Load all saved tender IDs into dropdown
function loadFormNames(selectedForm = null) {
  chrome.storage.local.get('savedForms', (data) => {
    const savedForms = data.savedForms || {};
    const dropdown = document.getElementById('formNamesDropdown');
    dropdown.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Saved Tender ID --';
    dropdown.appendChild(defaultOption);

    const tenderKeys = Object.keys(savedForms);
    tenderKeys.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      
      const forms = savedForms[name] || {};
      const fIds = Object.keys(forms);
      let itemInfo = '';
      if (fIds.length > 0) {
        const count = getItemCountFromForm(forms[fIds[0]]);
        if (count > 0) {
          itemInfo = ` (${count} Items)`;
        }
      }
      option.textContent = `Tender ID: ${name}${itemInfo}`;
      dropdown.appendChild(option);
    });

    if (selectedForm && tenderKeys.includes(selectedForm)) {
      dropdown.value = selectedForm;
    } else {
      dropdown.value = '';
    }
  });
}

// Detect Tender ID and Form ID on active tab
function detectActiveTabTender() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0 || !tabs[0].url) return;

    try {
      const url = new URL(tabs[0].url);
      const tenderId = url.searchParams.get('tenderId');
      const formId = url.searchParams.get('formId');

      const tenderEl = document.getElementById('activeTenderId');
      const formEl = document.getElementById('activeFormId');
      const matchBadge = document.getElementById('matchBadge');

      if (tenderId || formId) {
        tenderEl.textContent = tenderId || 'N/A';
        formEl.textContent = formId || 'N/A';

        // Check if data is saved in storage
        chrome.storage.local.get('savedForms', (data) => {
          const savedForms = data.savedForms || {};

          if (tenderId && savedForms[tenderId] && savedForms[tenderId][formId]) {
            matchBadge.className = 'status-pill exact';
            matchBadge.textContent = '✓ ID Matched (Auto Ready)';
            // Pre-select this tender in dropdown
            loadFormNames(tenderId);
          } else if (Object.keys(savedForms).length > 0) {
            matchBadge.className = 'status-pill template';
            matchBadge.textContent = '⚡ Select from Dropdown';
            loadFormNames('');
          } else {
            matchBadge.className = 'status-pill none';
            matchBadge.textContent = 'New / Unsaved';
            loadFormNames('');
          }
        });
      } else {
        tenderEl.textContent = 'Not on e-GP';
        formEl.textContent = '-';
        matchBadge.className = 'status-pill';
        matchBadge.textContent = 'Inactive';
        loadFormNames('');
      }
    } catch (e) {
      console.warn('URL parse error:', e);
    }
  });
}

// Initialize the Auto-Fill Toggle Button
function initializeAutoFillToggle() {
  chrome.storage.local.get('autoFillEnabled', (data) => {
    const autoFillEnabled = data.autoFillEnabled || false;
    const toggleButton = document.getElementById('autoFillToggle');
    toggleButton.checked = autoFillEnabled;
  });

  // Toggle button event
  document.getElementById('autoFillToggle').addEventListener('change', (event) => {
    const isEnabled = event.target.checked;
    chrome.storage.local.set({ autoFillEnabled: isEnabled }, () => {
      // Update badge
      if (isEnabled) {
        chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
        chrome.action.setBadgeText({ text: "ON" });
      } else {
        chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        chrome.action.setBadgeText({ text: "OFF" });
      }
    });
  });
}

// Save form data under current tender ID
document.getElementById('saveForm').addEventListener('click', () => {
  const selectedFormName = document.getElementById('formNamesDropdown').value;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'save', formName: selectedFormName }, () => {
      // Refresh dropdown list after saving
      setTimeout(() => {
        detectActiveTabTender();
      }, 500);
    });
  });
});

// Manual trigger for form fill
document.getElementById('fillForm').addEventListener('click', () => {
  const selectedFormName = document.getElementById('formNamesDropdown').value;
  if (!selectedFormName || selectedFormName.trim() === '') {
    alert('Please select a Tender ID from the dropdown first.');
    return;
  }
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'fill', formName: selectedFormName });
  });
});
