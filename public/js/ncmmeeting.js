import {
  loadHeaderFooter,
  getSessionUser,
  myport,
  getDateTime,
} from "./utils.mjs";
loadHeaderFooter();
const port = myport() || 3003;
const user = await getSessionUser();
const test = false;
