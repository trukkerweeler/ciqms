import { loadHeaderFooter, getUserValue, getDateTime, myport } from './utils.mjs';

loadHeaderFooter();
const user = await getUserValue();
const port = myport();

const main = document.querySelector('main');
const iid = document.querySelector('#iid');
const caidValue = iid.value;

const editbutton = document.getElementById('editaction');
const closebutton = document.getElementById('closeaction');
const button = document.getElementById('actiondetailsearch');
button.addEventListener('click', async (event) => {
    event.preventDefault();
    const iid = document.querySelector('#iid');    
    let aidValue = iid.value;
    if (aidValue.length === 0) {
        alert('Please enter the Input ID');
    } else {
        while (aidValue.length < 7) {
            aidValue = '0' + aidValue;
        }
    }

    const url = `http://localhost:${port}/schedule/${aidValue}`;

    // Delete the child nodes of the main element
    while (main.firstChild) {
        main.removeChild(main.firstChild);
    }

    // enable the close button
    closebutton.disabled = false;

    fetch(url, { method: 'GET' })
    .then(response => response.json())
    .then(record => {
        // console.log(record);
        for (const key in record) {
            const detailSection = document.createElement('section');
            detailSection.setAttribute('class', 'section');
            const elemRpt = document.createElement('h1');
            const elemId = document.createElement('h2');
            
            const elemDesc = document.createElement('p');
            const elemFUP = document.createElement('p');
            elemFUP.setAttribute('id', 'followup');
            const elemIaDate = document.createElement('p');
            const elemResponse = document.createElement('p');
            elemResponse.setAttribute('id', 'response');

            elemIaDate.setAttribute('class', 'actiondate');
            const elemCaDate = document.createElement('p');
            elemCaDate.setAttribute('class', 'actiondate2');
            const elemCC = document.createElement('p');
            const aiDate = document.createElement('p');
            aiDate.textContent = 'Request Date:' + ' ' + record[key]['INPUT_DATE'].substring(0, 10);
            aiDate.setAttribute('class', 'tbl');
            const caRef = document.createElement('p');
            caRef.textContent = 'Project:' + ' ' + record[key]['PROJECT_ID'] + ' - ' + record[key]['NAME'];
            caRef.setAttribute('class', 'tbl');
            const aiClosedDate = document.createElement('p');
            if (record[key]['CLOSED_DATE'] === null || record[key]['CLOSED_DATE'] === '' || record[key]['CLOSED_DATE'].length === 0) {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + '';
                console.log('closed date is null');
            } else {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + record[key]['CLOSED_DATE'].substring(0, 10);
                // enable the closebutton
                closebutton.disabled = true;
                console.log('closed date is NOT null');
            }
            // toggle display of doit if recur id is not null
            const doit = document.querySelector('#doit');
            if (record[key]['RECUR_ID'] !== null) {
                doit.style.display = 'block';
                console.log('recur id is not null');
            } else {
                doit.style.display = 'none';
                console.log('recur id is null');
            }

            aiClosedDate.setAttribute('class', 'tbl');

            const caAssTo = document.createElement('p');
            caAssTo.textContent = 'Assigned To:' + ' ' + record[key]['ASSIGNED_TO'];
            caAssTo.setAttribute('class', 'tbl');
            const reqBy = document.createElement('p');
            reqBy.textContent = 'Request By:' + ' ' + record[key]['PEOPLE_ID'];
            reqBy.setAttribute('class', 'tbl');

            const due_date = document.createElement('p');
            if (record[key]['DUE_DATE'] === null) {
                due_date.textContent = 'Due date:' + ' ' + '';
            }
            else
                due_date.textContent = 'Due date:' + ' ' + record[key]['DUE_DATE'].substring(0, 10);
            due_date.setAttribute('class', 'tbl');

            const caType = document.createElement('p');
            caType.textContent = 'Type:' + ' ' + record[key]['TYPE'];
            caType.setAttribute('class', 'tbl');           

            const ncTrendTitle = document.createElement('h3');
            ncTrendTitle.setAttribute('class', 'header3');
            const followupTitle = document.createElement('h3');
            followupTitle.setAttribute('class', 'header3');
            const responseTitle = document.createElement('h3');
            responseTitle.setAttribute('class', 'header3');
            const controlTextTitle = document.createElement('h3');
            const linebreak = document.createElement('br');

            elemRpt.textContent = 'Schedule Detail';
            elemRpt.setAttribute('class', 'header');
            elemId.textContent = 'Schedule Id: ' + record[key]['INPUT_ID'];
            elemId.setAttribute('class', 'header2');

            detailSection.appendChild(aiDate);
            detailSection.appendChild(caAssTo);
            detailSection.appendChild(aiClosedDate);
            detailSection.appendChild(caRef);
            detailSection.appendChild(reqBy);
            detailSection.appendChild(due_date);

            ncTrendTitle.textContent = 'Action:';
            elemDesc.textContent = record[key]['INPUT_TEXT'];
            elemDesc.setAttribute('id', 'inputtext');
            // put in double backslashes
            // elemDesc.textContent = elemDesc.textContent.replace(/\\/g, '\\\\');

            // replace the line breaks with <br> elements
            elemDesc.innerHTML = elemDesc.innerHTML.replace(/\n/g, '<br>');            
            followupTitle.textContent = 'Follow Up:';
            elemFUP.textContent = record[key]['FOLLOWUP_TEXT'];
            
            // replace the line breaks with <br> elements
            elemFUP.innerHTML = elemFUP.innerHTML.replace(/\n/g, '<br>');
            responseTitle.textContent = 'Response:';
            elemResponse.textContent = record[key]['RESPONSE_TEXT'];
            
            // replace the line breaks with <br> elements
            elemResponse.innerHTML = elemResponse.innerHTML.replace(/\n/g, '<br>');

            // // Manage the closed checkbox
            // const closed = document.createElement('checkbox');
            // // get the value of the checkbox
            // const closedValue = record[key]['CLOSED'];
            // console.log(closedValue);

            main.appendChild(elemRpt);
            main.appendChild(elemId);
            main.appendChild(detailSection);

            detailSection.appendChild(ncTrendTitle);
            detailSection.appendChild(elemDesc);
            detailSection.appendChild(followupTitle);
            detailSection.appendChild(elemFUP);
            detailSection.appendChild(elemIaDate);

            detailSection.appendChild(responseTitle);
            detailSection.appendChild(elemResponse);

            detailSection.appendChild(controlTextTitle);
            detailSection.appendChild(elemCaDate);
            detailSection.appendChild(elemCC);
            main.appendChild(detailSection);
        }
    });
    // toggle enable/disable of the edit button
    editbutton.disabled = false;
    // closebutton.disabled = true;
});

