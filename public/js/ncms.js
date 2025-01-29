import { loadHeaderFooter, myport } from './utils.mjs';

loadHeaderFooter();
const year = new Date().getFullYear();
const port = myport();


// const url = `http://localhost:${NONCONFORMANCE_PORT}/ncm`;
const url = `http://localhost:${port}/ncm`;

function getTrend(processId) {
    const dialog = document.getElementById('dialog');
    dialog.showModal();
    document.body.appendChild(dialog);
    const close = document.querySelector('.close');
    close.addEventListener('click', () => {
        dialog.remove();
    });
}

function getRecords () {
    const main = document.querySelector('main');
    
    fetch(url, { method: 'GET' })

    .then(response => response.json())
    .then(records => {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const header = document.createElement('tr');
        const td = document.createElement('td');
        
        for (let key in records[0]) {
            // if (fieldList.includes(key)){
            const th = document.createElement('th');
            th.textContent = key;
            if (key == 'NCM_TYPE') {
                th.textContent = 'Type';
            }
            if (key == 'PROCESS_ID') {
                th.textContent = 'Trend';
            }
            header.appendChild(th);
            // }
        }
        thead.appendChild(header);

        for (let record of records) {
            const tr = document.createElement('tr');
            for (let key in record) {
                const td = document.createElement('td');
                // console.log(key.substring(key.length - 4));
                if (key !== null) {
                    if (key.substring(key.length - 4) === 'DATE' && key.length > 0 && record[key] !== null) {
                        td.textContent = record[key].slice(0,10);
                    } else {
                        if (key == 'NCM_ID') {
                            td.innerHTML = `<a href="http://localhost:${port}/ncm.html?id=${record[key]}">${record[key]}</a>`;                        
                        } else if (key == 'PROCESS_ID') {
                            const button = document.createElement('button');
                            button.className = 'btn rowbtn';
                            let processId = record[key];
                            if (processId == null) {
                                processId = 'Edit';
                            }
                            button.textContent = processId;
                            button.addEventListener('click', () => {
                                window.location.href = `http://localhost:${port}/trend.html?id=${record['NCM_ID']}`;

                            });
                            td.appendChild(button);

                        } else {
                            td.textContent = record[key];
                        }
                    }
                } else {
                    td.textContent = record[key];
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
