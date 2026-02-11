import {
  loadHeaderFooter,
  getSessionUser,
  myport,
  getApiUrl,
} from "./utils.mjs";

loadHeaderFooter();
const apiUrl = await getApiUrl();
const DEBUG = false;
const FIELD_LIST = [
  "DOCUMENT_ID",
  "NAME",
  "TYPE",
  "STATUS",
  "REVISION_LEVEL",
  "ISSUE_DATE",
  "SUBJECT",
  "CTRL_DOC",
  "DIST_DOC",
];
const EDITABLE_FIELDS = [
  "NAME",
  "TYPE",
  "SUBJECT",
  "STATUS",
  "REVISION_LEVEL",
  "ISSUE_DATE",
  "CTRL_DOC",
  "DIST_DOC",
];

// Helper functions
const clearElement = (element) => {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

const createElement = (tag, attributes = {}, textContent = "") => {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === "className") {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
};

const formatFieldValue = (key, value) => {
  switch (key) {
    case "ISSUE_DATE":
      return `Issue Date: ${value.slice(0, 10)}`;
    case "REVISION_LEVEL":
      return `Rev. ${value}`;
    default:
      return `${key}: ${value}`;
  }
};

const isDocumentField = (key) => {
  return key === "DIST_DOC" || key === "CTRL_DOC";
};

const extractDocumentPath = (filePath) => {
  if (!filePath) return "";
  // Remove drive letter prefix (e.g., "K:/") and normalize slashes
  let normalizedPath = filePath.replace(/\\/g, "/");
  // Remove drive letter and colon if present
  normalizedPath = normalizedPath.replace(/^[A-Za-z]:\//, "");
  // Remove "Quality/" prefix if present since server serves from Quality folder
  normalizedPath = normalizedPath.replace(/^Quality\//, "");
  return normalizedPath;
};

const formatDate = () => new Date().toLocaleString();

// API functions
const fetchDocument = async (url) => {
  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error("Failed to fetch document");
  }
  return response.json();
};

const updateDocument = async (url, data) => {
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Failed to update document");
  }
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  } else {
    return response.text();
  }
};

// UI rendering functions
const renderDocumentDetail = (record, user) => {
  const detailSection = createElement("section", {
    className: "section",
    id: "docsSection",
  });

  // Create header container with filter and button
  const headerContainer = createElement("div", {
    style:
      "display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 1rem;",
  });

  const detailHeading = createElement(
    "h3",
    { id: "detailTitle", style: "margin: 0; flex: 1;" },
    "Document Detail",
  );

  const btnEditDoc = createElement(
    "button",
    {
      className: "btn btnEditNotes",
      id: "btnEditDoc",
      type: "submit",
      style: "padding: 0.5rem 1rem; width: 120px;",
    },
    "Edit",
  );

  headerContainer.appendChild(detailHeading);
  headerContainer.appendChild(btnEditDoc);
  detailSection.appendChild(headerContainer);

  // Create container for detail fields with filter capability
  const detailContent = createElement("div", { id: "detailContent" });

  // Render document fields
  Object.entries(record[0]).forEach(([key, value]) => {
    if (FIELD_LIST.includes(key)) {
      const p = createElement("p", { className: "docdata", "data-field": key });

      // Create clickable link for DIST_DOC (available to all users)
      if (key === "DIST_DOC" && value && value.trim() !== "") {
        const label = document.createTextNode(`${key}: `);
        const docPath = extractDocumentPath(value);
        const filename = docPath.split("/").pop();
        const link = createElement(
          "a",
          {
            href: `/document-files/${docPath}`,
            target: "_blank",
          },
          filename,
        );

        // Add error handler for when file is not available
        link.addEventListener("click", async (e) => {
          e.preventDefault();
          try {
            const response = await fetch(`/document-files/${docPath}`, {
              method: "HEAD",
            });
            if (response.ok) {
              window.open(`/document-files/${docPath}`, "_blank");
            } else {
              alert(
                "Document file is not currently available. The network location may be unavailable or the file may have been moved. Please contact Quality Management.",
              );
            }
          } catch (error) {
            alert(
              "Unable to access document files. Please check your network connection or contact IT.",
            );
          }
        });

        p.appendChild(label);
        p.appendChild(link);
      } else {
        p.textContent = formatFieldValue(key, value);
      }

      detailContent.appendChild(p);
    }
  });

  detailSection.appendChild(detailContent);

  return detailSection;
};

