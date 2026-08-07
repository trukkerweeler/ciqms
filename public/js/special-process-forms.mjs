import {
  specialProcessFormCatalog,
  getFormDisplayName,
  getProcessTheme,
} from "./special-process-form-names.mjs";

const formList = document.getElementById("formList");

if (formList) {
  formList.innerHTML = specialProcessFormCatalog
    .filter((form) => form.definitionId !== "9450-07")
    .map((form) => {
      const href = `special-process-form.html?id=${encodeURIComponent(form.id)}`;
      const themeClass = getProcessTheme(form.definitionId) || "";
      return `
        <a class="form-item ${themeClass}" href="${href}" aria-label="Open ${getFormDisplayName(form)}">
          <div class="form-item-top">
            <span class="pill">${form.kind === "chem-film" ? "Chem Film" : "Passivation"}</span>
          </div>
          <h3>${getFormDisplayName(form)}</h3>
        </a>
      `;
    })
    .join("");
}
