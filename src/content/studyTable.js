import studyTable from "../lib/components/studyTable.svelte";
import { scrapeTable, flattenStudyTable, sortByDay, getinfo } from "../lib/util/studyTable";

import '../assets/styles.css';

const getStudyTable = document.querySelector("table");
const info = getinfo(getStudyTable);
let scrapedData = sortByDay(flattenStudyTable(scrapeTable(getStudyTable)));
const oldBody = document.body.innerHTML;
document.body.innerHTML = "";
new studyTable({
  target: document.body,
  props: {
    schedule: scrapedData,
    oldTable: oldBody,
    faculty: info.facultyName,
    department: info.department,
    major: info.major,
    semester: info.semester,
    year: info.year,
    studentId: info.studentId,
    studentName: info.studentName,
  },
});
