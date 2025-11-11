import { loadHeaderFooter, myport, getUserValue } from './utils.mjs';
loadHeaderFooter();
const port = myport();
const url = `http://localhost:${port}/schedule`;
const user = await getUserValue();

// Send a POST request
const form = document.querySelector('form');
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const nextAuditId = await fetch(url + '/nextAuditId', { method: 'GET' })
    .then(response => response.json())
    .then (data => {
        JSON.stringify(data);
        return data;
    })
    const nextManagerId = await fetch(url + '/nextManagerId', { method: 'GET' })
    .then(response => response.json())
    .then (data => {
        JSON.stringify(data);
        return data;
    })
    // console.log(nextId);
    
    let myRequestDate = new Date();
    myRequestDate.setDate(myRequestDate.getDate());
    myRequestDate = myRequestDate.toISOString().slice(0, 10);
    
    const dataJson = {
        AUDIT_MANAGER_ID: nextManagerId,
        AUDIT_ID: nextAuditId,
        CREATE_DATE: myRequestDate,
        CREATE_BY: user,
    };
    for (let field of data.keys()) {
        // console.log(field);
        switch (field) {
            case 'LEAD_AUDITOR':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'AUDITEE':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'AUDITEE1':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'SUBJECT':
                dataJson[field] = data.get(field).toUpperCase();
                break;
            case 'RESULT':
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
    console.log("56");
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





