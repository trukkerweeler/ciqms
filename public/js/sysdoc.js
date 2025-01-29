import { loadHeaderFooter, getDocType, getUserValue, myport } from "./utils.mjs";
loadHeaderFooter();
const port = myport();
const url = `http://localhost:${port}/sysdocs`;
const url2 = `http://localhost:${port}/docsavail`;

const user = await getUserValue();

// Send POST request to server
const form = document.querySelector('form');
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const requestDate = new Date();
    requestDate.setDate(requestDate.getDate())
    let createDate = requestDate.toISOString().slice(0, 19).replace('T', ' ');
    let pathelem = document.getElementsByClassName('inputfile')[0];

    const dataJson = {
        CREATE_DATE: createDate,
        CREATE_BY: user,
        AUDIT_RESPONSIBLE: 'I',
        CHECKED_OUT: 'N',
        // CTRL_DOC: ctrlpath,
    };
    for (let field of data.keys()) {
        console.log(field);
        if (field == 'document_id') {
            dataJson[field] = data.get(field);
            let docid = data.get(field);
            dataJson['DOCUMENT_TYPE'] = getDocType(docid);

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
        console.log('Success:', JSON.stringify(dataJson));
        }
        catch (err) {
            console.log('Error:', err);
        }
    
    try {
        await fetch(url2, {
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
});
