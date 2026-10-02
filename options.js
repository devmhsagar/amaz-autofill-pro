// Amaz Autofill Pro - Options & Data Manager

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();

  // Dropdown inspector change
  const dropdown = document.getElementById('formNamesDropdown');
  if (dropdown) {
    dropdown.addEventListener('change', () => {
      inspectTender(dropdown.value);
    });
  }

  // Refresh inspector
  const refreshBtn = document.getElementById('refreshInspector');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadAllData();
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
    return 0;
}

// Load all saved forms and populate stats, table, and inspector
function loadAllData() {
  chrome.storage.local.get('savedForms', (data) => {
    const savedForms = data.savedForms || {};
    const tenderKeys = Object.keys(savedForms);

    // Calculate stats
    let totalForms = 0;
    let totalFields = 0;

    tenderKeys.forEach(tId => {
      const formsObj = savedForms[tId] || {};
      const fIds = Object.keys(formsObj);
      totalForms += fIds.length;
      fIds.forEach(fId => {
        totalFields += Object.keys(formsObj[fId] || {}).length;
      });
    });

    // Update Stats UI
    document.getElementById('statTenders').textContent = tenderKeys.length;
    document.getElementById('statForms').textContent = totalForms;
    document.getElementById('statFields').textContent = totalFields;

    // Populate Table
    const tbody = document.getElementById('tenderTableBody');
    tbody.innerHTML = '';

    if (tenderKeys.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No saved tender data found yet.<br>Save data from e-GP tender pages to see them here.</td></tr>`;
    } else {
      tenderKeys.forEach(tId => {
        const formsObj = savedForms[tId] || {};
        const fIds = Object.keys(formsObj);
        let tenderFieldCount = 0;
        let maxItemCount = 0;
        fIds.forEach(fId => {
          tenderFieldCount += Object.keys(formsObj[fId] || {}).length;
          const items = getItemCountFromForm(formsObj[fId]);
          if (items > maxItemCount) maxItemCount = items;
        });

        const tr = document.createElement('tr');

        // Form pills
        const formPillsHtml = fIds.map(fId => `<span class="form-pill">Form: ${fId}</span>`).join(' ');
        const itemBadge = maxItemCount > 0 ? `<span style="font-size:11px; margin-left:6px; color:#38bdf8; font-weight:700;">[${maxItemCount} Items]</span>` : '';

        tr.innerHTML = `
          <td><span class="tender-badge">Tender #${tId}</span>${itemBadge}</td>
          <td>${formPillsHtml || '<span style="color:#64748b">No forms</span>'}</td>
          <td><strong>${tenderFieldCount}</strong> fields</td>
          <td style="text-align: right;">
            <button class="btn btn-danger btn-sm delete-tender-btn" data-tender="${tId}">🗑️ Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Bind delete single tender buttons
      document.querySelectorAll('.delete-tender-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tId = e.currentTarget.getAttribute('data-tender');
          deleteSingleTender(tId);
        });
      });
    }

    // Populate Inspector Dropdown
    const dropdown = document.getElementById('formNamesDropdown');
    const currentSelected = dropdown.value;
    dropdown.innerHTML = '<option value="">Select a Tender...</option>';

    tenderKeys.forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `Tender ID: ${name}`;
      dropdown.appendChild(option);
    });

    if (currentSelected && tenderKeys.includes(currentSelected)) {
      dropdown.value = currentSelected;
      inspectTender(currentSelected);
    } else if (tenderKeys.length > 0) {
      dropdown.value = tenderKeys[0];
      inspectTender(tenderKeys[0]);
    } else {
      document.getElementById('inspectorContent').innerHTML = '<div class="empty-state">No tender data saved yet.</div>';
    }
  });
}

