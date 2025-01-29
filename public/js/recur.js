import { loadHeaderFooter, myport } from './utils.mjs';
loadHeaderFooter();
const port = myport();
const url = `http://localhost:${port}/recur`;


//Get the table with id of view and append the data from the API including a header row
const view = document.querySelector('#view');
fetch(url, { method: 'GET' })
    .then(response => response.json())
    .then(data => {
        const header = document.createElement('tr');
        for (let field in data[0]) {
            const th = document.createElement('th');
            th.textContent = field;
            header.appendChild(th);
        }
        view.appendChild(header);

        for (let record of data) {
            const row = document.createElement('tr');
            for (let field in record) {
                const cell = document.createElement('td');
                cell.textContent = record[field];
                row.appendChild(cell);
            }
            view.appendChild(row);
        }
    });

    
// Send a POST request
const form = document.querySelector('#recurEntryform');
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nextId = await fetch(url + '/nextId', { method: 'GET' })
    .then(response => response.json())
    .then (data => {
        JSON.stringify(data);
        return data;
    })
    console.log(nextId);    
    
    const dataJson = {
        RECUR_ID: nextId,
        STATUS: 'A',
    };
    for (let field of data.keys()) {
        const uppercasing = ['REQUEST_BY', 'ASSIGNED_TO', 'SUBJECT'];
        if ( uppercasing.includes(field)){
            dataJson[field] = data.get(field).toUpperCase();
        } else {
            dataJson[field] = data.get(field);
        }
    }
    // console.log(dataJson);

    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                },
            body: JSON.stringify(dataJson)
        });
        console.log('Success:', JSON.stringify(dataJson));
        }
        catch (err) {
            console.log('Error:', err);
        }
    
    form.reset();
    // reload the page
    location.reload();
});





























// const btnRecurs = document.querySelector('#btnRecurs');
// btnRecurs.addEventListener('click', async () => {
//     // submit form to API
//     const form = document.querySelector('#entryform');
//     const formData = new FormData(form);
//     const data = Object.fromEntries(formData);
//     // data['rid'] = fetch('routes/recur.js').then(response => response.json()).then(data => data.rid);
//     const nextId = await fetch(url + '/nextId', { method: 'GET' })
//     data['rid'] = nextId;
//     data['state'] = 'A';
//     console.log(data);

    // fetch(url, {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify(data),
    // })
    //     .then(response => response.json())
    //     .then(data => {
    //         console.log('Success:', data);
    //         // display results
    //         const results = document.querySelector('#results');
    //         results.innerHTML = '';
    //         for (let i = 0; i < data.length; i++) {
    //             const p = document.createElement('p');
    //             p.textContent = data[i];
    //             results.appendChild(p);
    //         }
    //     })
    //     .catch((error) => {
    //         console.error('Error:', error);
    //     });
// });

