import { loadHeaderFooter } from './utils.mjs';
loadHeaderFooter();

const url = 'http://localhost:3003/input';

let myRequestDate = new Date();
myRequestDate.setDate(myRequestDate.getDate());
myRequestDate = myRequestDate.toISOString().slice(0, 10);
const defaultCreateDate = document.getElementById('INPUT_DATE');
defaultCreateDate.value = myRequestDate;

let myDueDateDefault = new Date();
myDueDateDefault.setDate(myDueDateDefault.getDate() + 14);
myDueDateDefault = myDueDateDefault.toISOString().slice(0, 10);
const defaultDueDate = document.getElementById('DUE_DATE');
defaultDueDate.value = myDueDateDefault;

// Send a POST request
const form = document.querySelector('#entryform');
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nextId = await fetch(url + '/nextId', { method: 'GET' })
    .then(response => response.json())
    .then (data => {
        JSON.stringify(data);
        return data;
    });
    
    const dataJson = {
        INPUT_ID: nextId,
        CREATE_DATE: myRequestDate,
        CREATE_BY: 'TKENT',
        CLOSED: 'N',
    };
    for (let field of data.keys()) {
        // console.log(field);
        switch (field) {
            case 'PEOPLE_ID':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'ASSIGNED_TO':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'SUBJECT':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'PROJECT_ID':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            default:
                if (field[field.length - 4] === '_DATE') {
                    let myDate = data.get(field);
                    myDate = myDate.slice(0, 10);
                    dataJson[field] = myDate;
                    // break;
                } else {
                    dataJson[field] = data.get(field);
                }
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
