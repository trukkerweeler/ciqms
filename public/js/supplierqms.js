import { loadHeaderFooter, myport } from "./utils.mjs";
loadHeaderFooter();

const port = myport() || 3003;
const qmsform = document.querySelector('#qmsform');
const qmsurl = `http://localhost:${port}/suppliers/qms`;

qmsform.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(qmsform);
    // const requestDate = new Date();
    // requestDate.setDate(requestDate.getDate())
    // let createDate = requestDate.toISOString().slice(0, 19).replace('T', ' ');

    const dataJson = {};
    for (let field of data.keys()) {
        let fieldId = field.split('_');
        switch (fieldId[fieldId.length - 1]) {
            case 'STATE':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'SCOPE':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            default:
                dataJson[field] = data.get(field);
                break;
        }
    }

    try {
        await fetch(qmsurl, {
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

    qmsform.reset();
});