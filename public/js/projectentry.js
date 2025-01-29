import { getUserValue, loadHeaderFooter, myport } from './utils.mjs';
loadHeaderFooter();
const port = myport();

const url = `http://localhost:${port}/project`;
let user = await getUserValue();

let mytoday = new Date();
let myCreateDate = mytoday.toISOString().slice(0, 10);

// Send a POST request
const form = document.getElementById('prjentry');
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    
    const dataJson = {
        CREATE_DATE: myCreateDate,
        CREATE_BY: user,
        CLOSED: 'N',
    };
    for (let field of data.keys()) {
        // console.log(field);
        switch (field) {
            case 'LEADER':
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
            case 'PROJECT_TYPE':
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
    
    // console.log(dataJson);

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
