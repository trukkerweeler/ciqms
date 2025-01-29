import { loadHeaderFooter, myport } from "./utils.mjs";
loadHeaderFooter();

const port = myport() || 3003;
const url = `http://localhost:${port}/supplierlist`;

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
            
            for (let key in records[0]) {
                // if (fieldList.includes(key)){
                // console.log(key);
                // exclude column "rn"
                if (key === 'rn') {
                    continue;
                }
                const th = document.createElement('th');
                th.textContent = key;
                header.appendChild(th);
                // }
            }
            thead.appendChild(header);

            for (let record of records) {
                const tr = document.createElement('tr');
                for (let key in record) {
                    if (key === 'rn') {
                        continue;
                    }
                    const td = document.createElement('td');
                    let fieldname = key.substring(key.length-4, key.length);
                    switch (fieldname) {
                        case 'DATE':
                            if (record[key] !== null) {
                                td.textContent = record[key].slice(0,10);
                            } else {
                                td.textContent = '';
                            }
                            break;
                        case 'PIRY':
                            if (record[key] !== null) {
                                td.textContent = record[key].slice(0,10);
                                // id date is in the past, highlight the row
                                let today = new Date();
                                let date = new Date(record[key]);
                                if (date < today) {
                                    tr.classList.add('highlight');
                                }
                            } else {
                                td.textContent = '';
                            }
                            break;
                        default:
                            td.textContent = record[key];
                    // tr.appendChild(td);
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