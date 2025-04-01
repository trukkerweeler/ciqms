// import { loadHeaderFooter, getUserValue1 } from './utils.mjs';

import {getComputerName} from './getComputerName.mjs';
const fs = require('fs');
const path = require('path');
const smb2 = require('smb2');
console.log(getComputerName());

// const dates = [];
// const today = new Date();
// const currentMonth = today.getMonth();
// const currentYear = today.getFullYear();

// for (let i = 0; i < 12; i++) {
//   const date = new Date(currentYear, currentMonth - i, 1);
//   dates.push(date);
// }

// console.log(dates);
// console.log(getUserValue1());

// I want to browse files at 192.168.10
const smbClient = new smb2({
    share: '\\\\192.168.1.10',
    domain: 'WORKGROUP',
    username: 'username',
    password: 'password'
});

smbClient.readdir('', (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
    } else {
        console.log('Files:', files);
    }
});

const files = fs.readdirSync('\\\\fs1');
console.log(files);