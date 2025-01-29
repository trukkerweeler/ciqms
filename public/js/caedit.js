import { loadHeaderFooter, getUserValue, myport } from "./utils.mjs";
// ES6 callout for child process spawn
// import { spawn } from 'child_process';

loadHeaderFooter();
let user = await getUserValue();
const port = myport();

// // get the user name from the session
// fetch('/session', { method: 'GET' })
// .then(response => response.json())

// .then(session => {
//     // console.log(session);
//     user = session.user;
//     // console.log(user);
// });

const main = document.querySelector('main');
const caid = document.querySelector('#caid');
const caidValue = caid.value;

const closebutton = document.getElementById('closecorrective');
const editbutton = document.getElementById('editaction');
const button = document.getElementById('detailsearch');
const mkfldr = document.getElementById('mkfldr');
button.addEventListener('click', async (event) => {
    event.preventDefault();
    const caid = document.querySelector('#caid');    
    let caidValue = caid.value;
    if (caidValue.length === 0) {
        alert('Please enter a Corrective Action ID');
    } else {
        // console.log(caidValue);
        // console.log(caidValue.length);
        while (caidValue.length < 7) {
            caidValue = '0' + caidValue;
        }
    }

    let url = `http://localhost:${port}/corrective/${caidValue}`;
    // console.log(url);


    // Delete the child nodes of the main element
    while (main.firstChild) {
        // if (main.firstChild.nodeName === 'section') {
            main.removeChild(main.firstChild);
            // section.remove();
        // }
    }


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
            const elemIA = document.createElement('p');
            elemIA.setAttribute('id', 'correctiontext');
            const elemIaDate = document.createElement('p');
            const elemCause = document.createElement('p');
            elemCause.setAttribute('id', 'causetext');
            elemIaDate.setAttribute('class', 'actiondate');
            const elemCaDate = document.createElement('p');
            elemCaDate.setAttribute('class', 'actiondate2');
            const elemCC = document.createElement('p');
            elemCC.setAttribute('id', 'controltext');
            const caDate = document.createElement('p');
            // caDate.textContent = 'Issue Date:' + ' ' + record[key]['CORRECTIVE_DATE'].substring(0, 10);
            if (record[key]['DUE_DATE'] === null || record[key]['DUE_DATE'] === '0000-00-00'|| record[key]['DUE_DATE'] === ''|| record[key]['DUE_DATE'].length === 0) {
                caDate.innerHTML = 'Issue Date:' + ' ' + record[key]['CORRECTIVE_DATE'].substring(0, 10);
            } else {
            caDate.innerHTML = 'Issue Date:' + ' ' + record[key]['CORRECTIVE_DATE'].substring(0, 10) + '<br>' + 'Due Date:' + ' ' + record[key]['DUE_DATE'].substring(0, 10);
            }
            caDate.setAttribute('class', 'tbl');
            const caRef = document.createElement('p');
            caRef.textContent = 'Process:' + ' ' + record[key]['REFERENCE'];
            caRef.setAttribute('class', 'tbl');
            // const caClosed = document.createElement('p');
            // caClosed.textContent = 'Closed:' + record[key]['CLOSED'];

            const caClosedDate = document.createElement('p');
            if (record[key]['CLOSED_DATE'] === null || record[key]['CLOSED_DATE'] === '0000-00-00'|| record[key]['CLOSED_DATE'] === ''|| record[key]['CLOSED_DATE'].length === 0) {
                caClosedDate.textContent = 'Closed Date:' + ' ' + '';
                closebutton.disabled = false;
                // console.log('closed date is null');
            } else {
                caClosedDate.textContent = 'Closed Date:' + ' ' + record[key]['CLOSED_DATE'].substring(0, 10);
                closebutton.disabled = true;

            }
                
            caClosedDate.setAttribute('class', 'tbl');            
            
            const caAssTo = document.createElement('p');
            caAssTo.textContent = 'Assigned To:' + ' ' + record[key]['ASSIGNED_TO'];
            caAssTo.setAttribute('class', 'tbl');
            const reqBy = document.createElement('p');
            reqBy.textContent = 'Request By:' + ' ' + record[key]['REQUEST_BY'];
            reqBy.setAttribute('class', 'tbl');
            const caType = document.createElement('p');
            caType.textContent = 'Type:' + ' ' + record[key]['TYPE'];
            caType.setAttribute('class', 'tbl');
            const project = document.createElement('p');
            if (record[key]['PROJECT_ID'] === null) {
                project.textContent = 'Project:' + ' ' + '(No project)';
            } else {
                project.textContent = 'Project:' + ' ' + record[key]['PROJECT_ID'];
            }
            project.setAttribute('class', 'tbl');
           

            const ncTrendTitle = document.createElement('h3');
            const correctionTrendTitle = document.createElement('h3');
            const causeTitle = document.createElement('h3');
            const controlTextTitle = document.createElement('h3');
            const linebreak = document.createElement('br');

            elemRpt.textContent = 'Corrective Action Report';
            elemRpt.setAttribute('class', 'header');
            elemId.textContent = 'Corrective Id: ' + record[key]['CORRECTIVE_ID'] + ' - ' + record[key]['TITLE'];
            elemId.setAttribute('class', 'header2');

            detailSection.appendChild(caDate);
            detailSection.appendChild(caAssTo);
            detailSection.appendChild(caClosedDate);
            detailSection.appendChild(caRef);
            detailSection.appendChild(reqBy);
            detailSection.appendChild(project);

            ncTrendTitle.textContent = 'NC Trend';
            elemDesc.textContent = record[key]['NC_TREND'];
            correctionTrendTitle.textContent = 'Correction';
            if (record[key]['CORRECTION_DATE'] === null) {
                elemIaDate.textContent = 'Correction date:' + ' ' + 'Not yet';
            } else
                elemIaDate.textContent = 'Correction date:' + ' ' + record[key]['CORRECTION_DATE'].substring(0, 10);
            elemIA.textContent = record[key]['CORRECTION_TEXT'];
            // replace the line breaks with <br> elements
            elemIA.innerHTML = elemIA.innerHTML.replace(/\n/g, '<br>');
            causeTitle.textContent = 'Cause';
            elemCause.textContent = record[key]['CAUSE_TEXT'];
            // replace the line breaks with <br> elements
            elemCause.innerHTML = elemCause.innerHTML.replace(/\n/g, '<br>');
            controlTextTitle.textContent = 'Systemic Remedy';
            if (record[key]['CORR_ACTION_DATE'] === null) {
                elemCaDate.textContent = 'Systemic date:' + ' ' + 'Not yet';
            } else {
                elemCaDate.textContent = 'Systemic date:' + ' ' + record[key]['CORR_ACTION_DATE'].substring(0, 10);
            }
            elemCC.textContent = record[key]['CONTROL_TEXT'];
            // replace the line breaks with <br> elements
            elemCC.innerHTML = elemCC.innerHTML.replace(/\n/g, '<br>');

            main.appendChild(elemRpt);
            main.appendChild(elemId);
            // main.appendChild(detailTable);
            main.appendChild(detailSection);

            // detailSection.appendChild(linebreak);
            detailSection.appendChild(ncTrendTitle);
            detailSection.appendChild(elemDesc);
            detailSection.appendChild(correctionTrendTitle);
            detailSection.appendChild(elemIA);
            detailSection.appendChild(elemIaDate);

            detailSection.appendChild(causeTitle);
            detailSection.appendChild(elemCause);
            // detailSection.appendChild(causeTitle);

            detailSection.appendChild(controlTextTitle);
            detailSection.appendChild(elemCaDate);
            detailSection.appendChild(elemCC);
            // elemId.appendChild(elemDesc);
            main.appendChild(detailSection);
        }
    });
    editbutton.disabled = false;
    mkfldr.disabled = false;
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
    const iid = document.querySelector('#caid');    
    let cidValue = iid.value;
    if (cidValue.length === 0) {
        alert('Please enter the Input ID');
    } else {
        // console.log(aidValue);
        // console.log(aidValue.length);
        while (cidValue.length < 7) {
            cidValue = '0' + cidValue;
        }
    }

    let url = `http://localhost:${port}/corrective/${cidValue}`;
    // console.log(url);

    const correctiontext = document.querySelector("#correctiontext");
    const causetext = document.querySelector("#causetext");
    const controltext = document.querySelector("#controltext");
    let newtext = document.querySelector('#newtext').value;
    // fix apostrophe issue
    newtext = document.querySelector('#newtext').value.replace(/'/g, '\\\'');
    // console.log(newtext);
    const fieldname = document.querySelector('#fieldname');
    console.log("fn: " + fieldname.value);

    let data = {
        CORRECTIVE_ID: cidValue
    };
    // console.log(data);

    let compositetext = '';
    const d = new Date();
    const date = d.toISOString().substring(0, 10);
    const time = d.toLocaleTimeString();
    const mydate = date + ' ' + time;

    switch (fieldname.value) {
        case 'CORRECTION_TEXT':
            // console.log('input text');
            url = `http://localhost:${port}/correction/${cidValue}`;
            compositetext = user + " - " + mydate + "<br>" + newtext + "<br><br>" + correctiontext.innerHTML;
            data = { ...data, CORRECTION_TEXT: compositetext}
            break;
        case 'CAUSE_TEXT':
            // console.log('followup text');
            compositetext = user + " - " + mydate + "<br>" + newtext + "<br><br>" + causetext.innerHTML;
            data = { ...data, CAUSE_TEXT: compositetext}
            break;
        case 'CONTROL_TEXT':
            // console.log('response text');
            compositetext = user + " - " + mydate + "<br>" + newtext + "<br><br>" + controltext.innerHTML;
            data = { ...data, CONTROL_TEXT: compositetext}
            break;
        default:
            console.log('default');
    }

    // console.log(data);
    // console.log({url});

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };

    const response = await fetch(url, options);
    const json = await response.json();
    const button = document.getElementById('detailsearch');
    button.click();
    modal.close();
});

