import {
  specialProcessFormCatalog,
  getFormDisplayName,
} from "./special-process-form-names.mjs";

const formList = document.getElementById("formList");

if (formList) {
  formList.innerHTML = specialProcessFormCatalog
    .filter((form) => form.definitionId !== "9450-07")
    .map((form) => {
      const href = `special-process-form.html?id=${encodeURIComponent(form.id)}`;
      return `
        <article class="form-item">
          <span class="pill">${form.kind === "chem-film" ? "Chem Film" : "Passivation"}</span>
          <h3>${getFormDisplayName(form)}</h3>
          <p>${form.label}</p>
          <a class="btn" href="${href}">Open form</a>
        </article>
      `;
    })
    .join("");
}
