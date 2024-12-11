import { loadHeaderFooter } from "./utils.mjs";
loadHeaderFooter();


document.addEventListener('DOMContentLoaded', function() {
  const main = document.querySelector('main');
  
  const section = document.createElement('section');
  
  const heading = document.createElement('h2');
  heading.textContent = 'Preventive Maintenance';
  
  const link = document.createElement('a');
  link.href = '../pmreport.html';
  link.textContent = 'Go to Preventive Maintenance Report';
  
  section.appendChild(heading);
  section.appendChild(link);
  
  main.appendChild(section);
});