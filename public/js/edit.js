import { loadHeaderFooter, getUserValue, getDateTime, getFormFields } from './utils.mjs';

loadHeaderFooter();
const user = await getUserValue();
let inputUrl = 'http://localhost:3003/input/';
let previousUrl = 'http://localhost:3003/input/previous/';
let csrurl = 'http://localhost:3003/csr/';

const main = document.querySelector('main');
const iid = document.querySelector('#iid');

const editbutton = document.getElementById('editaction');

const searchbutton = document.getElementById('actiondetailsearch');
searchbutton.addEventListener('click', async (event) => {
    event.preventDefault();
    let inputUrl = 'http://localhost:3003/input/';

    const iid = document.querySelector('#iid');    
    let aidValue = iid.value;
    if (aidValue.length === 0) {
        alert('Please enter the Input ID');
    } else {
        while (aidValue.length < 7) {
            aidValue = '0' + aidValue;
        }
    }

    const url = inputUrl + aidValue;

    // Delete the child nodes of the main element
    while (main.firstChild) {
        main.removeChild(main.firstChild);
        // console.log('deleting child nodes');
    }
    main.innerHTML = '';

    // enable the close button
    // closeactionbutton.disabled = false;

    fetch(url, { method: 'GET' })
    .then(response => response.json())
    .then(record => {

        for (const key in record) {
            // console.log(record.length);
            const detailSection = document.createElement('section');
            detailSection.setAttribute('class', 'section');
            detailSection.setAttribute('id', 'detailsection');
            const detailHeading = document.createElement('h3');
            detailHeading.setAttribute('id', 'detailheading');
            detailHeading.textContent = 'Details';
            const detailEditBtn = document.createElement('button');
            detailEditBtn.setAttribute('id', 'editdetail');
            detailEditBtn.textContent = 'Edit';

            const actionTitle = document.createElement('h1');
            const elemId = document.createElement('h2');
            
            const elemDesc = document.createElement('p');
            const elemFUP = document.createElement('p');
            elemFUP.setAttribute('id', 'followup');
            const elemIaDate = document.createElement('p');
            const elemResponse = document.createElement('p');
            elemResponse.setAttribute('id', 'response');

            elemIaDate.setAttribute('class', 'actiondate');

            const aiDate = document.createElement('p');
            if (record[key]['DUE_DATE'] === null) {
                aiDate.textContent = 'Request Date:' + ' ' + record[key]['INPUT_DATE'].substring(0, 10) + '\n';
            } else {
            aiDate.innerText = 'Request Date:' + ' ' + record[key]['INPUT_DATE'].substring(0, 10) + '\n' + 'Due date:' + ' ' + record[key]['DUE_DATE'].substring(0, 10);
            }
            aiDate.setAttribute('class', 'tbl');
            const aiProj = document.createElement('p');
            aiProj.textContent = 'Project:' + ' ' + record[key]['PROJECT_ID'] + ' - ' + record[key]['NAME'];
            aiProj.setAttribute('class', 'tbl');
            const aiSubject = document.createElement('p');
            aiSubject.textContent = 'Subject:' + ' ' + record[key]['SUBJECT'];
            aiSubject.setAttribute('class', 'tbl');
            aiSubject.setAttribute('id', 'subject');

            const aiClosedDate = document.createElement('p');
            if (record[key]['CLOSED_DATE'] === null || record[key]['CLOSED_DATE'] === '' || record[key]['CLOSED_DATE'].length === 0) {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + '';
                console.log('closed date is null');
            } else {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + record[key]['CLOSED_DATE'].substring(0, 10);
                // enable the closebutton
                // closeactionbutton.disabled = true;
                console.log('closed date is NOT null');
            }
            // toggle display of doit if recur id is not null
            const doit = document.querySelector('#doit');
            if (record[key]['RECUR_ID'] !== null) {
                const scanners = ['05TE', '07TE', '08TE'];
                doit.style.display = 'block';
                if (scanners.includes(record[key]['SUBJECT'])) {
                    const scanit = document.createElement('p');
                    scanit.textContent = 'Scan, file form, toss this paper.';
                    doit.appendChild(scanit);
                }
                console.log('recur id is not null');
            } else {
                doit.style.display = 'none';
                console.log('recur id is null');
            }

            aiClosedDate.setAttribute('class', 'tbl');

            const aiAssTo = document.createElement('p');
            aiAssTo.textContent = 'Assigned To:' + ' ' + record[key]['ASSIGNED_TO'];
            aiAssTo.setAttribute('class', 'tbl');
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
           
            // Create the text area headings
            const actionNotesTitle = document.createElement('h3');
            actionNotesTitle.setAttribute('class', 'header3');
            actionNotesTitle.setAttribute('id', 'actionNotesTitle');
            

            const followupTitle = document.createElement('h3');
            followupTitle.setAttribute('class', 'header3');
            const responseTitle = document.createElement('h3');
            responseTitle.setAttribute('class', 'header3');
            const linebreak = document.createElement('br');

            // Create the main header and id elements
            actionTitle.textContent = 'Action Item Detail';
            actionTitle.setAttribute('class', 'header');
            elemId.textContent = 'Action Id: ' + record[key]['INPUT_ID'];
            elemId.setAttribute('class', 'header2');
            const collectBtn = document.createElement('button');
            collectBtn.setAttribute('id', 'collectBtn');
            collectBtn.textContent = 'Collect Data';
            const previousBtn = document.createElement('button');
            previousBtn.setAttribute('id', 'previousBtn');
            previousBtn.textContent = 'Data History';


            // Append fields to the detail section
            detailSection.appendChild(detailHeading);
            detailSection.appendChild(detailEditBtn);
            detailSection.appendChild(aiDate);
            detailSection.appendChild(aiAssTo);
            detailSection.appendChild(aiClosedDate);
            detailSection.appendChild(aiProj);
            detailSection.appendChild(reqBy);
            detailSection.appendChild(aiSubject);

            actionNotesTitle.textContent = 'Action:';
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

            main.appendChild(actionTitle);
            main.appendChild(elemId);
            main.appendChild(collectBtn);
            main.appendChild(previousBtn);

            detailSection.appendChild(actionNotesTitle);
            detailSection.appendChild(elemDesc);
            detailSection.appendChild(elemDesc);
            detailSection.appendChild(followupTitle);
            detailSection.appendChild(elemFUP);
            detailSection.appendChild(elemIaDate);

            detailSection.appendChild(responseTitle);
            detailSection.appendChild(elemResponse);

            main.appendChild(detailSection);
        }

// collect action modal=======================================
// collect action modal=======================================
const collectModal = document.querySelector('[data-collect-modal]');
// open modal on button click
collectBtn.addEventListener('click', (event) => {
    event.preventDefault();        

    const collectform = document.getElementById('collectform');
    // Delete the child nodes of the main element
    while (collectform.firstChild) {
        collectform.removeChild(collectform.firstChild);
    }
    
    // First input element
    const cid = document.createElement('input');
    const cidLabel = document.createElement('label');
    cidLabel.setAttribute('for', 'CUSTOMER_ID');
    cidLabel.textContent = 'Customer ID';
    collectform.appendChild(cidLabel);
    cid.setAttribute('id', 'CUSTOMER_ID');
    cid.setAttribute('name', 'CUSTOMER_ID');
    cid.setAttribute('type', 'text');
    // cid.setAttribute('value', 'CUSTOMER_ID');
    collectform.appendChild(cid);

    // Second input element
    const myUnit = document.createElement('input');
    myUnit.setAttribute('id', 'UNIT');
    myUnit.setAttribute('name', 'UNIT');
    myUnit.setAttribute('type', 'text');
    const myUnitLabel = document.createElement('label');
    myUnitLabel.setAttribute('for', 'UNIT');
    myUnitLabel.textContent = 'Unit';
    collectform.appendChild(myUnitLabel);
    collectform.appendChild(myUnit);

    // Third input element
    const myValue = document.createElement('input');
    myValue.setAttribute('id', 'VALUE');
    myValue.setAttribute('name', 'VALUE');
    myValue.setAttribute('type', 'text');
    const myValueLabel = document.createElement('label');
    myValueLabel.setAttribute('for', 'VALUE');
    myValueLabel.textContent = 'Value';
    collectform.appendChild(myValueLabel);
    collectform.appendChild(myValue);

    // Fourth input element - Collection date
    const myDate = document.createElement('input');
    myDate.setAttribute('id', 'SAMPLE_DATE');
    myDate.setAttribute('name', 'SAMPLE_DATE');
    myDate.setAttribute('type', 'date');
    const myDateLabel = document.createElement('label');
    myDateLabel.setAttribute('for', 'SAMPLE_DATE');
    myDateLabel.textContent = 'Collection Date';
    collectform.appendChild(myDateLabel);
    collectform.appendChild(myDate);

    // Create cancel button
    const cmCancel = document.createElement('button')
    cmCancel.setAttribute('id', 'collect-cancel');
    cmCancel.textContent = 'Cancel';
    collectform.appendChild(cmCancel);

    // Create save button
    const cmSave = document.createElement('button')
    cmSave.setAttribute('id', 'collectsave');
    cmSave.textContent = 'Save';
    collectform.appendChild(cmSave);

    // show the collect modal
    collectModal.showModal();
    
    // hide the modal on cancel button click
    const collectCancel = document.getElementById('collect-cancel');
    collectCancel.addEventListener('click', () => {
        collectModal.close();
    });

    const collectSave = document.querySelector('#collectsave');
    collectSave.addEventListener('click', async (event) => {
        // alert('Collecting data');
        event.preventDefault();
        // // console.log(csrurl + 'nextCSRid')
        let responseNextId = await fetch( csrurl + 'nextCSRid', { method: 'GET' })
        let nextCSRId = await responseNextId.json();
        // prepend with 0's to 7 digits
        nextCSRId = nextCSRId.toString();
        while (nextCSRId.length < 7) {
            nextCSRId = '0' + nextCSRId;
        }
        // console.log(nextCSRId);
        
        let aidValue = document.querySelector('#iid').value;
        if (aidValue.length === 0) {
            alert('Please enter the Input ID');
        } else {
            while (aidValue.length < 7) {
                aidValue = '0' + aidValue;
            }
        }
        
        const url = csrurl + nextCSRId;
        
        let data = {
            COLLECTION_ID: nextCSRId,
            INPUT_ID: aidValue,
            INPUT_USER: await getUserValue(),
        };
        const d = new Date();
        const date = d.toISOString().substring(0, 10);
        const time = d.toLocaleTimeString();
        // const mydate = date + ' ' + time;

        let myCustomer = document.getElementById('CUSTOMER_ID').value.toUpperCase();
        // myCustomer = myCustomer.toUpperCase();
        let myUnit = document.getElementById('UNIT').value;
        myUnit = myUnit.toUpperCase();
        const myValue = document.getElementById('VALUE').value;
        const myDate = document.getElementById('SAMPLE_DATE').value + ' ' + time;

        data = {...data, CUSTOMER_ID: myCustomer, UNIT: myUnit, VALUE: myValue, SAMPLE_DATE: myDate};
        console.log(data);
        
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };
        
        const response = await fetch(url, options);
        const json = await response.json();
        collectModal.close();
    });


    
});

    // Show previous data modal
    // const previousBtn = document.querySelector('#previousBtn');
    previousBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        const url = previousUrl + aidValue;
        // console.log(url);
        const response = await fetch(url, { method: 'GET' });
        const json = await response.json();
        console.log(json);
    
        // Create the modal
        const previousModal = document.querySelector('[previous-data-modal]');
        // open modal on button click
        previousModal.showModal();
        // clear the previous modal
        while (previousModal.firstChild) {
            previousModal.removeChild(previousModal.firstChild);
        }
        // make table for the data
        const previousTable = document.createElement('table');
        const previousTableHead = document.createElement('thead');
        const previousTableBody = document.createElement('tbody');
        const previousTableHeadRow = document.createElement('tr');
        const previousTableHeadCell1 = document.createElement('th');
        const previousTableHeadCell2 = document.createElement('th');

        previousTableHeadCell1.textContent = 'Collection ID';

        previousModal.appendChild(previousTable);
        previousTable.appendChild(previousTableHead);
        previousTable.appendChild(previousTableBody);
        previousTableHead.appendChild(previousTableHeadRow);
        previousTableHeadRow.appendChild(previousTableHeadCell1);
        previousTableHeadRow.appendChild(previousTableHeadCell2);

        for (const key in json) {
            const previousTableRow = document.createElement('tr');
            const previousTableCell1 = document.createElement('td');
            const previousTableCell2 = document.createElement('td');

            previousTableCell1.textContent = json[key]['INPUT_ID'];
            previousTableCell2.textContent = json[key]['RESPONSE_TEXT'];

            previousTableBody.appendChild(previousTableRow);
            previousTableRow.appendChild(previousTableCell1);
            previousTableRow.appendChild(previousTableCell2);

        }
        
        // Create close button
        const previousCloseBtn = document.createElement('button');
        previousCloseBtn.setAttribute('id', 'previous-close');
        previousCloseBtn.textContent = 'Close';
        previousModal.appendChild(previousCloseBtn);

        // close the previous data modal
        const previousClose = document.getElementById('previous-close');
        previousClose.addEventListener('click', () => {
            previousModal.close();
        });
});        
    
    // toggle enable/disable of the edit button
    editbutton.disabled = false;

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
        while (aidValue.length < 7) {
            aidValue = '0' + aidValue;
        }
    }

    const url = 'http://localhost:3003/input/' + aidValue;
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

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };

    const response = await fetch(url, options);
    const json = await response.json();
    searchbutton.click();    
    modal.close();
});   
    

    });
});

// close action item (Enters closed date)
const closeactionbutton = document.querySelector('#closeactionbtn');
// set the once to false
// closeactionbutton.setAttribute('once', 'true');
closeactionbutton.addEventListener('click', async (event) => {
        event.preventDefault();
        // closeactionbutton.addEventListener('click', closeActionHandler);
        console.log('closing the action item');
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

    const url = inputUrl + 'close/' + aidValue;
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
    
    const formappendai = document.querySelector('#formappendai');
    // clear the form fields
    formappendai.innerHTML = '';

    // console.log('auto click the search button (Closing the action item)');
    searchbutton.click();
    // const searchbutton = document.querySelector('#actiondetailsearch');
    // wait for the action item to close
    // main.innerHTML = '';
    // window.setTimeout(function() {
    //     searchbutton.click();
    // }, 500);

});