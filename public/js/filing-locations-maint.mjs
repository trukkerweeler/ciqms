const state = { entries: {}, editingKey: null };

const rows = document.getElementById("rows");
const message = document.getElementById("message");
const modal = document.getElementById("modal");
const backdrop = document.getElementById("backdrop");
const codeInput = document.getElementById("codeInput");
const locationInput = document.getElementById("locationInput");
const modalTitle = document.getElementById("modalTitle");

async function loadEntries() {
  const response = await fetch("/api/filing-locations");
  if (!response.ok) {
    throw new Error("Unable to load filing locations");
  }
  const data = await response.json();
  state.entries = data || {};
  render();
}

function render() {
  rows.innerHTML = "";
  const entries = Object.entries(state.entries).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  if (!entries.length) {
    rows.innerHTML =
      '<tr><td colspan="3">No filing locations defined.</td></tr>';
    return;
  }

  for (const [key, value] of entries) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${key}</td>
      <td>${value}</td>
      <td class="actions">
        <button class="btn btn-secondary edit-btn">Edit</button>
        <button class="btn btn-danger delete-btn">Delete</button>
      </td>`;

    tr.querySelector(".edit-btn").addEventListener("click", () =>
      openModal(key, value),
    );
    tr.querySelector(".delete-btn").addEventListener("click", () =>
      deleteEntry(key),
    );
    rows.appendChild(tr);
  }
}

function showMessage(text, type = "success") {
  message.innerHTML = `<div class="message ${type}">${text}</div>`;
}

function openModal(key = "", value = "") {
  state.editingKey = key;
  modalTitle.textContent = key ? "Edit Filing Location" : "Add Filing Location";
  codeInput.value = key;
  locationInput.value = value;
  modal.style.display = "block";
  backdrop.style.display = "block";
  codeInput.focus();
}

function closeModal() {
  modal.style.display = "none";
  backdrop.style.display = "none";
  codeInput.value = "";
  locationInput.value = "";
  state.editingKey = null;
}

async function saveEntry() {
  const code = codeInput.value.trim().toUpperCase();
  const location = locationInput.value.trim();
  if (!code || !location) {
    showMessage("Both code and location are required.", "error");
    return;
  }

  const response = await fetch("/api/filing-locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: state.editingKey, code, location }),
  });

  const data = await response.json();
  if (!response.ok) {
    showMessage(data.error || "Unable to save filing location.", "error");
    return;
  }

  showMessage(data.message || "Saved successfully.", "success");
  closeModal();
  await loadEntries();
}

async function deleteEntry(key) {
  if (!confirm(`Delete ${key}?`)) return;
  const response = await fetch("/api/filing-locations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  const data = await response.json();
  if (!response.ok) {
    showMessage(data.error || "Unable to delete filing location.", "error");
    return;
  }
  showMessage(data.message || "Deleted successfully.", "success");
  await loadEntries();
}

document.getElementById("addBtn").addEventListener("click", () => openModal());
document.getElementById("saveBtn").addEventListener("click", saveEntry);
document.getElementById("cancelBtn").addEventListener("click", closeModal);
document.getElementById("backdrop").addEventListener("click", closeModal);

loadEntries().catch((error) => {
  showMessage(error.message, "error");
});
