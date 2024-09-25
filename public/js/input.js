import { loadHeaderFooter, createNotesSection, getUserValue, getDateTime } from './utils.mjs';
loadHeaderFooter();

let user = await getUserValue();

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let iid = urlParams.get('id');
    

const url = 'http://localhost:3003/input/' + iid;
const inputUrl = 'http://localhost:3003/input/';

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
            
            // detail title (Two buttons: Edit and Close)
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
            aiClosedDate.setAttribute('id', 'closed');
            if (record[key]['CLOSED_DATE'] === null || record[key]['CLOSED_DATE'] === '' || record[key]['CLOSED_DATE'].length === 0) {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + '';
                console.log('closed date is null');
            } else {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + record[key]['CLOSED_DATE'].substring(0, 10);
                // enable the closebutton
                // closebutton.disabled = true;
                // console.log('closed date is NOT null');
                // set an id for the closed date
            }
            // toggle display of doit if recur id is not null
            const doit = document.querySelector('#doit');
            if (record[key]['RECUR_ID'] !== null) {
                doit.style.display = 'block';
                // console.log('recur id is not null');
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
            
            const btnEditDesc = document.createElement('button');
            const btnEditFlup = document.createElement('button');         

            main.appendChild(elemRpt);
            main.appendChild(elemId);
            
            main.appendChild(detailSection);
            // main.appendChild(notesSection);

            createNotesSection('INPUT_TEXT', record[key]['INPUT_TEXT']);
            createNotesSection('FOLLOWUP_TEXT', record[key]['FOLLOWUP_TEXT']);
            createNotesSection('RESPONSE_TEXT', record[key]['RESPONSE_TEXT']);

            
        }
        // Response=======================================================================================================
        // Edit and Save response
        // listen for the Response button click
        const btnEditResp = document.getElementById('editResponse');
        btnEditResp.addEventListener('click', async (event) => {
            // prevent default action
            event.preventDefault();
            // get the action item id
            let queryString = window.location.search;
            let urlParams = new URLSearchParams(queryString);
            let iid = urlParams.get('id');
            // alert('Edit Response button clicked');
            const responseDialog = document.querySelector('#respDialog');
            responseDialog.showModal();

            // listen for the cancel button click
            const btnCancelResp = document.querySelector('#cancelResp');
            btnCancelResp.addEventListener('click', async (event) => {
                // alert('Cancel Response button clicked');
                responseDialog.close();
            });  
            
            // listen for the save response button click
            const btnSaveResp = document.querySelector('#saveResp');
            btnSaveResp.addEventListener('click', async (event) => {
            // prevent default action
            event.preventDefault();
            // alert('Save Response button clicked');

            // get the response text
            const oldResponseText = document.querySelector('#responseNote').innerHTML
            const newResponseText = document.querySelector('#newTextResp').value;
            let responseText = newResponseText + '\n' + oldResponseText;
            const d = new Date();
            const date = d.toISOString().substring(0, 10);
            const time = d.toLocaleTimeString();
            const mydate = date + ' ' + time;
            // prepend response text with user name and date
            responseText = user + " - " + mydate + '\n' + newResponseText + '\n\n' + oldResponseText;            
            responseText = responseText.replace(/\n/g, "<br>");

            let data = {
                INPUT_ID: iid,
                INPUT_USER: user,
                RESPONSE_TEXT: responseText,
            };
            // console.log(data);

            // update the response text
            const url = 'http://localhost:3003/input/' + iid;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data })
                });
                // close the dialog
                responseDialog.close();
                // reload the page
                location.reload();
            });              
            
        });
        
        // Action=======================================================================================================
        // listen for the Edit Action button click
        const btnEditAction = document.querySelector('#editAction');
        btnEditAction.addEventListener('click', async (event) => {
            // prevent default action
            event.preventDefault();
            // get the action item id
            let queryString = window.location.search;
            let urlParams = new URLSearchParams(queryString);
            let iid = urlParams.get('id');
            // alert('Action button clicked');
            const actionDialog = document.querySelector('#actionDialog');
            actionDialog.showModal();

            // listen for the cancel button click
            const btnCancelAction = document.querySelector('#cancelAction');
            btnCancelAction.addEventListener('click', async (event) => {
                actionDialog.close();
            });   
            
            // listen for the save action button click
            const btnSaveAction = document.querySelector('#saveAction');
            btnSaveAction.addEventListener('click', async (event) => {
                // prevent default action
                event.preventDefault();
                // alert('Save Action button clicked');
                // get the action text
                const oldActionText = document.querySelector('#actionNote').innerHTML
                const newActionText = document.querySelector('#newTextAction').value;
                let actionText = newActionText + '\n' + oldActionText;
                const d = new Date();
                const date = d.toISOString().substring(0, 10);
                const time = d.toLocaleTimeString();
                const mydate = date + ' ' + time;
                // prepend action text with user name and date
                actionText = user + " - " + mydate + '\n' + newActionText + '\n\n' + oldActionText;
                actionText = actionText.replace(/\n/g, "<br>");

                let data = {
                    INPUT_ID: iid,
                    INPUT_USER: user,
                    INPUT_TEXT: actionText,
                };
                // console.log(data);

                // update the action text
                const url = 'http://localhost:3003/input/' + iid;
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data })
                });
                // close the dialog
                actionDialog.close();
                // reload the page
                location.reload();
            });
        });


        // Follow Up=======================================================================================================
        // listen for the Follow Up button click
        const btnEditFlup = document.querySelector('#editFollowUp');
        btnEditFlup.addEventListener('click', async (event) => {
            // prevent default action
            event.preventDefault();
            // get the action item id
            let queryString = window.location.search;
            let urlParams = new URLSearchParams(queryString);
            let iid = urlParams.get('id');
            // alert('Follow Up button clicked');
            const followUpDialog = document.querySelector('#followupDialog');
            followUpDialog.showModal();

            // listen for the followup cancel button click
            const btnCancelFlup = document.querySelector('#cancelFollowUp');
            btnCancelFlup.addEventListener('click', async (event) => {
                followUpDialog.close();
            });    
            
            // listen for the save follow up button click
            const btnSaveFlup = document.querySelector('#saveFlup');
            btnSaveFlup.addEventListener('click', async (event) => {
                // prevent default action
                event.preventDefault();
                // alert('Save Follow Up button clicked');
                // get the follow up text
                const oldFollowUpText = document.querySelector('#followUpNote').innerHTML;
                const newFollowUpText = document.querySelector('#newTextFollowup').value;
                let followUpText = newFollowUpText + '\n' + oldFollowUpText;
                const d = new Date();
                const date = d.toISOString().substring(0, 10);
                const time = d.toLocaleTimeString();
                const mydate = date + ' ' + time;
                // prepend follow up text with user name and date
                followUpText = user + " - " + mydate + '\n' + newFollowUpText + '\n\n' + oldFollowUpText;
                followUpText = followUpText.replace(/\n/g, "<br>");

                let data = {
                    INPUT_ID: iid,
                    INPUT_USER: user,
                    FOLLOWUP_TEXT: followUpText,
                };
                // console.log(data);

                // update the follow up text
                const url = 'http://localhost:3003/input/' + iid;
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ data })
                });
                // close the dialog
                followUpDialog.close();
                // reload the page
                location.reload();
            });
            
        });
        
        
        // listen for the close button click
        const closebutton = document.querySelector('#btnClose');
        closebutton.addEventListener('click', async (event) => {
            event.preventDefault();
            // console.log('closing the action item');
            
            // if the action item is already closed, do not close it again
            const closed = document.querySelector('#closed');
            // if the 10 rightmost characters are a date, the action item is closed
            if (closed.textContent.length > 15) {
                alert('This action item is already closed');
                return;
            }
            console.log(iid);           
            let aidValue = iid
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

    console.log(data);

    const options = {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    };

    const response = await fetch(url, options);
    const json = await response.json();
    
    // const formappendai = document.querySelector('#formappendai');
    // // clear the form fields
    // formappendai.innerHTML = '';

    // reload the page
    location.reload();

        });

        // listen for the edit detail button click
        const btnEditDetail = document.querySelector('#btnEditDetail');
        btnEditDetail.addEventListener('click', async (event) => {
            // prevent default action
            event.preventDefault();
            
            alert('Edit not ready yet');
            return;

            // const detailDialog = document.querySelector('#detailDialog');
            // detailDialog.showModal();

            // // listen for the cancel button click
            // const btnCancelDetail = document.querySelector('#cancelDetail');
            // btnCancelDetail.addEventListener('click', async (event) => {
            //     detailDialog.close();
            // });    
            
            // // listen for the save detail button click
            // const btnSaveDetail = document.querySelector('#saveDetail');
            // btnSaveDetail.addEventListener('click', async (event) => {
            //     // prevent default action
            //     event.preventDefault();
            //     // alert('Save Detail button clicked');
            //     // get the action text
            //     const oldActionText = document.querySelector('#actionNote').innerHTML
            //     const newActionText = document.querySelector('#newTextAction').value;
            //     let actionText = newActionText + '\n' + oldActionText;
            //     const d = new Date();
            //     const date = d.toISOString().substring(0, 10);
            //     const time = d.toLocaleTimeString();
            //     const mydate = date + ' ' + time;
            //     // prepend action text with user name and date
            //     actionText = user + " - " + mydate + '\n' + newActionText + '\n\n' + oldActionText;
            //     actionText = actionText.replace(/\n/g, "<br>");

            //     let data = {
            //         INPUT_ID: iid,
            //         INPUT_USER: user,
            //         INPUT_TEXT: actionText,
            //     };
            //     // console.log(data);

            //     // update the action text
            //     const url = 'http://localhost:3003/input/' + iid;
            //     const response = await fetch(url, {
            //         method: 'PUT',
            //         headers: {
            //             'Content-Type': 'application/json'
            //         },
            //         body: JSON.stringify({ data })
            //     });
            //     // close the dialog
            //     detailDialog.close();
            //     // reload the page
            //     location.reload();
            // });
        });
        
    });