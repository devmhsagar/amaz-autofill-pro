// Amaz Autofill Pro - Content Script
(function () {
    if (window.__AMAZ_AUTOFILL_LOADED__) {
        return;
    }
    window.__AMAZ_AUTOFILL_LOADED__ = true;

    // Helper to normalize e-GP field keys across tenders
    // E.g. row10703905_1_7 -> row_NORM__1_7, row_DataType10703905_1_7 -> row_DataType_NORM__1_7
    function getNormalizedKey(key) {
        if (!key) return '';
        const m = key.match(/^([a-zA-Z_]+?)(\d+)(_\d+_\d+)$/);
        if (m) {
            return m[1] + '_NORM_' + m[3];
        }
        const m2 = key.match(/^(tableCount|originalTableCount)\d+$/);
        if (m2) {
            return m2[1] + '_NORM';
        }
        return key;
    }

    // Build a normalized lookup map from saved form data
    function buildNormalizedFormData(formData) {
        const normMap = {};
        if (!formData) return normMap;
        Object.keys(formData).forEach(k => {
            const normKey = getNormalizedKey(k);
            normMap[normKey] = formData[k];
        });
        return normMap;
    }

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

    // Helper to detect number of rate item rows on the active page
    function getItemCountFromPage(inputs) {
        const editRowCountInput = document.querySelector('input[name="editRowCount"], input#editRowCount');
        if (editRowCountInput && editRowCountInput.value && !isNaN(parseInt(editRowCountInput.value, 10))) {
            return parseInt(editRowCountInput.value, 10) - 1;
        }
        const unitPriceRows = new Set();
        inputs.forEach(input => {
            const k = input.name || input.id || '';
            const m = k.match(/^row\d+_(\d+)_7$/);
            if (m) unitPriceRows.add(parseInt(m[1], 10));
        });
        if (unitPriceRows.size > 0) return unitPriceRows.size;

        const allRows = new Set();
        inputs.forEach(input => {
            const k = input.name || input.id || '';
            const m = k.match(/^row\d+_(\d+)_(\d+)$/);
            if (m) allRows.add(parseInt(m[1], 10));
        });
        if (allRows.size > 1) return allRows.size - 1;
        return allRows.size;
    }

    // Save form data under the current tender ID and formId
    function saveFormData(formName) {
        const inputs = document.querySelectorAll('input, textarea, select');
        const formData = {};

        // Collect form data
        inputs.forEach(input => {
            if (input.type === 'button' || input.type === 'submit' || input.type === 'reset') return;
            const uniqueKey = input.id || input.name || input.className;
            if (uniqueKey) {
                formData[uniqueKey] = input.value;
            }
        });

        const urlParams = new URLSearchParams(window.location.search);
        const tenderId = urlParams.get('tenderId');  // tenderId from URL
        const formId = urlParams.get('formId');      // formId from URL

        if (!tenderId || !formId) {
            alert('Error: tenderId or formId not found in the URL.');
            return;
        }

        // Use tenderId and formId as keys to save data
        chrome.storage.local.get('savedForms', (data) => {
            const savedForms = data.savedForms || {};
            if (!savedForms[tenderId]) {
                savedForms[tenderId] = {};
            }

            savedForms[tenderId][formId] = formData;
            chrome.storage.local.set({ savedForms }, () => {
                const count = Object.keys(formData).length;
                const itemCount = getItemCountFromForm(formData);
                const itemMsg = itemCount > 0 ? `\nRate items detected: ${itemCount}` : '';
                alert(`Form data saved successfully!\nTender ID: ${tenderId}\nForm ID: ${formId}\n(${count} fields saved${itemMsg})`);
            });
        });
    }

    // Perform Fill (Auto-Fill on page load OR Manual Trigger)
    function performAutoFill(options) {
        let isAutoOnLoad = false;
        let selectedTenderId = 'ALL';

        if (typeof options === 'object' && options !== null) {
            isAutoOnLoad = Boolean(options.isAutoOnLoad);
            selectedTenderId = options.selectedTenderId || 'ALL';
        } else if (typeof options === 'string') {
            selectedTenderId = options;
            if (options === '__AUTO_LOAD__') {
                isAutoOnLoad = true;
            }
        }

        chrome.storage.local.get('savedForms', (data) => {
            const savedForms = data.savedForms || {};
            const urlParams = new URLSearchParams(window.location.search);
            const tenderId = urlParams.get('tenderId');
            const formId = urlParams.get('formId');

            if (!tenderId || !formId) {
                if (!isAutoOnLoad) {
                    alert('Notice: tenderId or formId not found in the current page URL.');
                }
                return;
            }

            const inputs = document.querySelectorAll('input, textarea, select');
            if (!inputs || inputs.length === 0) {
                if (!isAutoOnLoad) {
                    alert('No form input fields found on this page.');
                }
                return;
            }

            // Detect current page item count
            const currentPageItemCount = getItemCountFromPage(inputs);

            // Collect current page field keys and normalized keys
            const pageFieldKeys = new Set();
            const pageNormKeys = new Set();
            inputs.forEach(input => {
                if (input.type === 'button' || input.type === 'submit' || input.type === 'reset') return;
                const keys = [input.id, input.name, input.className].filter(Boolean);
                keys.forEach(k => {
                    pageFieldKeys.add(k);
                    pageNormKeys.add(getNormalizedKey(k));
                });
            });

            // -------------------------------------------------------------
            // SCENARIO 1: AUTO-FILL ON PAGE LOAD (isAutoOnLoad === true)
            // -------------------------------------------------------------
            // Strict Rule: Auto-fill on page load ONLY if Tender ID matches!
            // If tenderId does NOT match, do NOT autofill on load.
            // -------------------------------------------------------------
            if (isAutoOnLoad) {
                if (savedForms[tenderId] && savedForms[tenderId][formId]) {
                    const formDataToFill = savedForms[tenderId][formId];
                    const normMap = buildNormalizedFormData(formDataToFill);
                    let filledCount = 0;

                    inputs.forEach(input => {
                        const keys = [input.id, input.name, input.className].filter(Boolean);
                        let val = undefined;

                        for (const k of keys) {
                            if (formDataToFill[k] !== undefined) {
                                val = formDataToFill[k];
                                break;
                            }
                            const normK = getNormalizedKey(k);
                            if (normMap[normK] !== undefined) {
                                val = normMap[normK];
                                break;
                            }
                        }

                        if (val !== undefined && val !== null) {
                            input.value = val;
                            try {
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                input.dispatchEvent(new Event('blur', { bubbles: true }));
                            } catch (e) {}
                            filledCount++;
                        }
                    });
                    console.log(`[Amaz Autofill Pro] Auto-filled ${filledCount} fields for matching Tender ID: ${tenderId} (Form ID: ${formId})`);
                } else {
                    console.log(`[Amaz Autofill Pro] Tender ID (${tenderId}) does not match saved data. Auto-fill on load skipped (manual fill available).`);
                }
                return;
            }

            // -------------------------------------------------------------
            // SCENARIO 2: MANUAL FILL (isAutoOnLoad === false)
            // -------------------------------------------------------------
            // Strict Rules:
            // 1. Dropdown MUST have an explicit Tender ID selected.
            //    If dropdown is not selected, do NOT fill anything!
            // 2. ONLY fill from that explicitly selected Tender ID!
            //    NEVER auto-guess or pick from other tenders (even if item count matches)!
            // 3. Item count must match:
            //    If selected tender has 15 items but current page has 16 items, STOP & alert!
            // -------------------------------------------------------------
            if (!selectedTenderId || selectedTenderId === '' || selectedTenderId === 'ALL') {
                alert('Please select a specific Tender ID from the dropdown first.');
                return;
            }

            if (!savedForms[selectedTenderId]) {
                alert(`No saved data found for Tender ID: ${selectedTenderId}.\nPlease select a valid Tender ID from the dropdown.`);
                return;
            }

            let formDataToFill = null;
            let sourceTenderId = selectedTenderId;

            // 1. Try exact formId match within the selected tender:
            if (savedForms[selectedTenderId][formId]) {
                formDataToFill = savedForms[selectedTenderId][formId];
            } else {
                // 2. If formId differs, pick the best matching form within the selected tender:
                let bestScore = 0;
                Object.keys(savedForms[selectedTenderId]).forEach(fId => {
                    const formObj = savedForms[selectedTenderId][fId];
                    let score = 0;
                    Object.keys(formObj).forEach(k => {
                        if (pageNormKeys.has(getNormalizedKey(k))) score++;
                    });
                    if (score > bestScore) {
                        bestScore = score;
                        formDataToFill = formObj;
                    }
                });
            }

            if (!formDataToFill) {
                alert(`No form data found in selected Tender ID: ${selectedTenderId}.`);
                return;
            }

            const savedItemCount = getItemCountFromForm(formDataToFill);

            // Strict Item Count verification:
            // Prevent partial filling (e.g. 15 items into 16 items, or 16 into 15)
            if (currentPageItemCount > 0 && savedItemCount > 0 && currentPageItemCount !== savedItemCount) {
                alert(`Cannot fill: Item Count Mismatch!\n` +
                      `Current tender has ${currentPageItemCount} items, but selected Tender (${selectedTenderId}) has ${savedItemCount} items.\n\n` +
                      `Filling was stopped to prevent leaving items blank or misaligning rates.`);
                return;
            }

            // Fill the form fields strictly from selectedTenderId
            const normMap = buildNormalizedFormData(formDataToFill);
            const isDifferentTender = (sourceTenderId !== tenderId);

            const protectedMetadata = ['hdnTenderId', 'hdnFormId', 'hdnBidId', 'hdnTblNum', 'signedData', 'curDate'];
            let filledCount = 0;

            inputs.forEach(input => {
                const keys = [input.id, input.name, input.className].filter(Boolean);
                let val = undefined;

                for (const k of keys) {
                    // When filling across different tenders, do NOT overwrite current tender's session IDs/signature
                    if (isDifferentTender && protectedMetadata.includes(k)) {
                        continue;
                    }

                    // 1. Exact key match
                    if (formDataToFill[k] !== undefined && formDataToFill[k] !== '') {
                        val = formDataToFill[k];
                        break;
                    }

                    // 2. Normalized e-GP table row match (handles dynamic table numbers across tenders)
                    const normK = getNormalizedKey(k);
                    if (normMap[normK] !== undefined && normMap[normK] !== '') {
                        val = normMap[normK];
                        break;
                    }
                }

                if (val !== undefined && val !== null) {
                    input.value = val;
                    try {
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        input.dispatchEvent(new Event('blur', { bubbles: true }));
                        if (typeof input.onchange === 'function') input.onchange();
                        if (typeof input.onblur === 'function') input.onblur();
                    } catch (e) {}
                    filledCount++;
                }
            });

            if (filledCount > 0) {
                if (sourceTenderId === tenderId) {
                    alert(`Form Auto-filled successfully!\n${filledCount} fields filled for Tender ID: ${tenderId}`);
                } else {
                    const itemsInfo = currentPageItemCount > 0 ? ` (${currentPageItemCount} of ${currentPageItemCount} items matched)` : '';
                    alert(`Manual Fill Successful!\n${filledCount} matching fields filled from Tender ID: ${sourceTenderId}${itemsInfo}\n(Current Tender ID: ${tenderId})`);
                }
            } else {
                alert(`Found saved data for Tender ID: ${sourceTenderId}, but no matching input fields found on this page.`);
            }
        });
    }

    // Message listener for auto-fill, save, and info
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'save') {
            saveFormData(request.formName);
        } else if (request.action === 'fill') {
            performAutoFill({ isAutoOnLoad: false, selectedTenderId: request.formName });
        } else if (request.action === 'autoFillOnLoad') {
            performAutoFill({ isAutoOnLoad: true, selectedTenderId: 'ALL' });
        } else if (request.action === 'getPageInfo') {
            const urlParams = new URLSearchParams(window.location.search);
            const tenderId = urlParams.get('tenderId');
            const formId = urlParams.get('formId');
            sendResponse({ tenderId, formId, url: window.location.href });
        }
    });
})();
