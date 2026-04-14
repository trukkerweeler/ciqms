import { loadHeaderFooter, renderWithTemplate2 } from "./utils.mjs";

loadHeaderFooter();

// Tank definitions with their subject codes and display names
const TANKS = [
  { tankNumber: 1, subject: "01TE", displayName: "Tank 1" },
  { tankNumber: 3, subject: "03TE", displayName: "Tank 3" },
  { tankNumber: 5, subject: "05TE", displayName: "Tank 5" },
  { tankNumber: 7, subject: "07TE", displayName: "Tank 7" },
  { tankNumber: 8, subject: "08TE", displayName: "Tank 8" },
  { tankNumber: 11, subject: "11TE", displayName: "Tank 11" },
  { tankNumber: 13, subject: "13TE", displayName: "Tank 13" },
];

// HTML template for each tank card
const tankCardTemplate = `
<div class="tank-card report-card">
  <div class="card-header">
    <h3 class="card-title">{{displayName}}</h3>
  </div>
  <div class="card-body">
    <p class="card-description">View trend data for {{displayName}}</p>
    <p class="card-meta" style="font-size: 0.85em; color: #999;">Subject: {{subject}}</p>
  </div>
  <div class="card-footer">
    <a class="card-link btn" href="tank{{tankNumber}}.html">View Trend</a>
  </div>
</div>
`;

document.addEventListener("DOMContentLoaded", async () => {
  const main = document.querySelector("main");

  // Create a container for tank cards
  const cardsContainer = document.createElement("div");
  cardsContainer.id = "tanks-container";
  cardsContainer.style.display = "grid";
  cardsContainer.style.gridTemplateColumns =
    "repeat(auto-fit, minmax(300px, 1fr))";
  cardsContainer.style.gap = "1.5rem";
  cardsContainer.style.padding = "2rem";
  cardsContainer.style.maxWidth = "1200px";
  cardsContainer.style.margin = "0 auto";

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