const closecorrective = document.getElementById('closecorrective');
closecorrective.addEventListener('click', async (event) => {
    event.preventDefault();
    const iid = document.querySelector('#caid');    
    let cidValue = iid.value;
    if (cidValue.length === 0) {
        alert('Please enter the Input ID');
    } else {
        while (cidValue.length < 7) {
            cidValue = '0' + cidValue;
        }
    }

    let url = `http://localhost:${port}/corrective/${cidValue}/close`;
    let myDate= new Date().toLocaleDateString();
    // convert myDate to yyyy-mm-dd format
    myDate = myDate.split('/').reverse().join('-');
    console.log("299: " + myDate);

    let data = {
        CORRECTIVE_ID: cidValue,
        CLOSED_DATE: myDate
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
    const closebutton = document.getElementById('closecorrective');
    closebutton.click();

});

const mkfolderbtn = document.getElementById('mkfldr');
mkfolderbtn.addEventListener('click', async (event) => {
    event.preventDefault();
    const iid = document.querySelector('#caid');    
    let cidValue = iid.value;
    
    if (cidValue.length === 0) {
        alert('Please enter the Input ID');
    } else {
        mkfldrmodal.showModal();
    }
});

const mkfldrsave = document.getElementById('mkfldrsave');
mkfldrsave.addEventListener('click', async (event) => {
    event.preventDefault();
    const iid = document.querySelector('#caid');    
    let cidValue = iid.value;
    let foldername = document.querySelector('#foldername').value;
    if (foldername.length === 0) {
        alert('Please enter the folder name');
    } else {
        // console.log(aidValue);
        // console.log(aidValue.length);
        while (cidValue.length < 7) {
            cidValue = '0' + cidValue;
        }
    }
    let folderfullname = cidValue + '-' + foldername;
    // create path to \\fs1\Quality - Records\10200C - Corrective Action\" + folderfullname;
    folderfullname = '\\\\fs1\\Quality - Records\\10200C - Corrective Action\\' + folderfullname;

    // make folder for the corrective action
    // createfolder(folderfullname);
    // const spawn = require('child_process').spawn;
    const process = spawn('python', ['../python/makefolder.py', folderfullname]);


    // console.log(json);
    // alert('Record updated');
    // const mkfolderbtn = document.getElementById('mkfldr');
    // mkfolderbtn.click();
    mkfldrmodal.close();
});

