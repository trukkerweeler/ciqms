import { getUserValue, loadHeaderFooter, myport } from './utils.mjs';
loadHeaderFooter();
const skippers = ['JOB_CODE','FUNCTION_CODE', 'ENTITY_ID', 'MODIFIED_BY', 'MODIFIED_DATE', 'CREATE_BY', 'CREATED_DATE'];
// const user = JSON.parse(localStorage.getItem('user'));
const user = await getUserValue();
const port = myport();

let url = `http://localhost:${port}/process`;

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
            if (!skippers.includes(key)){
            const th = document.createElement('th');
            th.textContent = key;
            header.appendChild(th);
            }
        }
        thead.appendChild(header);

        for (let record of records) {
            const tr = document.createElement('tr');
            for (let key in record) {
                const td = document.createElement('td');
                if (!skippers.includes(key)) {
                    if (key !== null) {
                        if (key.substring(key.length - 4) === 'DATE' && key.length > 0 && record[key] !== null) {
                            td.textContent = record[key].slice(0,10);
                        } else {
                            if (key == 'AUDIT_MANAGER_ID') {
                                td.innerHTML = `<a href="http://localhost:${port}/process.html?id=${record[key]}">${record[key]}</a>`;
                            } else {
                                td.textContent = record[key];
                            }
                        }
                    } else {
                        td.textContent = record[key];
                    }
                    tr.appendChild(td);
                }
        }
            tbody.appendChild(tr);
        }

        table.appendChild(thead);
        table.appendChild(tbody);
        main.appendChild(table);
    })
}

getRecords();

const modal = document.getElementById('dialogaddprocess');

const btnaddaudit = document.querySelector('#btnaddprocess');
btnaddaudit.addEventListener('click', (event) => {
    event.preventDefault();
    modal.showModal();
});

const processsave = document.getElementById('processsave');
processsave.addEventListener('click', (event) => {
    event.preventDefault();
    const form = document.querySelector('#entryform');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    let uppercasers = ['PROCESS_ID', 'EMPLOYEE_ID']
    for (let key in data) {
        if (uppercasers.includes(key)) {
            console.log(key);
            // change the value to upper case
            data[key] = data[key].toUpperCase();
        }
    }

    url += '/add';
    data['CREATE_BY'] = user;
    const d = new Date();
    const date = d.toISOString().substring(0, 10);
    const time = d.toLocaleTimeString();
    const mydate = date + ' ' + time;
    data['CREATE_DATE'] = mydate;

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        console.log('Success:', result);
        modal.close();
        location.reload();
    })
    .catch(error => {
        console.error('Error:', error);
    });
    console.log(data);
});

// close modal on cancel button click
const cancel = document.querySelector('[data-close-modal]');
cancel.addEventListener('click', () => {
    modal.close();
});