const modal = document.querySelector('[data-modal]');
// open modal on edit button click
editbutton.addEventListener('click', (event) => {
    event.preventDefault();
    modal.showModal();
});

// close modal on cancel button click
const cancel = document.querySelector('[data-close-modal]');
cancel.addEventListener('click', () => {
    modal.close();
});

const modalsave = document.getElementById('modalsave');
modalsave.addEventListener('click', async (event) => {
    event.preventDefault();
    const iid = document.querySelector('#iid');    
    let aidValue = iid.value;
    if (aidValue.length === 0) {
        alert('Please enter the Input ID');
    } else {
        // console.log(aidValue);
        // console.log(aidValue.length);
        while (aidValue.length < 7) {
            aidValue = '0' + aidValue;
        }
    }

    const url = `http://localhost:${port}/schedule/${aidValue}`;
    // console.log(url);

    const inputtext = document.querySelector("#inputtext");
    const followuptext = document.querySelector("#followup");
    const responsetext = document.querySelector("#response");
    const closed = document.querySelector("#appendcheckbox");
    // console.log(">>>>>>>>>>>>>>>>>>");
    // console.log(closed);
    let newtext = document.querySelector('#newtext').value;
    // fix apostrophe issue
    newtext = document.querySelector('#newtext').value.replace(/'/g, '\\\'');
    // console.log(newtext);
    const fieldname = document.querySelector('#fieldname');
    // console.log(fieldname.value);

    let data = {
        INPUT_ID: aidValue,
        INPUT_USER: getUserValue(),
    };
    // console.log(data);

    let compositetext = '';
    const d = new Date();
    const date = d.toISOString().substring(0, 10);
    const time = d.toLocaleTimeString();
    const mydate = date + ' ' + time;

    switch (fieldname.value) {
        case 'INPUT_TEXT':
            // console.log('input text');
            compositetext = user + " - " + mydate + "<br>" + newtext + "<br><br>" + inputtext.innerHTML;
            data = { ...data, INPUT_TEXT: compositetext}
            break;
        case 'FOLLOWUP_TEXT':
            // console.log('followup text');
            compositetext = user + " - " + mydate + "<br>" + newtext + "<br><br>" + followuptext.innerHTML;
            data = { ...data, FOLLOWUP_TEXT: compositetext}
            break;
        case 'RESPONSE_TEXT':
            // console.log('response text');
            if (responsetext.innerHTML !== null) {
                compositetext = user + " - " + mydate + "<br>" + newtext + "<br><br>" + responsetext.innerHTML;
            } else
                compositetext = responsetext.innerHTML;
            data = { ...data, RESPONSE_TEXT: compositetext}
            break;
        
        default:
            console.log('default');
    }
    // console.log(typeof closed)
    // if (closed.checked) {
    //         data = { ...data, CLOSED: "Y"}
    //     } else {
    //         data = { ...data, CLOSED: "N"}
    //     }

    // console.log(data);

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };

    const response = await fetch(url, options);
    const json = await response.json();
    const button = document.getElementById('actiondetailsearch');
    button.click();    
    modal.close();
});

// close action item
const closeaction = document.getElementById('closeaction');
closeaction.addEventListener('click', async (event) => {
    event.preventDefault();
    const iid = document.querySelector('#iid');    
    let aidValue = iid.value;
    if (aidValue.length === 0) {
        alert('Please enter the Input ID');
    } else {
        // console.log(aidValue);
        // console.log(aidValue.length);
        while (aidValue.length < 7) {
            aidValue = '0' + aidValue;
        }
    }

    const url = `http://localhost:${port}/schedule/close/${aidValue}`;
    // console.log(url);

    let data = {
        INPUT_ID: aidValue,
        CLOSED: 'Y',
        CLOSED_DATE: getDateTime()
    };

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };

    const response = await fetch(url, options);
    const json = await response.json();
    // console.log(json);
    alert('Record updated');
    // modal.close();
    // refresh the page
    const button = document.getElementById('actiondetailsearch');
    button.click();
});