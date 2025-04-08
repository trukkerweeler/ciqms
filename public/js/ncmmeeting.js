import { loadHeaderFooter, getUserValue, myport, getDateTime } from './utils.mjs';
loadHeaderFooter();
const port = myport() || 3003;
const user = await getUserValue();
const test = false;
