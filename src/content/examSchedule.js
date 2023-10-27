import ExamSchedule from "../lib/components/examSchedule.svelte";
import "../assets/styles.css";

let start = 17;

let getSubject = [];
let oldDesign = document.body.innerHTML;

const monthTxt2Num = {
  "ม.ค.": "1",
  "ก.พ.": "2",
  "มี.ค.": "3",
  "เม.ย.": "4",
  "พ.ค.": "5",
  "มิ.ย.": "6",
  "ก.ค.": "7",
  "ส.ค.": "8",
  "ก.ย.": "9",
  "ต.ค.": "10",
  "พ.ย.": "11",
  "ธ.ค.": "12",
  Jan: "1",
  Feb: "2",
  Mar: "3",
  Apr: "4",
  May: "5",
  Jun: "6",
  Jul: "7",
  Aug: "8",
  Sep: "9",
  Oct: "10",
  Nov: "11",
  Dec: "12",
};

while (true) {
  const getScape = document.querySelector(
    `body > center > form > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(${start})`
  );
  if (!getScape) {
    break;
  }
  const getSubjectInfo = [];
  for (let i = 0; i < getScape.children.length; i += 2) {
    const element = getScape.children[i];
    const text = element.textContent;
    getSubjectInfo.push(text);
  }
  const isExist = getSubject.find((e) => e.order === getSubjectInfo[0]);
  if (isExist) {
    isExist.examType =
      isExist.examType +
      (getSubjectInfo[5] ? `/${String(getSubjectInfo[5]).trim()}` : "");
    start += 2;
    continue;
  }
  const dateScrap = getSubjectInfo[6].split(" ");
  const date =
    dateScrap.length > 1
      ? new Date(
          `20${Number(dateScrap[3])}-${monthTxt2Num[dateScrap[2]]}-${
            dateScrap[1]
          }`
        )
      : null;
  const timeScrap = getSubjectInfo[7]
    .replace("น.", "")
    .trim()
    .split("-")
    .map((e) => e.split(":"));
  let startTime;
  let endTime;
  if (timeScrap.length == 2) {
    startTime = new Date(date).setHours(
      parseInt(timeScrap[0][0]),
      parseInt(timeScrap[0][1])
    );
    endTime = new Date(date).setHours(
      parseInt(timeScrap[1][0]),
      parseInt(timeScrap[1][1])
    );
  }
  const data = {
    order: getSubjectInfo[0] ? getSubjectInfo[0] : "",
    subjectCode: getSubjectInfo[1] ? getSubjectInfo[1] : "",
    subjectName: getSubjectInfo[2] ? getSubjectInfo[2] : "",
    sec: getSubjectInfo[3] ? getSubjectInfo[3] : "",
    credit: getSubjectInfo[4] ? getSubjectInfo[4] : "",
    examType: getSubjectInfo[5] ? String(getSubjectInfo[5]).trim() : "",
    startTime: startTime ? new Date(startTime) : null,
    endTime: endTime ? new Date(endTime) : null,
    date,
    room: getSubjectInfo[8] ? getSubjectInfo[8] : "",
  };
  getSubject.push(data);
  start += 2;
}

getSubject = getSubject.sort((a, b) => {
  if (a.startTime && b.startTime) {
    return a.startTime?.getTime() - b.startTime?.getTime();
  } else {
    if (a.startTime) {
      return -1;
    } else if (b.startTime) {
      return 1;
    }
  }
  return a.startTime?.getTime() - b.startTime?.getTime();
});

const groupByDate = [];
getSubject.forEach((e) => {
  const isExist = groupByDate.find(
    (f) => f.date?.getTime() === e.date?.getTime()
  );
  if (isExist) {
    isExist.subject.push(e);
  } else {
    groupByDate.push({ date: e.date, subject: [e] });
  }
});

// @ts-ignore
const termForm = document.querySelector("#mid_or_final").value;

const fontPrompt = document.createElement("style");
fontPrompt.innerHTML = `
@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
`;
document.head.appendChild(fontPrompt);

const data = {
  term: termForm,
  faculty: document.querySelector(
    "body > center > form > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(4) > td > strong"
  ).textContent,
  departmentAndProgramme: document.querySelector(
    "body > center > form > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(6) > td"
  ).textContent,
  semesterAndYear: document.querySelector(
    "body > center > form > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(8) > td"
  ).textContent,
  studentInfo: document.querySelector(
    "body > center > form > table > tbody > tr:nth-child(5) > td > table > tbody > tr:nth-child(10) > td"
  ).textContent,
  // @ts-ignore
  year: document.querySelector("#year").value,
  // @ts-ignore
  semester: document.querySelector("#semester").value,
  // @ts-ignore
  studentId: document.querySelector("#student_id").value,
};

document.body.innerHTML = "";

const oldStyle = document.head.querySelector("link[type='text/css']");
document.head.removeChild(oldStyle);

new ExamSchedule({
  target: document.body,
  props: {
    schedule: groupByDate,
    data,
    oldDesign,
  },
});
