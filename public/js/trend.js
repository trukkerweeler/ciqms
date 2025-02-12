import { loadHeaderFooter, getDocType, getUserValue, myport } from "./utils.mjs";
loadHeaderFooter();

const user = await getUserValue();
const port = myport();

// Get the trend data from the server
// get the id from the URL
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');
const url = `http://localhost:${port}/trend/${id}`;
fetch(url, { method: 'GET' })
    .then(response => response.json())
    .then(records => {
    const main = document.querySelector('main');
    // create a form so the user can update the trend data
    const form = document.createElement('form');
    form.setAttribute('method', 'POST');
    form.setAttribute('action', url);
    form.setAttribute('enctype', 'multipart/form-data');
    form.setAttribute('class', 'stacked-form');
    // Add class to the form with the id of entryform
    // form.setAttribute('class', 'entryform');
    form.setAttribute('id', 'trend-form');
    // Add h2 element to the form with the id of the trend data
    const h2 = document.createElement('h2');
    h2.textContent = `NCM: ${id}`;
    main.appendChild(h2);
    // check if records array is not empty
    if (records.length > 0) {
        // for each of the fields in the trend data except the NCM_ID, create an input element with label
        for (let key in records[0]) {
            if (key !== 'NCM_ID') {
                const label = document.createElement('label');
                label.setAttribute('for', key);
                label.textContent = key;
                form.appendChild(label);
                const input = document.createElement('input');
                input.setAttribute('type', 'text');
                input.setAttribute('id', key);
                input.setAttribute('name', key);
                let currentvalue = records[0][key];
                if (currentvalue == null) {
                    currentvalue = '';
                } else {
                    currentvalue = records[0][key];
                }

                input.setAttribute('value', currentvalue);
                form.appendChild(input);
            }
        }
        // create a submit button
        const submit = document.createElement('input');
        submit.setAttribute('type', 'submit');
        submit.setAttribute('value', 'Update');
        form.appendChild(submit);
        // add the form to main element
        main.appendChild(form);
    } else {
        const p = document.createElement('p');
        p.textContent = 'No trend data found';
        main.appendChild(p);
    }


    // Add an event listener to the form to update the trend data
    document.getElementById('trend-form').addEventListener('submit', event => {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        // iterate over the form data and create an object
        const data = {};
        for (let pair of formData.entries()) {
            data[pair[0]] = pair[1];
        }
        data.MODIFIED_BY = user;
        data.MODIFIED_DATE = new Date().toLocaleString();
        const cid = data.CORRECTIVE_ID;
        delete data.CORRECTIVE_ID;

        // update the trend data
        const url = `http://localhost:${port}/trend/${id}`;
        fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(result => {
                if (result.affectedRows > 0) {
                    // alert('Trend data updated');
                    // redirect to the ncm page
                    // window.location.href = `ncms.html`;
                    // clear the form
                    // form.reset();
                } else {
                    alert('Failed to update trend data');
                }
            });

        // update the corrective action link
        if (cid == null) {
            return;
        } else {
            const data = {};
            data.CORRECTIVE_ID = cid;            
            const url2 = `http://localhost:${port}/trend/${id}/ncl`;
            fetch(url2, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
                .then(response => response.json())
                .then(result => {
                    if (result.affectedRows > 0) {
                        // alert('Trend data updated');
                        // redirect to the ncm page
                        window.location.href = `ncms.html`;
                        // clear the form
                        form.reset();
                    } else {
                        alert('Failed to update trend data');
                    }
                });
        }
        
    });
});