import { loadHeaderFooter, myport } from './utils.mjs';
loadHeaderFooter();

const port = myport();

// Send a POST request for copy
const form = document.querySelector('#copyform');
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    let inputUrl = `http://localhost:${port}/input/`;    
    const data = new FormData(form);
    const nextId = await fetch(inputUrl + '/nextId', { method: 'GET' })
    .then(response => response.json())
    .then (iid => {
        JSON.stringify(iid);
        return iid;
        // console.log(iid);
    });

    let originalAi = await fetch(inputUrl + "/" + data.get('copyid'), { method: 'GET' })
    .then(response => response.json())
    .then (oaidata => {
        JSON.stringify(oaidata);
        return oaidata;
        // console.log(oaidata);
    });
    
    // change the ID
    let newAi = {...originalAi};
    
    // set the INPUT_ID of the newAi to the nextId
    newAi[0].INPUT_ID = nextId;
    newAi[0].CREATE_DATE = new Date().toISOString().slice(0, 10);
    newAi[0].CREATE_BY = 'TKENT';
    newAi[0].INPUT_DATE = data.get('copydate');
    // add the duedays to the DUE_DATE
    let dueDate = new Date(data.get('copydate'));
    dueDate.setDate(dueDate.getDate() + parseInt(data.get('duedays')));
    newAi[0].DUE_DATE = dueDate.toISOString().slice(0, 10);
    newAi[0].CLOSED = 'N';
    delete newAi[0].RESPONSE_TEXT;
    delete newAi[0].CLOSED_DATE;

    // newAi.INPUT_ID = nextId;
    // console.log(newAi);
       
        
    try {
        await fetch(inputUrl, {
            method: 'POST',
            headers: {
                    'Content-Type': 'application/json'
                    },
                body: JSON.stringify(newAi[0])
            });
            // console.log('Success:', JSON.stringify(dataJson));
            }
            catch (err) {
                    console.log('Error:', err);
                }
            
    form.reset();
});