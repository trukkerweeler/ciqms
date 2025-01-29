import { loadHeaderFooter, getUserValue } from "./utils.mjs";
loadHeaderFooter();

let user = await getUserValue();
const url = 'http://localhost:3003/corrective';

// Send a POST request
const form = document.querySelector('form');
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    // console.log(data);
    const nextId = await fetch(url + '/nextId', { method: 'GET' })
    .then(response => response.json())
    .then (data => {
        JSON.stringify(data);
        return data;
    })
    const requestDate = new Date();
    requestDate.setDate(requestDate.getDate())
    let myRequestDate = requestDate.toISOString().slice(0, 19).replace('T', ' ');
    
    const dataJson = {
        CORRECTIVE_ID: nextId,
        CREATE_DATE: myRequestDate,
        CREATE_BY: user,
        CLOSED: 'N',
    };
    for (let field of data.keys()) {
        if (field in ['REQUEST_BY', 'ASSIGNED_TO']) {
            dataJson[field] = data.get(field).toUpperCase();
        } else {
            dataJson[field] = data.get(field);
        }
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
