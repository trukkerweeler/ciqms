import { loadHeaderFooter, getUserValue, myport } from "./utils.mjs";
loadHeaderFooter();
const user = await getUserValue();
const port = myport();

// Get the id from the url
let urlParams = new URLSearchParams(window.location.search);
let caid = urlParams.get('id');
let url = `http://localhost:${port}/corrective/${caid}`;

const main = document.querySelector('main');
const closebutton = document.getElementById('btnClose');
const editbutton = document.getElementById('editaction');
const button = document.getElementById('detailsearch');

// Delete the child nodes of the main element
while (main.firstChild) {
    main.removeChild(main.firstChild);
}

fetch(url, { method: 'GET' })
.then(response => response.json())
.then(record => {
    // console.log(record);
    let caid = record[0]['CORRECTIVE_ID'];
    for (const key in record) {
        // Header =======================================
        const mainTitle = document.createElement('h1');
        const divSubTitle = document.createElement('div');
        divSubTitle.setAttribute('class', 'subtitlewithbutton');
        const subTitle = document.createElement('h2');
        mainTitle.textContent = 'Corrective Action Report';
        mainTitle.setAttribute('class', 'header');

        subTitle.textContent = 'Corrective Id: ' + record[key]['CORRECTIVE_ID'] + ' - ' + record[key]['TITLE'];
        subTitle.setAttribute('class', 'header2');

        // Create close button
        const closebutton = document.createElement('button');
        closebutton.setAttribute('class', 'closebutton');
        closebutton.setAttribute('id', 'btnCloseCA');
        closebutton.textContent = 'Close CA';

        divSubTitle.appendChild(subTitle);
        divSubTitle.appendChild(closebutton);


        // Detail section=======================================
        const detailSection = document.createElement('section');
        detailSection.setAttribute('class', 'section');
        detailSection.setAttribute('id', 'detailSection');
        const detailHeader = document.createElement('h3');
        detailHeader.textContent = 'Details';
        const caDate = document.createElement('p');
        caDate.setAttribute('class', 'actiondate');
        if (record[key]['CORRECTIVE_DATE']) {
            caDate.innerHTML = 'Issue Date:' + ' ' + record[key]['CORRECTIVE_DATE'].substring(0, 10);
        } else {
            caDate.innerHTML = 'Issue Date:' + ' ' + '';
        }
        caDate.setAttribute('class', 'tbl');
        const caAssTo = document.createElement('p');
        caAssTo.textContent = 'Assigned To:' + ' ' + record[key]['ASSIGNED_TO'];
        caAssTo.setAttribute('class', 'tbl');
        caAssTo.setAttribute('id', 'assignedto');
        const caClosedDate = document.createElement('p');
        if (record[key]['CLOSED_DATE'] === null || record[key]['CLOSED_DATE'] === '0000-00-00'|| record[key]['CLOSED_DATE'] === ''|| record[key]['CLOSED_DATE'].length === 0) {
            caClosedDate.textContent = 'Closed Date:' + ' ' + '';
        } else {
            caClosedDate.textContent = 'Closed Date:' + ' ' + record[key]['CLOSED_DATE'].substring(0, 10);
            // closebutton.disabled = true;
        }
        caClosedDate.setAttribute('class', 'tbl');
        const caRef = document.createElement('p');
        caRef.textContent = 'Reference:' + ' ' + record[key]['REFERENCE'];
        caRef.setAttribute('class', 'tbl');
        caRef.setAttribute('id', 'reference');
        const reqBy = document.createElement('p');
        reqBy.textContent = 'Request By:' + ' ' + record[key]['REQUEST_BY'];
        reqBy.setAttribute('class', 'tbl');
        reqBy.setAttribute('id', 'requestby');
        const project = document.createElement('p');
        if (record[key]['PROJECT_ID'] === null) {
            project.textContent = 'Project:' + ' ' + '(No project)';
        } else {
            project.textContent = 'Project:' + ' ' + record[key]['PROJECT_ID'];
        }
        project.setAttribute('class', 'tbl');
        project.setAttribute('id', 'project');

        const btnDetails = document.createElement('button');
        btnDetails.setAttribute('id', 'btnDetails');
        btnDetails.setAttribute('class', 'btnEditNotes');
        btnDetails.textContent = 'Edit';
        btnDetails.addEventListener('click', (e) => {
            e.preventDefault();
            // load values to the form
            document.getElementById('assignedto').value = record[key]['ASSIGNED_TO'];
            document.getElementById('reference').value = record[key]['REFERENCE'];
            document.getElementById('requestby').value = record[key]['REQUEST_BY'];
            document.getElementById('project').value = record[key]['PROJECT_ID'];
            // show the dialog
            document.getElementById('detailsDialog').showModal();

            // save the changes
            document.getElementById('detailSave').addEventListener('click', async (e) => {
                e.preventDefault();
                // get the values from the form
                let assignedto = document.getElementById('assignedto').value.toUpperCase();
                let reference = document.getElementById('reference').value;
                let requestby = document.getElementById('requestby').value.toUpperCase();
                let project = document.getElementById('project').value;
                // update the record
                let url = `http://localhost:${port}/corrective/${caid}`;
                await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'ASSIGNED_TO': assignedto,
                        'REFERENCE': reference,
                        'REQUEST_BY': requestby,
                        'PROJECT_ID': project
                    })
                });
                // close the dialog
                document.getElementById('detailsDialog').close();
                // reload the page
                location.reload();
            });
        });

        // close button
        // const btnClose = document.createElement('button');
        // btnClose.setAttribute('id', 'btnClose');
        // btnClose.setAttribute('class', 'btnEditNotes');
        // btnClose.textContent = 'Close';
               

        closebutton.addEventListener('click', async (e) => {
            e.preventDefault();
            // If not TKENT, do not allow to close
            if (user !== 'TKENT') {
                alert('Only TKENT can close the CA');
                return;
            }
            const closeUrl = `http://localhost:${port}/corrective/${caid}/close`;
            await fetch(closeUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'MODIFIED_BY': user,
                    'CLOSED': 'Y',
                    'CLOSED_DATE': new Date().toISOString()
                })
            });
            // reload the page
            location.reload();
        });

        const detailButtons = document.createElement('div');
        detailButtons.setAttribute('class', 'detailButtons');
        detailButtons.setAttribute('id', 'detailButtons');
        // detailButtons.appendChild(btnClose);
        detailButtons.appendChild(btnDetails);

        const empty = document.createElement('p');

        // Append the elements to the detail section
        detailSection.appendChild(detailHeader);
        // detailSection.appendChild(btnClose);
        detailSection.appendChild(detailButtons);
        detailSection.appendChild(empty);
        detailSection.appendChild(caDate);
        detailSection.appendChild(caAssTo);
        detailSection.appendChild(caClosedDate);
        detailSection.appendChild(caRef);
        detailSection.appendChild(reqBy);
        detailSection.appendChild(project);


        // Trend section=======================================
        const trendSection = document.createElement('section');
        trendSection.setAttribute('id', 'trendSection');
        const trendHeader = document.createElement('h3');
        trendHeader.textContent = 'NC Trend';
        const trendText = document.createElement('p');
        trendText.textContent = record[key]['NC_TREND'];
        trendText.innerHTML = trendText.innerHTML.replace(/\n/g, '<br>');
        trendSection.appendChild(trendHeader);
        trendSection.appendChild(trendText);


        // Correction section=======================================
        const correctionSection = document.createElement('section');
        correctionSection.setAttribute('id', 'correctionSection');
        const correctionHeader = document.createElement('h3');
        correctionHeader.textContent = 'Correction';
        const correctionText = document.createElement('p');
        correctionText.setAttribute('id', 'correctiontext');
        correctionText.textContent = record[key]['CORRECTION_TEXT'];
        correctionText.innerHTML = correctionText.innerHTML.replace(/\n/g, '<br>');
        const correctionDate = document.createElement('p');
        // correctionDate.setAttribute('class', 'tbl');
        correctionDate.setAttribute('class', 'actiondate');
        if (record[key]['CORRECTION_DATE']) {
            correctionDate.innerHTML = 'Correction Date:' + ' ' + record[key]['CORRECTION_DATE'].substring(0, 10);
        } else {
            correctionDate.innerHTML = 'Correction Date:' + ' ' + '';
        }
        const actionby = document.createElement('p');
        actionby.setAttribute('id', 'actioner');
        let dbActioner = record[key]['ACTION_BY'];
        if (dbActioner === null) {
            dbActioner = '';
        } else {
            dbActioner = dbActioner.toUpperCase();
        }
        actionby.textContent = 'Action By:' + ' ' + dbActioner
        

        const btnCorrection = document.createElement('button');
        btnCorrection.setAttribute('id', 'btnCorrection');
        btnCorrection.setAttribute('class', 'btnEditNotes');
        btnCorrection.textContent = 'Edit';
        btnCorrection.addEventListener('click', (e) => {
            e.preventDefault();
            // load values to the form
            let actioner = record[key]['ACTION_BY'];
            if (actioner === null) {
                actioner = '';
            } else {
                actioner = actioner.toUpperCase();
            }
            document.getElementById('actionby').value = actioner;
            document.getElementById('correctiontext').value = record[key]['CORRECTION_TEXT'];
            document.getElementById('correctiondate').value = record[key]['CORRECTION_DATE'];
            // show the dialog
            document.getElementById('correctionDialog').showModal();

            // save the changes
            document.getElementById('correctionSave').addEventListener('click', async (e) => {
                e.preventDefault();
                // get the values from the form
                let newactioner = document.getElementById('actionby').value;
                if (newactioner === '') {
                    newactioner = '';
                } else {
                    newactioner = newactioner.toUpperCase();
                }
                let correctiontext = document.getElementById('correctiontext').value;
                let newcorrectiontext = document.getElementById('new-correction-text').value;
                let formatteddate = new Date().toISOString();
                formatteddate = formatteddate.replace('T', ' ').substring(0, 19);
                // replace the colon
                // formatteddate = formatteddate.replace(':', '');
                newcorrectiontext = user + ' - ' + formatteddate + '\n ' + newcorrectiontext + '\n';
                let concatText = '';
                // if correctiontext is empty, just use the newcorrectiontext
                if (correctiontext === '' || correctiontext === null) {
                    concatText = newcorrectiontext;
                } else {
                    concatText = newcorrectiontext + '\n' + correctiontext;
                    // console.log(concatText);
                }
                // // let correctiondate = document.getElementById('correctiondate').value;
                let correctiondate = new Date().toISOString().slice(0, 10);
                // update the record
                let url = `http://localhost:${port}/corrective/${caid}`;
                await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'CORRECTION_DATE': correctiondate,
                        'CORRECTION_TEXT': concatText,
                        'ACTION_BY': newactioner
                    })
                });
                // close the dialog
                document.getElementById('correctionDialog').close();
                // reload the page
                location.reload();
        });
        });
        // Append child elements to the correction section
        correctionSection.appendChild(correctionHeader);
        correctionSection.appendChild(correctionDate);
        correctionSection.appendChild(actionby);
        correctionSection.appendChild(correctionText);
        correctionSection.appendChild(btnCorrection);


        // Cause section=======================================
        const causeSection = document.createElement('section');
        causeSection.setAttribute('id', 'causeSection');
        const causeHeader = document.createElement('h3');
        causeHeader.textContent = 'Cause';
        const causeText = document.createElement('p');
        causeText.setAttribute('id', 'causetext');
        causeText.textContent = record[key]['CAUSE_TEXT'];
        causeText.innerHTML = causeText.innerHTML.replace(/\n/g, '<br>');
        const btnCause = document.createElement('button');
        btnCause.setAttribute('id', 'btnCause');
        btnCause.setAttribute('class', 'btnEditNotes');
        btnCause.textContent = 'Edit';

        btnCause.addEventListener('click', (e) => {
            e.preventDefault();
            // load values to the form
            document.getElementById('causetext').value = record[key]['CAUSE_TEXT'];
            // show the dialog
            document.getElementById('causeDialog').showModal();

            // save the changes
            document.getElementById('causeSave').addEventListener('click', async (e) => {
                e.preventDefault();
                // get the values from the form
                let causetext = document.getElementById('causetext').value;
                let newcausetext = document.getElementById('new-cause-text').value;
                let formatteddate = new Date().toISOString();
                formatteddate = formatteddate.replace('T', ' ').substring(0, 19);
                // replace the colon
                // formatteddate = formatteddate.replace(':', '');
                newcausetext = user + ' - ' + formatteddate + '\n ' + newcausetext + '\n';
                let concatText = '';
                // if causetext is empty, just use the newcausetext
                if (causetext === '' || causetext === null) {
                    concatText = newcausetext;
                } else {
                    concatText = newcausetext + '\n' + causetext;
                    // console.log(concatText);
                }
                // let causetext = document.getElementById('causetext').value;
                // let causeDate = document.getElementById('causedate').value;
                let causeDate = new Date().toISOString().slice(0, 10);
                // update the record
                let url = `http://localhost:${port}/corrective/${caid}`;
                await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'CAUSE_DATE': causeDate, //the date is not being updated - placeholder for uniform route
                        'CAUSE_TEXT': concatText
                    })
                });
                // close the dialog
                document.getElementById('causeDialog').close();
                // reload the page
                location.reload();
            });
        });

        // Add child elements to the cause section
        causeSection.appendChild(causeHeader);
        causeSection.appendChild(causeText);   
        causeSection.appendChild(btnCause);


        // Control section=======================================
        const controlSection = document.createElement('section');
        controlSection.setAttribute('id', 'controlSection');
        const controlHeader = document.createElement('h3');
        controlHeader.textContent = 'Systemic Remedy';
        const controlText = document.createElement('p');
        controlText.setAttribute('id', 'controltext');
        controlText.textContent = record[key]['CONTROL_TEXT'];        
        controlText.innerHTML = controlText.innerHTML.replace(/\n/g, '<br>');
        const controlDate = document.createElement('p');
        controlDate.setAttribute('class', 'actiondate2');
        if (record[key]['CORR_ACTION_DATE']) {
            controlDate.innerHTML = 'Systemic Date:' + ' ' + record[key]['CORR_ACTION_DATE'].substring(0, 10);
        } else {
            controlDate.innerHTML = 'Systemic Date:' + ' ' + '';
        }
        const btnControl = document.createElement('button');
        btnControl.setAttribute('id', 'btnControl');
        btnControl.setAttribute('class', 'btnEditNotes');
        btnControl.textContent = 'Edit';
        
        btnControl.addEventListener('click', (e) => {
            e.preventDefault();
            // load values to the form
            document.getElementById('controltext').value = record[key]['CONTROL_TEXT'];
            // show the dialog
            document.getElementById('controlDialog').showModal();

            // save the changes
            document.getElementById('controlSave').addEventListener('click', async (e) => {
                e.preventDefault();
                // get the values from the form
                let controltext = document.getElementById('controltext').value;
                let newcontroltext = document.getElementById('new-control-text').value;
                let formatteddate = new Date().toISOString();
                formatteddate = formatteddate.replace('T', ' ').substring(0, 19);
                // replace the colon
                // formatteddate = formatteddate.replace(':', '');
                newcontroltext = user + ' - ' + formatteddate + '\n ' + newcontroltext + '\n';
                let concatText = '';
                // if controltext is empty, just use the newcontroltext
                if (controltext === '' || controltext === null) {
                    concatText = newcontroltext;
                } else {
                    concatText = newcontroltext + '\n' + controltext;
                    // console.log(concatText);
                }
                // let controltext = document.getElementById('controltext').value;
                // let controlDate = document.getElementById('controldate').value;
                let controlDate = new Date().toISOString().slice(0, 10);
                // update the record
                let url = `http://localhost:${port}/corrective/${caid}`;
                await fetch(url, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        'CORR_ACTION_DATE': controlDate,
                        'CONTROL_TEXT': concatText
                    })
                });
                // close the dialog
                document.getElementById('controlDialog').close();
                // reload the page
                location.reload();
            });
        });
        
        // Add child elements to the control section
        controlSection.appendChild(controlHeader);
        controlSection.appendChild(controlDate);
        controlSection.appendChild(controlText);
        controlSection.appendChild(btnControl);


        // Append the elements to the main element================
        main.appendChild(mainTitle);
        main.appendChild(divSubTitle);
        main.appendChild(detailSection);
        main.appendChild(trendSection);
        main.appendChild(correctionSection);
        main.appendChild(causeSection);
        main.appendChild(controlSection);
    }
});
