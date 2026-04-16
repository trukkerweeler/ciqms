import { loadHeaderFooter, renderWithTemplate2 } from "./utils.mjs";

loadHeaderFooter();

// Tank definitions with their subject codes and display names
const TANKS = [
  { tankNumber: 1, subject: "01TE", displayName: "Tank 1" },
  { tankNumber: 3, subject: "03TE", displayName: "Tank 3" },
  { tankNumber: 5, subject: "05TE", displayName: "Tank 5" },
  { tankNumber: 7, subject: "07TE", displayName: "Tank 7" },
  { tankNumber: 8, subject: "08TE", displayName: "Tank 8" },
  { tankNumber: 11, subject: "11PH", displayName: "Tank 11" },
  { tankNumber: 13, subject: "13TE", displayName: "Tank 13" },
  { tankNumber: "Q", subject: "QTPH, QTPC", displayName: "Quench Tank" },
];

// HTML template for each tank card
const tankCardTemplate = `
<div class="card">
  <div class="card__header">
    <h3 class="card__header-title">{{displayName}}</h3>
  </div>
  <div class="card__body">
    <p class="card__description">View trend data for {{displayName}}</p>
    <p class="card__meta">Subject: {{subject}}</p>
  </div>
  <div class="card__footer">
    <a class="button" href="tank{{tankNumber}}.html">View Trend</a>
  </div>
</div>
`;

document.addEventListener("DOMContentLoaded", async () => {
  const main = document.querySelector("main");

  // Create a container for tank cards
  const cardsContainer = document.createElement("div");
  cardsContainer.className = "card-grid";

  // Render each tank card
  TANKS.forEach((tank) => {
    renderWithTemplate2(
      tankCardTemplate,
      cardsContainer,
      tank,
      null,
      "beforeend",
    );
  });

  // Add the container to the main element
  main.appendChild(cardsContainer);
});
