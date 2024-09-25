import { loadHeaderFooter } from './utils.mjs';
// loadHeaderFooter();

// hide the main-nav element
// document.querySelector('#main-nav').style.display = 'none';

// append the button ncm with an anchor to ncms.html
const ncmButton = document.querySelector('#ncm');
ncmButton.addEventListener('click', () => {
  window.location.href = 'inputs.html';
});

// // append the button ca with an anchor to corrective.html
// const caButton = document.querySelector('#ca');
// caButton.addEventListener('click', () => {
//   window.location.href = 'corrective.html';
// });