const renderEditDialog = (record) => {
  const detailDialog = document.querySelector("#detailDialog");
  clearElement(detailDialog);

  Object.entries(record[0]).forEach(([field, value]) => {
    if (FIELD_LIST.includes(field)) {
      const fieldDesc = createElement("label", {}, field);
      detailDialog.appendChild(fieldDesc);

      const formfield = createElement("input", {
        type: "text",
        id: field,
        className: "field detailedit",
        value: value ?? "",
      });
      detailDialog.appendChild(formfield);
    }
  });

  const saveDetail = createElement(
    "button",
    {
      className: "btn dialogSaveBtn",
      id: "saveDetail",
    },
    "Save",
  );
  detailDialog.appendChild(saveDetail);

  const btnCancelDetail = createElement(
    "button",
    {
      className: "btn closedialog",
      id: "btnCancelDetail",
    },
    "Cancel",
  );
  detailDialog.appendChild(btnCancelDetail);

  return detailDialog;
};

// Event handlers
const setupDialogCloseHandlers = () => {
  const closeDialogButtons = document.querySelectorAll(".closedialog");
  closeDialogButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const dialog = button.closest("dialog");
      if (dialog) {
        dialog.close();
      }
    });
  });
};

const setupEditHandler = (record, port, documentId, user) => {
  const btnEditDoc = document.querySelector("#btnEditDoc");
  if (!btnEditDoc) return;

  btnEditDoc.addEventListener("click", (event) => {
    event.preventDefault();
    const detailDialog = document.querySelector("#detailDialog");
    if (detailDialog) {
      renderEditDialog(record);
      detailDialog.showModal();
      setupSaveHandler(record, port, documentId, user);
      setupDialogCloseHandlers();
    }
  });
};

const setupSaveHandler = (record, port, documentId, user) => {
  const saveDetail = document.querySelector("#saveDetail");
  if (!saveDetail) return;

  saveDetail.addEventListener("click", async (event) => {
    event.preventDefault();

    const data = {
      DOCUMENT_ID: documentId,
      MODIFIED_BY: user,
      MODIFIED_DATE: formatDate(),
    };

    // Collect editable field values
    EDITABLE_FIELDS.forEach((field) => {
      const fieldElement = document.querySelector(`#${field}`);
      if (fieldElement) {
        data[field] = fieldElement.value;
      }
    });

    if (DEBUG) {
      console.log("Saving data:", data);
    }

    try {
      const detailsUrl = `${apiUrl}/sysdocs/${documentId}`;
      await updateDocument(detailsUrl, data);

      const detailDialog = document.querySelector("#detailDialog");
      if (detailDialog) {
        detailDialog.close();
      }
      window.location.reload();
    } catch (error) {
      console.error("Error updating document:", error);
      alert("Failed to update document. Please try again.");
    }
  });
};

// Main initialization
const init = async () => {
  const user = await getSessionUser();
  const port = myport();

  const urlParams = new URLSearchParams(window.location.search);
  const documentId = urlParams.get("document_id");

  if (DEBUG) {
    console.log("User:", user);
    console.log("Document ID:", documentId);
  }

  const url = `${apiUrl}/sysdocs/${documentId}`;
  const main = document.querySelector("main");
  clearElement(main);

  try {
    const record = await fetchDocument(url);

    const detailSection = renderDocumentDetail(record, user);
    main.appendChild(detailSection);

    setupEditHandler(record, port, documentId, user);
    setupDialogCloseHandlers();
  } catch (error) {
    console.error("Error loading document:", error);
    main.innerHTML =
      '<p class="error">Failed to load document. Please try again.</p>';
  }
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
