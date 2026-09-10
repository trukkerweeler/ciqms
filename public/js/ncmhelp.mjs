import { loadHeaderFooter, getApiUrl } from "./utils.mjs";

loadHeaderFooter();

let url = "";

document.addEventListener("DOMContentLoaded", async () => {
  const apiUrl = await getApiUrl();
  url = `${apiUrl}/ncmhelp`;
  setupNcmHelpEvents();
  await loadNcmHelpData();
});

function setupNcmHelpEvents() {
  document.getElementById("addNcmHelpBtn")?.addEventListener("click", () => {
    document.getElementById("addNcmHelpForm").reset();
    document.getElementById("addNcmHelpDialog").showModal();
  });

  document.getElementById("closeNcmHelpBtn")?.addEventListener("click", () => {
    document.getElementById("addNcmHelpDialog").close();
  });

  document
    .getElementById("addNcmHelpForm")
    ?.addEventListener("submit", saveNcmHelp);

  document
    .getElementById("ncmHelpFile")
    ?.addEventListener("change", uploadNcmHelpFile);
}

async function uploadNcmHelpFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const linkInput = document.getElementById("ncmHelpLink");
  linkInput.value = "Uploading...";
  linkInput.disabled = true;

  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${url}/upload`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("Upload failed");
    const result = await response.json();
    linkInput.value = result.path;
  } catch (error) {
    console.error("Error uploading NCM help file:", error);
    linkInput.value = "";
    alert("Failed to upload the file. Please try again.");
  } finally {
    linkInput.disabled = false;
  }
}

async function saveNcmHelp(event) {
  event.preventDefault();
  const data = {
    SUBJECT: document.getElementById("ncmHelpSubject").value.trim(),
    DESCRIPTION: document.getElementById("ncmHelpDescription").value.trim(),
    LINK: document.getElementById("ncmHelpLink").value.trim(),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(await response.text());
    document.getElementById("addNcmHelpDialog").close();
    await loadNcmHelpData();
  } catch (error) {
    console.error("Error saving NCM help:", error);
    alert("Failed to save the NCM help record. Please try again.");
  }
}

async function loadNcmHelpData() {
  const container = document.getElementById("ncmHelpTableContainer");
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Request failed");
    const records = await response.json();
    displayNcmHelpTable(records);
  } catch (error) {
    console.error("Error loading NCM help:", error);
    container.innerHTML =
      '<p class="error">Failed to load NCM training resources.</p>';
  }
}

function displayNcmHelpTable(records) {
  const container = document.getElementById("ncmHelpTableContainer");
  if (!records.length) {
    container.innerHTML =
      "<p>No NCM training resources have been added yet.</p>";
    return;
  }

  const table = document.createElement("table");
  table.className = "data-table";
  table.innerHTML =
    "<thead><tr><th>Subject</th><th>Description</th><th>Link</th></tr></thead>";
  const tbody = document.createElement("tbody");

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td></td><td></td><td></td>`;
    row.cells[0].textContent = record.SUBJECT || "";
    row.cells[1].textContent = record.DESCRIPTION || "";

    if (record.LINK) {
      const link = document.createElement("a");
      link.href = record.LINK;
      if (!/^https?:\/\//i.test(link.href) && !record.LINK.startsWith("/")) {
        link.href = `/input-files/${record.LINK}`;
      }
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View Resource";
      row.cells[2].appendChild(link);
    }
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.replaceChildren(table);
}