// Inspect a specific tender's fields
function inspectTender(tenderId) {
  const container = document.getElementById('inspectorContent');
  if (!tenderId) {
    container.innerHTML = '<div class="empty-state">Select a Tender ID above to preview stored rate items.</div>';
    return;
  }

  chrome.storage.local.get('savedForms', (data) => {
    const savedForms = data.savedForms || {};
    const tenderForms = savedForms[tenderId];

    if (!tenderForms || Object.keys(tenderForms).length === 0) {
      container.innerHTML = `<div class="empty-state">No forms found for Tender ID: ${tenderId}</div>`;
      return;
    }

    let html = '';
    Object.keys(tenderForms).forEach(fId => {
      const formFields = tenderForms[fId];
      const fieldKeys = Object.keys(formFields);
      html += `
        <div style="margin-bottom: 16px;">
          <h4 style="color:#60a5fa; font-size:13px; margin-bottom:8px;">Form ID: ${fId} (${fieldKeys.length} fields)</h4>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); color:#94a3b8;">
                <th style="padding:6px; text-align:left;">Field Key</th>
                <th style="padding:6px; text-align:left;">Saved Value</th>
              </tr>
            </thead>
            <tbody>
      `;

      fieldKeys.forEach(k => {
        const val = formFields[k];
        html += `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:6px; font-family:monospace; color:#cbd5e1;">${escapeHtml(k)}</td>
            <td style="padding:6px; font-weight:600; color:#34d399;">${escapeHtml(String(val))}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    });

    container.innerHTML = html;
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Delete a single tender
function deleteSingleTender(tenderId) {
  if (confirm(`Are you sure you want to delete Tender ID: ${tenderId}?`)) {
    chrome.storage.local.get('savedForms', (data) => {
      const savedForms = data.savedForms || {};
      if (savedForms[tenderId]) {
        delete savedForms[tenderId];
        chrome.storage.local.set({ savedForms }, () => {
          alert(`Tender ID: ${tenderId} has been deleted.`);
          loadAllData();
        });
      }
    });
  }
}

// Export all form data as CSV
document.getElementById('exportData').addEventListener('click', () => {
  chrome.storage.local.get('savedForms', (data) => {
    const savedForms = data.savedForms || {};
    let csvContent = "tenderId,formId,fieldKey,fieldValue\n";

    Object.keys(savedForms).forEach(tenderId => {
      Object.keys(savedForms[tenderId]).forEach(formId => {
        const formData = savedForms[tenderId][formId];
        Object.keys(formData).forEach(fieldKey => {
          let fieldValue = String(formData[fieldKey]);
          // Escape quotes and wrap in quotes if needed
          if (fieldValue.includes(',') || fieldValue.includes('"') || fieldValue.includes('\n')) {
            fieldValue = `"${fieldValue.replace(/"/g, '""')}"`;
          }
          csvContent += `${tenderId},${formId},${fieldKey},${fieldValue}\n`;
        });
      });
    });

    // Create and download CSV file with blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `amaz_autofill_pro_data_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
});

// Import form data from CSV
document.getElementById('importData').addEventListener('click', () => {
  const fileInput = document.getElementById('importFile');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a CSV file to import.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const csvData = e.target.result;
    const lines = csvData.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      alert('The selected CSV file appears to be empty or contains only headers.');
      return;
    }

    const rows = lines.slice(1);
    const importedForms = {};
    let importedCount = 0;

    rows.forEach(row => {
      // Parse CSV line handling potential quoted values
      const parts = parseCsvRow(row);
      if (parts.length >= 4) {
        const [tenderId, formId, fieldKey, fieldValue] = parts;
        const tId = tenderId.trim();
        const fId = formId.trim();
        const fKey = fieldKey.trim();
        const fVal = fieldValue.trim();

        if (tId && fId && fKey) {
          if (!importedForms[tId]) importedForms[tId] = {};
          if (!importedForms[tId][fId]) importedForms[tId][fId] = {};
          importedForms[tId][fId][fKey] = fVal;
          importedCount++;
        }
      }
    });

    chrome.storage.local.get('savedForms', (data) => {
      const existingForms = data.savedForms || {};

      // Merge imported data
      Object.keys(importedForms).forEach(tId => {
        if (!existingForms[tId]) existingForms[tId] = {};
        Object.keys(importedForms[tId]).forEach(fId => {
          if (!existingForms[tId][fId]) existingForms[tId][fId] = {};
          Object.assign(existingForms[tId][fId], importedForms[tId][fId]);
        });
      });

      chrome.storage.local.set({ savedForms: existingForms }, () => {
        alert(`Form data imported successfully!\nProcessed ${importedCount} field items across ${Object.keys(importedForms).length} tender(s).`);
        fileInput.value = '';
        loadAllData();
      });
    });
  };
  reader.readAsText(file);
});

// Helper to parse standard CSV line with quote escaping
function parseCsvRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Delete all data
document.getElementById('deleteAllData').addEventListener('click', () => {
  if (confirm('Are you sure you want to delete ALL form data across ALL tenders?\nThis action cannot be undone!')) {
    chrome.storage.local.remove('savedForms', () => {
      alert('All form data has been deleted.');
      loadAllData();
    });
  }
});
