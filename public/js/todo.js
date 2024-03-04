import { loadHeaderFooter, getUserValue, getDateTime } from './utils.mjs';

loadHeaderFooter();
const user = await getUserValue();

const main = document.querySelector('main');
const iid = document.querySelector('#iid');
const pid = ASSIGNED_TO.value;

const button = document.getElementById('actiondetailsearch');
button.addEventListener('click', async (event) => {
    event.preventDefault();
    let personid = document.getElementById('ASSIGNED_TO').value;
    // change personid to uppercase
    personid = personid.toUpperCase();
    // console.log(personid)

    const url = 'http://localhost:3003/todo';

    // Delete the child nodes of the main element
    while (main.firstChild) {
        main.removeChild(main.firstChild);
    }
   
    fetch(url, { method: 'GET' })

    .then(response => response.json())
    .then(records => {
        // console.log(records);
        // filter the records to only show the ones that are assigned to the user
        records = records.filter(record => record.ASSIGNED_TO === personid);
        
        let fieldList = ['INPUT_ID', 'INPUT_DATE', 'SUBJECT', 'ASSIGNED_TO', 'PROJECT_ID', 'INPUT_TEXT', 'DUE_DATE']

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const header = document.createElement('tr');
        const td = document.createElement('td');
        
        // Create the table header
        for (let key in records[0]) {
            if (fieldList.includes(key)){
            const th = document.createElement('th');
            th.textContent = key;
            header.appendChild(th);
            }
        }
        thead.appendChild(header);

        // Create the table body
    for (const row of records) {
        const tr = document.createElement('tr');
        for (const field in row) {
            if (fieldList.includes(field)){
                const td = document.createElement('td');
                // fix the date format
                if (field === 'INPUT_DATE' || field === 'DUE_DATE') {
                    if (row[field] === null) {
                        td.textContent = '';
                    } else {
                    const date = new Date(row[field]);
                    td.textContent = date.toLocaleDateString();
                    }
                } else
                td.textContent = row[field];
                tr.appendChild(td);
            }
            
        }
            tbody.appendChild(tr);
        // }
    }
        

        table.appendChild(thead);
        table.appendChild(tbody);
        main.appendChild(table);
    })
});