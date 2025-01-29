import { loadHeaderFooter, getUserValue, myport } from './utils.mjs';
loadHeaderFooter();
const user = await getUserValue();
const port = myport();
const test = true

// Get the project id from the url params
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let iid = urlParams.get('document_id');

if (test) {
    // console.log('testing document.js');
    // console.log('User: ' + user);
    // console.log(iid);
}

const url = `http://localhost:${port}/sysdocs/${iid}`;

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
            detailSection.setAttribute('id', 'docsSection');
            const elemRpt = document.createElement('h1');
            const elemId = document.createElement('h2');
            const detailHeading = document.createElement('h3');
            detailHeading.setAttribute('id', 'detailTitle');
            detailHeading.textContent = 'Document Detail';

            const divDetailBtns = document.createElement('div');
            divDetailBtns.setAttribute('class', 'detailButtons');
            divDetailBtns.setAttribute('id', 'detailButtons');

            const btnEditDoc = document.createElement('button');
            btnEditDoc.setAttribute('class', 'btn');
            btnEditDoc.setAttribute('class', 'btnEditNotes');
            btnEditDoc.textContent = 'Edit Document';
            btnEditDoc.setAttribute('id', 'btnEditDoc');
            btnEditDoc.setAttribute('type', 'submit');

            const btnClose = document.createElement('button');
            btnClose.setAttribute('class', 'btn');
            // btnClose.setAttribute('class', 'btnEditNotes');
            btnClose.textContent = 'Close';
            btnClose.setAttribute('id', 'btnCloseNCM');
            btnClose.setAttribute('type', 'submit');


            // let detailTable = document.createElement('table');
            // let thead = document.createElement('thead');
            detailSection.appendChild(detailHeading);
            // divDetailBtns.appendChild(btnClose);
            divDetailBtns.appendChild(btnEditDoc);            
            detailSection.appendChild(divDetailBtns);
            
            const fieldList = ['DOCUMENT_ID', 'NAME', 'TYPE', 'STATUS', 'REVISION_LEVEL', 'ISSUE_DATE', 'SUBJECT', 'CTRL_DOC', 'DIST_DOC'];
            for (const key in record[0]) {
                if (fieldList.includes(key)){
                    const p = document.createElement('p');
                    p.setAttribute('class', 'docdata');
                    switch (key) {
                        case 'ISSUE_DATE':
                            p.textContent = 'Issue Date: ' + record[0][key].slice(0,10);
                            break;
                        case 'REVISION_LEVEL':
                            p.textContent = 'Rev. ' + record[0][key];
                            break;
                        default:
                            p.textContent = key + ": " + record[0][key];
                        }
                    detailSection.appendChild(p);
            main.appendChild(detailSection);
                }
            }

            if (user === 'TKENT') {
                btnClose.disabled = false;
            } else {
                btnClose.disabled = true;
            }

            
            // detailSection.appendChild(detailTable);

            
            main.appendChild(elemRpt);
            main.appendChild(elemId);
            main.appendChild(detailSection);
        }

    // =============================================
    // Listen for the btnEditDoc button click
    const btnEditDoc = document.querySelector('#btnEditDoc');
    btnEditDoc.addEventListener('click', async (event) => {
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



    // =============================================
    // Listen for the editDetail button 
    const editDetail = document.querySelector('#btnEditDoc');
    editDetail.addEventListener('click', async (event) => {
        const detailDialog = document.querySelector('#detailDialog');
        const detailDialogForm = document.querySelector('#editdocform');
        const label = document.createElement('label');
        // prevent the default action
        event.preventDefault();

        // Clear the dialog
        while (detailDialog.firstChild) {
            detailDialog.removeChild(detailDialog.firstChild);
        }

        for (const key in record) {
            for (const field in record[key]) {
                 if (['DOCUMENT_ID', 'NAME', 'TYPE', 'STATUS', 'REVISION_LEVEL', 'ISSUE_DATE', 'SUBJECT', 'CTRL_DOC', 'DIST_DOC'].includes (field)) {
                // console.log(field);
                const fieldDesc = document.createElement('label');
                fieldDesc.textContent = field;
                detailDialog.appendChild(fieldDesc);
                const formfield = document.createElement('input');
                formfield.setAttribute('type', 'text');
                formfield.setAttribute('id', field);
                formfield.setAttribute('class', 'field');
                formfield.setAttribute('class', 'detailedit');
                // if null, set the value to empty string
                if (record[key][field] === null) {
                    formfield.setAttribute('value', '');
                } else {
                    formfield.setAttribute('value', record[key][field]);
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
        const detailsUrl = 'http://localhost:3000/sysdocs/' + iid
        saveDetail.addEventListener('click', async (event) => {
            // prevent the default action
            event.preventDefault();
            // get the input id
            const nid = document.querySelector('#nid');
            let didValue = iid;

            let data = {
                DOCUMENT_ID: didValue,
            };

            for (const key in record) {
                for (const field in record[key]) {
                    if (['NAME', 'TYPE', 'SUBJECT', 'STATUS', 'REVISION_LEVEL', 'ISSUE_DATE', 'CTRL_DOC', 'DIST_DOC'].includes (field)) {
                        const fieldname = field;
                        const fieldvalue = document.querySelector('#' + field).value;
                        data = { ...data, [fieldname]: fieldvalue}
                    }
                }
            }
            // add the user to the data object
            data = { ...data, MODIFIED_BY: user};
            // add the modified date to the data object
            const modifiedDate = new Date();
            data = { ...data, MODIFIED_DATE: new Date().toLocaleString()};

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
            // const json = await response.json();
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


    });
