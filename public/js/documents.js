import { loadHeaderFooter, myport } from './utils.mjs';
loadHeaderFooter();

const port = myport() || 3003;
const url = `http://localhost:${port}/sysdocs`;

// get the current year
const year = new Date().getFullYear();
// document.querySelector('#year').textContent = year;


function getRecords () {
    const main = document.querySelector('main');
    
    fetch(url, { method: 'GET' })

    .then(response => response.json())
    .then(records => {
        // console.log(records);
        const table = document.createElement('table');
            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');
            const header = document.createElement('tr');
            const td = document.createElement('td');
            // const fieldList = ['DOCUMENT_ID', 'NAME', 'TYPE', 'STATUS', 'REVISION_LEVEL', 'ISSUE_DATE', 'SUBJECT', 'CREATE_BY', 'CREATE_DATE'];
            for (let key in records[0]) {
                // if (fieldList.includes(key)){
                const th = document.createElement('th');
                th.textContent = key;
                header.appendChild(th);
                // }
            }
            thead.appendChild(header);

            for (let record of records) {
                const tr = document.createElement('tr');
                for (let key in record) {
                    const td = document.createElement('td');
                    let lastFour = key.slice(-4);
                    switch (lastFour) {
                        case 'DATE':
                            td.textContent = record[key].slice(0,10);
                            break;
                        default:
                            td.textContent = record[key];
                    // tr.appendChild(td);
                    if (key === 'DOCUMENT_ID') {
                        td.innerHTML = `<a href="document.html?document_id=${record[key]}">${record[key]}</a>`;
                    }
                }
                tr.appendChild(td);
            }
                tbody.appendChild(tr);
            }

            table.appendChild(thead);
            table.appendChild(tbody);
            main.appendChild(table);
    })
}

getRecords();