import {
  loadHeaderFooter,
  getSessionUser,
  getDateTime,
  getApiUrl,
} from "./utils.mjs";

loadHeaderFooter();
const user = await getSessionUser();
const apiUrl = await getApiUrl();

const main = document.querySelector("main");
const aid = document.querySelector("#aid");

const button = document.getElementById("auditcopy");
button.addEventListener("click", async (event) => {
  event.preventDefault();

  const aid = document.querySelector("#aid");
  let aidValue = aid.value;
  if (aidValue.length === 0) {
    alert("Please enter an Audit ID to copy");
  } else {
    while (aidValue.length < 7) {
      aidValue = "0" + aidValue;
    }
  }

  const url = `${apiUrl}/audit/${aidValue}`;
  // console.log('Fetching audit from URL:', url);

  try {
    // Fetch the audit data
    const response = await fetch(url);
    if (!response.ok) {
      alert("Audit ID not found");
      return;
    }
    const data = await response.json();

    // Get the next available Audit ID
    const nextIdRes = await fetch(`${apiUrl}/audit/nextId`);
    if (!nextIdRes.ok) {
      alert("Unable to get next Audit ID");
      return;
    }
    const nextIdData = await nextIdRes.json();
    // console.log('NextId response:', nextIdData);
    const nextId = nextIdData;
    // console.log('Next available Audit ID:', nextId);

    // Get the next available Audit Manager ID
    const nextAuditManagerIdRes = await fetch(
      `${apiUrl}/audit/nextAuditManagerId`,
    );
    if (!nextAuditManagerIdRes.ok) {
      alert("Unable to get next Audit Manager ID");
      return;
    }
    const nextAuditManagerIdData = await nextAuditManagerIdRes.json();
    // console.log('NextAuditManagerId response:', nextAuditManagerIdData);
    const nextAuditManagerId = nextAuditManagerIdData;
    // console.log('Next available Audit Manager ID:', nextAuditManagerId);

    // Prepare the new audit data
    const newAudit = { ...data[0] };
    let oldAMId = newAudit.AUDIT_MANAGER_ID;
    newAudit.AUDIT_ID = nextId;
    newAudit.AUDIT_MANAGER_ID = nextAuditManagerId;
    newAudit.CREATE_BY = user;
    newAudit.CREATE_DATE = getDateTime();
    newAudit.COMPLETION_DATE = null;
    newAudit.MODIFIED_BY = null;
    newAudit.MODIFIED_DATE = null;
    newAudit.RESULT = "";
    newAudit.SCORE = null;
    newAudit.SCHEDULED_DATE = getDateTime();
    // console.log('New Audit Data:', newAudit);

    // Post the new audit
    const postRes = await fetch(`${apiUrl}/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAudit),
    });

    if (postRes.ok) {
      // console.log(`Audit copied successfully with new ID: ${nextId}`);
    } else {
      alert("Failed to copy audit");
    }
    // send newAudit to copycklst endpoint to copy checklist items
    const copyCklist = await fetch(`${apiUrl}/audit/copycklst`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldAuditManagerId: oldAMId,
        newAuditManagerId: nextAuditManagerId,
      }),
    });
    if (copyCklist.ok) {
      // console.log("Checklist items copied successfully");
    } else {
      // console.log("Failed to copy checklist items");
    }
    // send newAudit to copyReferences endpoint to copy reference items
    const copyReferences = await fetch(`${apiUrl}/audit/copyReferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oldAuditManagerId: oldAMId,
        newAuditManagerId: nextAuditManagerId,
      }),
    });
    if (copyReferences.ok) {
      // console.log("Reference items copied successfully");
    } else {
      // console.log("Failed to copy reference items");
    }

    if (postRes.ok) {
      // Show fading success notification
      const notification = document.createElement("div");
      notification.textContent = `✓ Audit copied! New ID: ${nextId}`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #4caf50;
        color: white;
        padding: 16px 24px;
        border-radius: 4px;
        font-size: 16px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: fadeInOut 3s ease-in-out;
      `;
      document.body.appendChild(notification);

      // Remove the notification after it fades out
      setTimeout(() => notification.remove(), 3000);

      // Clear the input field for the next copy
      aid.value = "";
    }
  } catch (error) {
    alert("Error copying audit: " + error.message);
  }
});
