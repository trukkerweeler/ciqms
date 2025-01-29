import { loadHeaderFooter, myport } from "./utils.mjs";
loadHeaderFooter();

const port = myport() || 3003;
const url = `http://localhost:${port}/requests`;


// Send a POST request
const form = document.querySelector('form');
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
    const requestDate = new Date();
    requestDate.setDate(requestDate.getDate())
    let myRequestDate = requestDate.toISOString().slice(0, 19).replace('T', ' ');
    
    const plus30date = new Date();
    plus30date.setDate(plus30date.getDate() + 30);
    let myDuedate = plus30date.toISOString().slice(0, 19).replace('T', ' ');

    const dataJson = {
        REQUEST_ID: nextId,
        REQUEST_DATE: myRequestDate,
        DUE_DATE: myDuedate,
        CREATE_DATE: myRequestDate,
    };
    for (let field of data.keys()) {
        dataJson[field] = data.get(field);
    } 
    console.log(dataJson);

    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                },
            body: JSON.stringify(dataJson)
        });
        // console.log('Success:', JSON.stringify(dataJson));
        }
        catch (err) {
            console.log('Error:', err);
        }
    
    form.reset();
});
