import { loadHeaderFooter } from './utils.mjs';
loadHeaderFooter();

// hide the main-nav element
// document.querySelector('#main-nav').style.display = 'none';

// append the button ncm with an anchor to ncms.html
const ncmButton = document.querySelector('#ncm');
ncmButton.addEventListener('click', () => {
  window.location.href = 'inputs.html';
});


// append the button ca with an anchor to corrective.html
const caButton = document.querySelector('#ca');
caButton.addEventListener('click', () => {
  window.location.href = 'correctives.html';
});

// append the button sysdoc with an anchor to documents.html
const sysDocButton = document.querySelector('#sysdoc');
sysDocButton.addEventListener('click', () => {
  window.location.href = 'documents.html';
});

// append the button supplier with an anchor to suppliers.html
const supplierButton = document.querySelector('#supplier');
supplierButton.addEventListener('click', () => {
  window.location.href = 'suppliers.html';
});

// append the button cta with an anchor to attendance.html
const ctaButton = document.querySelector('#cta');
ctaButton.addEventListener('click', () => {
  window.location.href = 'attendance.html';
});

// append the button cal with an anchor to calpo.html
const calButton = document.querySelector('#cal');
calButton.addEventListener('click', () => {
  window.location.href = 'calpo.html';
});