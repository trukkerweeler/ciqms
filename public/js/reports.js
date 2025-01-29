import { loadHeaderFooter, loadReports } from "./utils.mjs";
loadHeaderFooter();

document.addEventListener('DOMContentLoaded', function() {
    fetch('../json/reports.json')
        .then(response => response.json())
        .then(data => {
            loadReports(data['Reports']);
        })
        .catch(error => console.error('Error loading reports:', error));

});