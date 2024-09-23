import { loadHeaderFooter, createNotesSection } from './utils.mjs';
loadHeaderFooter();

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let iid = urlParams.get('id');
    

const url = 'http://localhost:3003/input/' + iid;

const main = document.querySelector('main');
// Delete the child nodes of the main element
while (main.firstChild) {
    // if (main.firstChild.nodeName === 'section') {
        main.removeChild(main.firstChild);
        // section.remove();
    // }
}

    // // enable the close button
    // closebutton.disabled = false;

    fetch(url, { method: 'GET' })
    .then(response => response.json())
    .then(record => {
        // console.log(record);
        for (const key in record) {
            const detailSection = document.createElement('section');
            detailSection.setAttribute('class', 'section');
            detailSection.setAttribute('id', 'detailSection');
            const elemRpt = document.createElement('h1');
            const elemId = document.createElement('h2');

            for (myNotes in ['INPUT_TEXT', 'FOLLOWUP_TEXT', 'RESPONSE_TEXT']) {
                // call the function to create the notes section
                createNotesSection(myNotes);
            }
            
            // detail title
            const detailTitle = document.createElement('h3');
            detailTitle.textContent = 'Detail';

            // detail buttons div
            const detailButtons = document.createElement('div');
            detailButtons.setAttribute('class', 'detailButtons');
            detailButtons.setAttribute('id', 'detailButtons');
            const btnEditDetail = document.createElement('button');
            btnEditDetail.setAttribute('class', 'btn');
            btnEditDetail.setAttribute('class', 'btnEdit');
            btnEditDetail.setAttribute('id', 'btnEditDetail');
            btnEditDetail.textContent = 'Edit';
            const btnCloseDetail = document.createElement('button');
            btnCloseDetail.setAttribute('class', 'btn');
            btnCloseDetail.setAttribute('class', 'btnEdit');
            btnCloseDetail.setAttribute('id', 'btnClose');
            btnCloseDetail.textContent = 'Close';
            detailButtons.appendChild(btnCloseDetail);
            detailButtons.appendChild(btnEditDetail);
            

            const notesSection = document.createElement('section');
            notesSection.setAttribute('class', 'notesgrid');

            
            const actionDesc = document.createElement('p');
            const elemFUP = document.createElement('p');
            elemFUP.setAttribute('id', 'followup');
            const elemIaDate = document.createElement('p');
            const elemResponse = document.createElement('p');
            elemResponse.setAttribute('id', 'response');

            elemIaDate.setAttribute('class', 'actiondate');
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
                // closebutton.disabled = true;
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
           

            const actionTitle = document.createElement('h3');
            actionTitle.setAttribute('class', 'notesTitle');
            actionTitle.setAttribute('id', 'actionTitle');
            const followupTitle = document.createElement('h3');
            followupTitle.setAttribute('class', 'header3');
            followupTitle.setAttribute('id', 'followupTitle');
            const responseTitle = document.createElement('h3');
            responseTitle.setAttribute('class', 'header3');
            responseTitle.setAttribute('id', 'responseTitle');
            const controlTextTitle = document.createElement('h3');
            const linebreak = document.createElement('br');

            elemRpt.textContent = 'Action Item Detail';
            elemRpt.setAttribute('class', 'header');
            elemId.textContent = 'Action Id: ' + record[key]['INPUT_ID'];
            elemId.setAttribute('class', 'header2');

            detailSection.appendChild(detailTitle);
            detailSection.appendChild(detailButtons);
            detailSection.appendChild(aiDate);
            detailSection.appendChild(aiAssTo);
            detailSection.appendChild(aiClosedDate);
            detailSection.appendChild(caRef);
            detailSection.appendChild(reqBy);
            detailSection.appendChild(due_date);

            actionTitle.textContent = 'Action:';
            actionDesc.textContent = record[key]['INPUT_TEXT'];
            actionDesc.setAttribute('id', 'inputtext');
            // put in double backslashes
            // elemDesc.textContent = elemDesc.textContent.replace(/\\/g, '\\\\');

            // replace the line breaks with <br> elements
            actionDesc.innerHTML = actionDesc.innerHTML.replace(/\n/g, '<br>');            
            followupTitle.textContent = 'Follow Up:';
            elemFUP.textContent = record[key]['FOLLOWUP_TEXT'];
            
            // replace the line breaks with <br> elements
            elemFUP.innerHTML = elemFUP.innerHTML.replace(/\n/g, '<br>');
            responseTitle.textContent = 'Response:';
            elemResponse.textContent = record[key]['RESPONSE_TEXT'];
            
            // replace the line breaks with <br> elements
            elemResponse.innerHTML = elemResponse.innerHTML.replace(/\n/g, '<br>');

            const btnEditDesc = document.createElement('button');
            btnEditDesc.setAttribute('class', 'btn');
            btnEditDesc.setAttribute('class', 'btnEdit');
            btnEditDesc.setAttribute('class', 'detailButtons');
            btnEditDesc.setAttribute('id', 'btnEditDesc');

            btnEditDesc.setAttribute('type', 'submit');
            btnEditDesc.textContent = 'Edit Action';

            const btnEditFlup = document.createElement('button');
            btnEditFlup.setAttribute('class', 'btn');
            btnEditFlup.setAttribute('class', 'btnEdit');
            btnEditFlup.setAttribute('class', 'detailButtons');
            btnEditFlup.setAttribute('id', 'btnEditFlup');
            btnEditFlup.setAttribute('type', 'submit');
            btnEditFlup.textContent = 'Follow Up';

            const btnEditResp = document.createElement('button');
            btnEditResp.setAttribute('class', 'btn');
            btnEditResp.setAttribute('class', 'btnEdit');
            btnEditResp.setAttribute('class', 'detailButtons');
            btnEditResp.setAttribute('id', 'btnEditResp');
            btnEditResp.setAttribute('type', 'submit');
            btnEditResp.textContent = 'Respond';

            main.appendChild(elemRpt);
            main.appendChild(elemId);

            detailSection.appendChild(controlTextTitle);
            detailSection.appendChild(elemCC);
            
            notesSection.appendChild(actionTitle);
            notesSection.appendChild(actionDesc);
            notesSection.appendChild(btnEditDesc);
            notesSection.appendChild(followupTitle);
            notesSection.appendChild(elemFUP);
            notesSection.appendChild(btnEditFlup);
            // notesSection.appendChild(elemIaDate);            
            notesSection.appendChild(responseTitle);
            notesSection.appendChild(elemResponse);
            notesSection.appendChild(btnEditResp);
            
            main.appendChild(detailSection);
            main.appendChild(notesSection);
        }
        // listen for the Response button click
        const btnEditResp = document.querySelector('#btnEditResp');
        btnEditResp.addEventListener('click', async (event) => {
            // prevent default action
            event.preventDefault();
            // get the action item id
            let queryString = window.location.search;
            let urlParams = new URLSearchParams(queryString);
            let iid = urlParams.get('id');
            // alert('Response button clicked');
            const responseDialog = document.querySelector('#respDialog');
            responseDialog.showModal();

            // listen for the close button click
            const btnCloseResp = document.querySelector('#btnCloseRespDlg');
            btnCloseResp.addEventListener('click', async (event) => {
                responseDialog.close();
            });            
            
        });

        // listen for the save button click
        const btnSaveResp = document.querySelector('#saveResp');
        btnSaveResp.addEventListener('click', async (event) => {
            // get the response text
            const responseText = document.querySelector('#responseText').value;
            alert('Save Response button clicked');
            // alert(responseText);
            // console.log(responseText);
            // update the response text
            // const url = 'http://localhost:3003/input/' + iid;
            // const response = await fetch(url, {
            //     method: 'PUT',
            //     headers: {
            //         'Content-Type': 'application/json'
            //     },
            //     body: JSON.stringify({ responseText })
            // });
            // // close the dialog
            // responseDialog.close();
            // // reload the page
            // location.reload();
        });
    });
    // toggle enable/disable of the edit button
    // editbutton.disabled = false;
    // closebutton.disabled = true;
