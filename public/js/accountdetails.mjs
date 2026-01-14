import { loadHeaderFooter, myport } from "./utils.mjs";

loadHeaderFooter();
const port = myport();

// Handle page load and setup
window.addEventListener("DOMContentLoaded", () => {
  const yearPicker = document.getElementById("yearPicker");
  const accountPicker = document.getElementById("accountPicker");
  const accountInfo = document.getElementById("accountInfo");
  const accountDetailsTable = document.getElementById(
    "accountDetailsTableBody"
  );
  const tableContainer = document.getElementById("tableContainer");
  const errorMessage = document.getElementById("errorMessage");
  const loading = document.getElementById("loading");
  const noData = document.getElementById("noData");

  let accountsData = []; // Store accounts for display
  let glMasterCache = null; // Cache GL_MASTER data

  // Initialize year picker with current and previous years
  async function initializeYearPicker() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const yearOptions = [
      currentYear,
      currentYear - 1,
      currentYear - 2,
      currentYear - 3,
    ];

    const html =
      '<option value="">Select Year</option>' +
      yearOptions
        .map((year) => `<option value="${year}">${year}</option>`)
        .join("");

    yearPicker.innerHTML = html;
    yearPicker.value = currentYear;

    // Load GL_MASTER cache first
    await loadGLMaster();
    // Load accounts for the selected year
    await loadAccountsList();
  }

  // Fetch and cache GL_MASTER data
  async function loadGLMaster() {
    try {
      const response = await fetch("/accountdetails/gl-master");

      if (!response.ok) {
        console.error("Failed to load GL_MASTER cache");
        return;
      }

      glMasterCache = await response.json();
    } catch (err) {
      console.error("Error loading GL_MASTER: " + err.message);
    }
  }

  // Fetch and populate accounts dropdown
  async function loadAccountsList() {
    const year = yearPicker.value;
    if (!year) {
      accountPicker.innerHTML = '<option value="">Select Account</option>';
      return;
    }

    showLoading(true);

    try {
      const response = await fetch("/accountdetails/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year }),
      });

      if (!response.ok) {
        showError("Failed to load accounts list");
        showLoading(false);
        return;
      }

      const accountsFromYear = await response.json();

      // Match with GL_MASTER cache
      let html = '<option value="">Select Account</option>';
      for (const account of accountsFromYear) {
        const glAccount = account.GL_ACCOUNT;
        const masterRecord = glMasterCache?.find(
          (m) => m.GL_ACCOUNT === glAccount
        );
        const displayText = `${glAccount} - ${
          masterRecord?.DESCR || "No Description"
        }`;
        html += `<option value="${glAccount}">${displayText}</option>`;
      }

      accountPicker.innerHTML = html;
      accountPicker.value = "";

      // Clear display when accounts list changes
      clearDisplay();
    } catch (err) {
      showError("Error loading accounts: " + err.message);
    } finally {
      showLoading(false);
    }
  }

  // Fetch account details
  async function fetchAccountDetails(year, glAccount) {
    if (!year || !glAccount) {
      clearDisplay();
      return;
    }

    showLoading(true);
    clearError();

    try {
      const response = await fetch("/accountdetails/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, glAccount }),
      });

      if (!response.ok) {
        showError("Failed to load account details");
        showLoading(false);
        return;
      }

      const data = await response.json();
      renderAccountDetails(data, glAccount, year);
    } catch (err) {
      showError("Error fetching details: " + err.message);
    } finally {
      showLoading(false);
    }
  }

  // Render account details and table
  function renderAccountDetails(data, glAccount, year) {
    if (!data || data.length === 0) {
      tableContainer.style.display = "none";
      accountInfo.style.display = "none";
      noData.style.display = "block";
      return;
    }

    // Calculate totals
    let totalAmount = 0;
    for (const row of data) {
      totalAmount += parseFloat(row.AMOUNT) || 0;
    }

    // Update account info header
    const accountMaster = glMasterCache?.find((m) => m.GL_ACCOUNT == glAccount);
    document.getElementById(
      "accountTitle"
    ).textContent = `Account ${glAccount}`;
    document.getElementById("accountNumber").textContent = glAccount;
    document.getElementById("accountDescription").textContent =
      accountMaster?.DESCR || "Unknown";
    document.getElementById("totalAmount").textContent =
      totalAmount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      });
    document.getElementById("recordCount").textContent = data.length;

    accountInfo.style.display = "block";

    // Render table rows
    let html = "";
    for (const row of data) {
      const amount = parseFloat(row.AMOUNT) || 0;
      const postedDate = new Date(row.POST_DATE).toLocaleDateString("en-US");
      const transDate = row.T_DATE
        ? new Date(row.T_DATE).toLocaleDateString("en-US")
        : "-";
      const periodBegDate = row.PERIOD_BEG_DATE
        ? new Date(row.PERIOD_BEG_DATE).toLocaleDateString("en-US")
        : "-";

      html += `<tr>
        <td>${postedDate}</td>
        <td>${row.BATCH_NUM || "-"}</td>
        <td>${row.BATCH_LINE || "-"}</td>
        <td>${transDate}</td>
        <td>${row.PERIOD || "-"}</td>
        <td>${row.REFERENCE || "-"}</td>
        <td>${row.DESCR || "-"}</td>
        <td class="amount">${amount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}</td>
      </tr>`;
    }

    // Add summary row
    html += `<tr class="summary-row">
      <td colspan="7" style="text-align: right;">TOTAL:</td>
      <td class="amount">${totalAmount.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })}</td>
    </tr>`;

    accountDetailsTable.innerHTML = html;
    tableContainer.style.display = "block";
    noData.style.display = "none";
  }

  // Clear all displays
  function clearDisplay() {
    accountDetailsTable.innerHTML = "";
    tableContainer.style.display = "none";
    accountInfo.style.display = "none";
    noData.style.display = "block";
    clearError();
  }

  // Show/hide loading indicator
  function showLoading(show) {
    loading.style.display = show ? "block" : "none";
  }

  // Show error message
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
  }

  // Clear error message
  function clearError() {
    errorMessage.style.display = "none";
    errorMessage.textContent = "";
  }

  // Event listeners
  yearPicker.addEventListener("change", loadAccountsList);
  accountPicker.addEventListener("change", () => {
    const year = yearPicker.value;
    const glAccount = accountPicker.value;
    fetchAccountDetails(year, glAccount);
  });

  // Initialize on page load
  initializeYearPicker();
});
