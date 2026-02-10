import {
  logEmail,
  getEscalationStatus,
  getEmailHistory,
  getApiUrl,
} from "./utils.mjs";

/**
 * Send an escalation email for an overdue item
 * @param {string} appModule - CORRECTIVE, INPUT, NONCONFORMANCE
 * @param {string} appId - Entity ID
 * @param {string} title - Item title/subject
 * @param {string} assignedTo - Person responsible
 * @param {string} daysOverdue - Number of days overdue
 * @param {string} sentBy - Current user
 * @returns {Promise<boolean>} Success status
 */
export async function sendEscalationEmail(
  appModule,
  appId,
  title,
  assignedTo,
  daysOverdue,
  sentBy,
) {
  try {
    // Format the email subject and body
    const subject = `ESCALATION: ${appModule} ${appId} - ${daysOverdue} days overdue`;

    const emailBody = `
${appModule} Escalation Notice

Item: ${appId}
Title: ${title}
Assigned To: ${assignedTo}
Days Overdue: ${daysOverdue}
Escalation Sent: ${new Date().toLocaleDateString()}

Action Required:
Please address this overdue item immediately. If you need assistance or have questions, please contact the Quality department.

---
This is an automated escalation email from the Quality Management System.
`;

    // Log the email to history
    await logEmail(
      appModule,
      appId,
      assignedTo,
      subject,
      emailBody,
      sentBy,
      "ESCALATION",
      `Manual escalation - ${daysOverdue} days overdue`,
    );

    return true;
  } catch (error) {
    console.error("Error sending escalation email:", error);
    throw error;
  }
}

/**
 * Get row color based on escalation status
 * @param {Object} record - The record object
 * @param {string} appModule - CORRECTIVE, INPUT, etc.
 * @param {number} daysOverdue - Days past due date
 * @returns {Promise<string>} CSS color value
 */
export async function getRowColor(record, appModule, daysOverdue) {
  // Get the ID from the record (varies by module)
  const appId =
    record.CORRECTIVE_ID ||
    record.INPUT_ID ||
    record.NONCONFORMANCE_ID ||
    record.ID;

  // Closed items: gray
  if (record.CLOSED === "Y") {
    return "#d3d3d3"; // Light gray
  }

  // Not overdue: green
  if (daysOverdue <= 0) {
    return "#e8f5e9"; // Light green
  }

  // Check escalation status
  const escalationStatus = await getEscalationStatus(appModule, appId);

  // Escalated in last 30 days: yellow
  if (
    escalationStatus.daysSinceEscalation !== null &&
    escalationStatus.daysSinceEscalation <= 30
  ) {
    return "#fff3e0"; // Light orange/yellow
  }

  // Overdue > 30 days: red
  if (daysOverdue > 30) {
    return "#ffebee"; // Light red
  }

  return ""; // Default
}

/**
 * Calculate days overdue
 * @param {string} dueDate - Due date (YYYY-MM-DD)
 * @returns {number} Days overdue (negative if not yet due)
 */
export function calculateDaysOverdue(dueDate) {
  if (!dueDate) return 0;

  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((today - due) / msPerDay);
}

/**
 * Create escalation button element
 * @param {string} appModule - CORRECTIVE, INPUT, etc.
 * @param {string} appId - Entity ID
 * @param {string} title - Item title
 * @param {string} assignedTo - Assigned person
 * @param {number} daysOverdue - Days overdue
 * @param {string} currentUser - Current user
 * @param {Function} onSuccess - Callback after successful escalation
 * @returns {HTMLElement} Button element
 */
export function createEscalationButton(
  appModule,
  appId,
  title,
  assignedTo,
  daysOverdue,
  currentUser,
  onSuccess,
) {
  const button = document.createElement("button");
  button.className = "btn btn-warning";
  button.textContent = "Send Escalation";
  button.title = `Escalate ${appModule} ${appId}`;

  button.addEventListener("click", async (e) => {
    e.preventDefault();

    if (!confirm(`Send escalation email for ${appModule} ${appId}?`)) {
      return;
    }

    try {
      await sendEscalationEmail(
        appModule,
        appId,
        title,
        assignedTo,
        daysOverdue,
        currentUser,
      );

      alert("Escalation email sent successfully!");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error sending escalation:", error);
      alert("Failed to send escalation email. Please try again.");
    }
  });

  return button;
}

/**
 * Display escalation history for a record
 * @param {string} appModule - CORRECTIVE, INPUT, etc.
 * @param {string} appId - Entity ID
 * @returns {Promise<HTMLElement>} Container element with escalation history
 */
export async function createEscalationHistory(appModule, appId) {
  const container = document.createElement("div");
  container.className = "escalation-history";
  container.style.marginTop = "20px";
  container.style.padding = "10px";
  container.style.backgroundColor = "#f5f5f5";
  container.style.borderRadius = "4px";

  const title = document.createElement("h4");
  title.textContent = "Escalation History";
  container.appendChild(title);

  try {
    const history = await getEmailHistory(appModule, appId, "ESCALATION", 5);

    if (history.length === 0) {
      const noHistory = document.createElement("p");
      noHistory.textContent = "No escalations sent yet.";
      noHistory.style.color = "#999";
      container.appendChild(noHistory);
      return container;
    }

    const list = document.createElement("ul");
    list.style.listStyle = "none";
    list.style.padding = "0";

    history.forEach((email) => {
      const item = document.createElement("li");
      item.style.padding = "5px 0";
      item.style.borderBottom = "1px solid #ddd";

      const date = new Date(email.SENT_DATE).toLocaleDateString();
      const sentBy = email.SENT_BY;

      item.innerHTML = `
        <strong>${date}</strong> - Sent by ${sentBy}
        <br>
        <small>${email.RECIPIENT_EMAIL}</small>
      `;

      list.appendChild(item);
    });

    container.appendChild(list);
  } catch (error) {
    console.error("Error fetching escalation history:", error);
    const errorMsg = document.createElement("p");
    errorMsg.textContent = "Error loading escalation history.";
    errorMsg.style.color = "#d32f2f";
    container.appendChild(errorMsg);
  }

  return container;
}
