# ⚡ Amaz Autofill Pro

**Amaz Autofill Pro** is a powerful, production-grade Chrome extension tailored specifically for Bangladesh e-GP (Electronic Government Procurement - [eprocure.gov.bd](https://www.eprocure.gov.bd)) contractors and bidders.

It streamlines filling rate schedules and Bill of Quantities (BOQ) across repetitive tenders with identical item specifications while maintaining strict data integrity and safety.

---

## 🌟 Key Features

* **Strict Tender-ID Matching (Auto-Fill on Load):**
  When toggled ON, rate schedules auto-fill strictly if the page's Tender ID matches your saved tender data. Non-matching tenders will never be accidentally auto-filled on load.

* **Cross-Tender Manual Rate Filling (OTM / Batch Tenders):**
  Easily replicate rates from a reference tender to multiple identical tenders (e.g. 40+ packages under the same procurement batch). Dynamic table prefixes (`row{hdnTblNum}_...`) are automatically normalized across different forms.

* **Explicit Dropdown Protection & Anti-Collision:**
  Manual fill requires selecting the exact Tender ID from the dropdown. No guessing or automatic candidate picking, even when multiple tenders share the exact same number of items.

* **Field Count & Item Count Safety Mismatch Verification:**
  Prevents partial filling. If a selected template has 15 items but the active tender page has 16 items, filling is automatically blocked with an alert to prevent incomplete submissions.

* **Session & Security Metadata Protection:**
  When filling rates across different tenders, critical session IDs (`hdnTenderId`, `hdnFormId`, `hdnBidId`, `hdnTblNum`, `signedData`, `curDate`) are preserved intact to avoid invalidating the submission.

* **Modern Dark-Mode Dashboard:**
  * Real-time statistics (total saved tenders, forms, and fields).
  * Form inspector with item count badges (`[16 Items]`).
  * Individual tender profile deletion and clear all storage options.
  * Backup & Restore with JSON export and import.

---

## 📥 Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/devmhsagar/amaz-autofill-pro.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle switch in the top-right corner).
4. Click **Load unpacked** and select the `amazautofill` folder.
5. The extension icon will appear in your Chrome toolbar. Pin it for quick access!

---

## 🚀 How to Use

### 1. Saving Tender Rates
1. Navigate to the rate schedule / BOQ page of a tender on [eprocure.gov.bd](https://www.eprocure.gov.bd).
2. Fill in the rates, unit prices, and calculations.
3. Open the **Amaz Autofill Pro** popup and click **💾 Save Current Form Data**.

### 2. Auto-Filling Matching Tenders
* Turn the **Auto-Fill on Page Load** toggle **ON**.
* Whenever you open the same Tender ID, rates will be filled automatically.

### 3. Replicating Rates Across Multiple Tenders
1. Open a new tender page with identical items.
2. Open the **Amaz Autofill Pro** popup.
3. Select the source Tender ID from the **"Select Saved Tender ID to Copy From"** dropdown.
4. Click **⚡ Manual Auto-Fill Form**.
5. All matching unit prices, figures, and words will be filled instantaneously.

---

## 🛡️ Privacy & Security

* **Local Storage Only:** All tender profiles and data remain strictly on your local browser via `chrome.storage.local`.
* **Zero External Calls:** No data is sent to external servers or third parties.
* **Non-Destructive:** Does not alter any page elements or browser default behavior outside e-GP form interactions.

---

## 👨‍💻 Author

Developed with ❤️ by [devmhsagar](https://github.com/devmhsagar).
