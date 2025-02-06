import { loadHeaderFooter, getUserValue, myport } from './utils.mjs';
loadHeaderFooter();
const port = myport() || 3003;
const user = await getUserValue();
const test = false;

if (test) {
    // console.log('ncm.js');
    console.log(user);
}

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let iid = urlParams.get('id');

if (test) {
    console.log(iid);
    }
    
const url = `http://localhost:${port}/ncm/${iid}`;

const main = document.querySelector('main');
// Delete the child nodes of the main element
while (main.firstChild) {
        main.removeChild(main.firstChild);
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
            const detailHeading = document.createElement('h3');
            detailHeading.setAttribute('id', 'detailTitle');
            detailHeading.textContent = 'Detail';

            const divDetailBtns = document.createElement('div');
            divDetailBtns.setAttribute('class', 'detailButtons');
            divDetailBtns.setAttribute('id', 'detailButtons');

            const btnEditDetail = document.createElement('button');
            btnEditDetail.setAttribute('class', 'btn');
            btnEditDetail.setAttribute('class', 'btnEditNotes');
            btnEditDetail.textContent = 'Edit Detail';
            btnEditDetail.setAttribute('id', 'btnEditDetail');
            btnEditDetail.setAttribute('type', 'submit');

            const btnClose = document.createElement('button');
            btnClose.setAttribute('class', 'btn');
            // btnClose.setAttribute('class', 'btnEditNotes');
            btnClose.textContent = 'Close';
            btnClose.setAttribute('id', 'btnCloseNCM');
            btnClose.setAttribute('type', 'submit');

            // disable the close button
            if (user === 'TKENT') {
                btnClose.disabled = false;
            } else {
                btnClose.disabled = true;
            }

            divDetailBtns.appendChild(btnClose);
            divDetailBtns.appendChild(btnEditDetail);

            
            const ncmDate = document.createElement('p');
            ncmDate.textContent = 'Request Date:' + ' ' + record[key]['NCM_DATE'].substring(0, 10);
            ncmDate.setAttribute('class', 'tbl');

            const aiClosedDate = document.createElement('p');
            if (record[key]['CLOSED_DATE'] === null || record[key]['CLOSED_DATE'] === '' || record[key]['CLOSED_DATE'].length === 0) {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + '';
                if (test) {
                    console.log('closed date is null');
                }
            } else {
                aiClosedDate.textContent = 'Closed Date:' + ' ' + record[key]['CLOSED_DATE'].substring(0, 10);
                // enable the closebutton
                btnClose.disabled = true;

                if (test) {
                    console.log('closed date is NOT null');
                    // print button status
                    console.log(btnClose.disabled);
                }
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

            const ncmType = document.createElement('p');
            ncmType.textContent = 'Type:' + ' ' + record[key]['NCM_TYPE'];
            ncmType.setAttribute('class', 'tbl');   
            
            const productId = document.createElement('p');
            productId.setAttribute('class', 'tbl');
            if ((record[key]['PRODUCT_ID'] === null) || (record[key]['PRODUCT_ID'] === '') || (record[key]['PRODUCT_ID'] === undefined)) {
                productId.textContent = 'Product Id:' + '--';
            }
            else {
                productId.textContent = 'Product Id:' + ' ' + record[key]['PRODUCT_ID'];
            }

            const lotNumber = document.createElement('p');
            lotNumber.setAttribute('class', 'tbl');
            lotNumber.setAttribute('id', 'lotNumber');
            if ((record[key]['LOT_NUMBER'] === null) || (record[key]['LOT_NUMBER'] === '') || (record[key]['LOT_NUMBER'] === undefined)) {
                lotNumber.textContent = 'Lot Number:' + '--';
            }
            else {
                lotNumber.textContent = 'Lot Number:' + ' ' + record[key]['LOT_NUMBER'];
            }

            const lotQty = document.createElement('p');
            lotQty.setAttribute('class', 'tbl');
            lotQty.setAttribute('id', 'lotQty');
            if ((record[key]['LOT_SIZE'] === null) || (record[key]['LOT_SIZE'] === '') || (record[key]['LOT_SIZE'] === undefined)) {
                lotQty.textContent = 'Lot Qty:' + '';
            }
            else {
                lotQty.textContent = 'Lot Qty:' + ' ' + record[key]['LOT_SIZE'];
            }
            
            const rmaId = document.createElement('p');
            rmaId.textContent = 'RMA Id:' + ' ' + record[key]['USER_DEFINED_1'];
            rmaId.setAttribute('class', 'tbl');
            if ((record[key]['USER_DEFINED_1'] === null) || (record[key]['USER_DEFINED_1'] === '') || (record[key]['USER_DEFINED_1'] === undefined)) {
                rmaId.textContent = 'RMA Id:' + '--';
            } else {
                rmaId.textContent = 'RMA Id:' + ' ' + record[key]['USER_DEFINED_1'];
            }


            const notesSection = document.createElement('section');
            notesSection.setAttribute('class', 'notesgrid');
            notesSection.setAttribute('id', 'notesSection');

            const ncDescTitle = document.createElement('h3');
            ncDescTitle.setAttribute('class', 'header3');
            ncDescTitle.setAttribute('id', 'trendTitle');
            
            const btnEditDesc = document.createElement('button');
            btnEditDesc.setAttribute('class', 'btn');
            btnEditDesc.setAttribute('class', 'btnEditNotes');
            btnEditDesc.setAttribute('id', 'btnEditDesc');
            btnEditDesc.setAttribute('type', 'submit');
            btnEditDesc.textContent = 'Edit Desc.';
            
            const dispositionTitle = document.createElement('h3');
            dispositionTitle.setAttribute('class', 'header3');
            
            const btnEditDisposition = document.createElement('button');
            btnEditDisposition.setAttribute('class', 'btn');
            btnEditDisposition.setAttribute('class', 'btnEditNotes');
            btnEditDisposition.setAttribute('id', 'btnEditDisp');
            btnEditDisposition.textContent = 'Edit Disp.';

            const verificationTitle = document.createElement('h3');
            verificationTitle.setAttribute('class', 'header3');

            const btnEditVerf = document.createElement('button');
            btnEditVerf.setAttribute('class', 'btn');
            btnEditVerf.setAttribute('class', 'btnEditNotes');
            btnEditVerf.setAttribute('id', 'btnEditVerf');
            btnEditVerf.textContent = 'Edit Verf.';            

            const linebreak = document.createElement('br');

            elemRpt.textContent = 'Nonconformance Detail';
            elemRpt.setAttribute('class', 'header');
            elemId.textContent = 'NCM Id: ' + record[key]['NCM_ID'];
            elemId.setAttribute('class', 'header2');
            elemId.setAttribute('id', 'nid');

            const empty = document.createElement('p');
            
            detailSection.appendChild(detailHeading);
            detailSection.appendChild(divDetailBtns);
            detailSection.appendChild(empty);
            detailSection.appendChild(productId);
            detailSection.appendChild(ncmDate);
            detailSection.appendChild(caAssTo);
            detailSection.appendChild(aiClosedDate);
            detailSection.appendChild(reqBy);
            detailSection.appendChild(due_date);
            detailSection.appendChild(ncmType);
            detailSection.appendChild(lotNumber);
            detailSection.appendChild(lotQty);
            detailSection.appendChild(rmaId);

            const divDesc = document.createElement('div');
            divDesc.setAttribute('class', 'notes');
            ncDescTitle.textContent = 'Description:';
            divDesc.textContent = record[key]['DESCRIPTION'];
            divDesc.setAttribute('id', 'inputtext');
            divDesc.innerHTML = divDesc.innerHTML.replace(/\n/g, '<br>');
            notesSection.appendChild(ncDescTitle);
            notesSection.appendChild(divDesc);
            notesSection.appendChild(btnEditDesc);

            const divDisposition = document.createElement('div');
            divDisposition.setAttribute('class', 'disposition');
            divDisposition.setAttribute('class', 'notes');
            divDisposition.setAttribute('id', 'disptext');
            dispositionTitle.textContent = 'Disposition:';
            dispositionTitle.setAttribute('id', 'dispTitle');
            if ((record[key]['DISPOSITION'] === null) || (record[key]['DISPOSITION'] === '') || (record[key]['DISPOSITION'] === undefined)) {
                divDisposition.innerHTML = '<br>';
            } else {
                divDisposition.textContent = record[key]['DISPOSITION'];
                divDisposition.innerHTML = divDisposition.innerHTML.replace(/\n/g, '<br>');
            }
            notesSection.appendChild(dispositionTitle);
            notesSection.appendChild(divDisposition);
            notesSection.appendChild(btnEditDisposition);
            
            const divVerification = document.createElement('div');
            divVerification.setAttribute('class', 'verification');
            divVerification.setAttribute('class', 'notes');
            divVerification.setAttribute('id', 'verftext');
            verificationTitle.textContent = 'Verification:';
            verificationTitle.setAttribute('id', 'verificationTitle');
            divVerification.innerHTML = divVerification.innerHTML.replace(/\n/g, '<br>');
            if ((record[key]['VERIFICATION'] === null) || (record[key]['VERIFICATION'] === '') || (record[key]['VERIFICATION'] === undefined)) {
                divVerification.innerHTML = '<br>';
            } else {
                divVerification.textContent = record[key]['VERIFICATION'];
                divVerification.innerHTML = divVerification.innerHTML.replace(/\n/g, '<br>');
            }            
            notesSection.appendChild(verificationTitle);
            notesSection.appendChild(divVerification);
            notesSection.appendChild(btnEditVerf);

            // // Manage the closed checkbox
            // const closed = document.createElement('checkbox');
            // // get the value of the checkbox
            // const closedValue = record[key]['CLOSED'];
            // console.log(closedValue);

            main.appendChild(elemRpt);
            main.appendChild(elemId);
            main.appendChild(detailSection);
            main.appendChild(notesSection);
        }

    // =============================================
    // Listen for the btnEditDesc button click
    const btnEditDesc = document.querySelector('#btnEditDesc');
    btnEditDesc.addEventListener('click', async (event) => {
        // prvent the default action
        event.preventDefault();
        // show the trend dialog
        const trendDialog = document.querySelector('#trendDialog');
        trendDialog.showModal();
    });

    // Listen for the btnEditDisposition button click
    const btnEditDisposition = document.querySelector('#btnEditDisp');
    btnEditDisposition.addEventListener('click', async (event) => {
        // prvent the default action
        event.preventDefault();
        // show the trend dialog
        const dispositionDialog = document.querySelector('#dispDialog');
        dispositionDialog.showModal();
    }
    );

    // =============================================
    // Listen for the btnEditVerf button click
    const btnEditVerf = document.querySelector('#btnEditVerf');
    btnEditVerf.addEventListener('click', async (event) => {
        // prvent the default action
        event.preventDefault();
        // show the trend dialog
        const verfDialog = document.querySelector('#verfDialog');
        verfDialog.showModal();
    }
    );

    // =============================================
    // Listen for the btnEditDetail button click
    const btnEditDetail = document.querySelector('#btnEditDetail');
    btnEditDetail.addEventListener('click', async (event) => {
        // prvent the default action
        event.preventDefault();
        // show the detail dialog
        const detailDialog = document.querySelector('#detailDialog');
        detailDialog.showModal();
    }
    );


    // =============================================
    // Listen for click on close dialog button class
    const closedialog = document.querySelectorAll('.closedialog');
    closedialog.forEach((element) => {
        element.addEventListener('click', async (event) => {
            // prevent the default action
            event.preventDefault();
            // close the dialog
            const dialog = element.closest('dialog');
            dialog.close();
        });        
    });

    // // =============================================
    // // Listen for the saveNotes button class
    const saveNotes = document.querySelectorAll('.dialogSaveBtn');
    saveNotes.forEach((element) => {
        element.addEventListener('click', async (event) => {
            // prevent the default action
            event.preventDefault();
            // get the clicked button id
            // get the input id
            const nid = document.querySelector('#nid');
            let nidValue = iid;
            // if (nidValue.length === 0) {
            //     alert('Please enter the Input ID');
            // } else {
            //     while (nidValue.length < 7) {
            //         nidValue = '0' + nidValue;
            //     }
            // }

            const fieldname = event.target.id;

            if (test) {
                console.log(fieldname);
                console.log(nidValue);
                }
            
            let data = {
                NCM_ID: nidValue,
                INPUT_USER: getUserValue(),
            };
            // console.log(data);
    
            let compositetext = '';
            const d = new Date();
            const date = d.toISOString().substring(0, 10);
            const time = d.toLocaleTimeString();
            const mydate = date + ' ' + time;
    
            switch (fieldname) {
                case 'savetrend':
                    // console.log('input text');
                    let previoustext = document.querySelector('#inputtext').innerHTML;
                    let newtextTrend = document.querySelector('#newtextTrend').value;
                    // if lenght of newtextTrend is 0, do not save
                    if (newtextTrend.length === 0) {
                        alert('Not saving, no trend text.');
                        break
                    } else {

                    let compositetext = user + " - " + mydate + "<br>" + document.querySelector('#newtextTrend').value  + "<br><br>" + previoustext;
                    data = { ...data, DESCRIPTION: compositetext}
                    data = { ...data, MY_TABLE: 'NCM_DESCRIPTION'}
                    }
                    break;

                case 'saveDisp':
                    // console.log('followup text');
                    let previoustext2 = document.querySelector('#disptext').innerHTML;
                    let newtextDisp = document.querySelector('#newtextDisp').value;
                    if (newtextDisp.length === 0) {
                        alert('Not saving, no disposition text.');
                        break;
                    } else {
                    let compositetext2 = user + " - " + mydate + "<br>" + document.querySelector('#newtextDisp').value + "<br><br>" + previoustext2;
                    data = { ...data, DISPOSITION: compositetext2}
                    data = { ...data, MY_TABLE: 'NCM_DISPOSITION'}
                    }
                    break;

                case 'saveVerf':
                    let previoustext3 = document.querySelector('#verftext').innerHTML;
                    let newtextVerf = document.querySelector('#newtextVerf').value;
                    if (newtextVerf.length === 0) {
                        alert('Not saving, no verification text.');
                        break;
                    } else {
                        let compositetext3 = user + " - " + mydate + "<br>" + document.querySelector('#newtextVerf').value + "<br><br>" + previoustext3;
                        data = { ...data, VERIFICATION: compositetext3}
                        data = { ...data, MY_TABLE: 'NCM_VERIFICATION'}
                    }                    
                    break;
                
                default:
                    console.log('default');
            }
    
            if (test) {
                console.log(data);
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
            // searchbutton.click();  
            trendDialog.close();
            // refresh the page
            window.location.reload();
        });

        });

    // =============================================
    // Listen for the editDetail button 
    const editDetail = document.querySelector('#btnEditDetail');
    editDetail.addEventListener('click', async (event) => {
        const detailDialog = document.querySelector('#detailDialog');
        const detailDialogForm = document.querySelector('#detailDialogForm');
        const label = document.createElement('label');
        // prevent the default action
        event.preventDefault();

        // Clear the dialog
        while (detailDialog.firstChild) {
            detailDialog.removeChild(detailDialog.firstChild);
        }

        for (const key in record) {
            for (const field in record[key]) {
                 if (['PEOPLE_ID', 'NCM_DATE', 'ASSIGNED_TO', 'DUE_DATE', 'NCM_TYPE', 'SUBJECT','PRODUCT_ID', 'LOT_NUMBER', 'LOT_SIZE', 'USER_DEFINED_1', 'CUSTOMER_ID', 'SUPPLIER_ID'].includes (field)) {
                // console.log(field);
                const fieldDesc = document.createElement('label');
                fieldDesc.textContent = field;
                detailDialog.appendChild(fieldDesc);
                const formfield = document.createElement('input');
                // if the field is a date field, set the type to date
                if (['NCM_DATE', 'DUE_DATE'].includes(field)) {
                    formfield.setAttribute('type', 'date');
                } else {
                formfield.setAttribute('type', 'text');
                }
                formfield.setAttribute('id', field);
                formfield.setAttribute('class', 'field');
                formfield.setAttribute('class', 'detailedit');
                // if null, set the value to empty string
                if (record[key][field] === null) {
                    formfield.setAttribute('value', '');
                } else {
                    // if the field is a date field, set the value to the date
                    if (['NCM_DATE', 'DUE_DATE'].includes(field)) {
                        formfield.setAttribute('value', record[key][field].substring(0, 10));
                    } else {
                        formfield.setAttribute('value', record[key][field]);
                    }
                }
                detailDialog.appendChild(formfield);

            }           
        };

            const saveDetail = document.createElement('button');
            saveDetail.textContent = 'Save';
            saveDetail.setAttribute('class', 'btn');
            saveDetail.setAttribute('class', 'dialogSaveBtn');
            saveDetail.setAttribute('id', 'saveDetail');
            detailDialog.appendChild(saveDetail);

            const btnCancelDetail = document.createElement('button');
            btnCancelDetail.textContent = 'Cancel';
            btnCancelDetail.setAttribute('class', 'btn');
            btnCancelDetail.setAttribute('class', 'closedialog');
            btnCancelDetail.setAttribute('id', 'btnCancelDetail');
            detailDialog.appendChild(btnCancelDetail);

        }                  

        // show the detail dialog
        detailDialog.showModal();

        // Listen for the saveDetail button click
        const saveDetail = document.querySelector('#saveDetail');
        const detailsUrl = `http://localhost:${port}/ncm/details/${iid}`;
        saveDetail.addEventListener('click', async (event) => {
            // prevent the default action
            event.preventDefault();
            // get the input id
            const nid = document.querySelector('#nid');
            let nidValue = iid;

            let data = {
                NCM_ID: nidValue,
                INPUT_USER: getUserValue(),
            };

            for (const key in record) {
                for (const field in record[key]) {
                    if (['PEOPLE_ID', 'NCM_DATE', 'ASSIGNED_TO', 'DUE_DATE', 'NCM_TYPE', 'SUBJECT','PRODUCT_ID', 'LOT_NUMBER', 'LOT_SIZE', 'USER_DEFINED_1'].includes (field)) {
                        const fieldname = field;

                        try {
                            const fieldvalue = document.querySelector('#' + field).value;
                            // if the field value is undefined, set it to empty string
                            if (fieldvalue === undefined) {
                                console.log('field value is undefined: ' + fieldname);
                                fieldvalue = '';
                            } else {
                                data = { ...data, [fieldname]: fieldvalue };
                            }
                        } catch (error) {
                            console.log('error');
                            console.log(data);
                        }
                    }
                }
            }

            if (test) {
                console.log(data);
            }

            const options = {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            };

            const response = await fetch(detailsUrl, options);
            const json = await response.json();
            // searchbutton.click();  
            detailDialog.close();
            // refresh the page
            window.location.reload();
        });


        // =============================================
        // Listen for the close button click
        const closebutton = document.querySelector('#btnCancelDetail');
        closebutton.addEventListener('click', async (event) => {
            // prevent the default action
            event.preventDefault();
            // close the detailDialog
            const detailDialog = document.querySelector('#detailDialog');
            detailDialog.close();
        });        

    });

    // =============================================
        // Listen for the close NCM button click
        const closeNCM = document.querySelector('#btnCloseNCM');
        closeNCM.addEventListener('click', async (event) => {
            // prevent the default action
            event.preventDefault();
            const closeUrl = `http://localhost:${port}/ncm/close/${iid}`;

            let data = {
                NCM_ID: iid,
                CLOSED: "Y",
                CLOSED_DATE: new Date().toISOString(),
                INPUT_USER: getUserValue(),
            };

            if (test) {
                console.log(data);
            }

            const options = {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            };

            const response = await fetch(closeUrl, options);
            const json = await response.json();

            // refresh the page
            window.location.reload();

        });

    });
