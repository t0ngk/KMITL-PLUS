import { type StudyTable, type StudyTableSubject } from './types/studyTable';
import { engDay, getClearedText, normalizeDay, getStudentInfo } from './utils/scrapHelper';

export const scrapData = (studyTable: HTMLTableElement) => {
	const rows = studyTable.querySelectorAll('tr');
	const info: StudyTable = {
		...getStudentInfo(rows),
		studyTable: sortStudyTable(getStudyTable(rows))
	};
	return info;
};

const getStudyTable = (rows: NodeListOf<HTMLTableRowElement>) => {
	const studyTable: StudyTableSubject[] = [];
	const filteredRows = Array.from(rows)
		.filter((row) => row.children.length == 18)
		.slice(1);
	for (const subject of filteredRows) {
		const subjectData = subject.children;
		const data = {
			subjectId: getClearedText(subjectData[2].textContent),
			subjectName: getClearedText(subjectData[4].textContent),
			credit: getClearedText(subjectData[6].textContent),
			note: getClearedText(subjectData[17].textContent)
		};
		const lectureSection = subjectData[8].textContent;
		const practicalSection = subjectData[10].textContent;
		const dataAndTime = subjectData[12].childNodes;
		if (lectureSection != '-') {
			studyTable.push({
				...data,
				type: 'lecture',
				classroom: getClearedText(subjectData[14].childNodes[0].textContent),
				building: getClearedText(subjectData[16].childNodes[0].textContent),
				time: dataAndTime[0].textContent ? getDateTime(dataAndTime[0].textContent) : null
			});
		}
		if (practicalSection != '-') {
			studyTable.push({
				...data,
				type: 'practical',
				classroom: getClearedText(subjectData[14].childNodes[2].textContent),
				building: getClearedText(subjectData[16].childNodes[2].textContent),
				time: dataAndTime[2].textContent ? getDateTime(dataAndTime[2].textContent) : null
			});
		}
	}
	return studyTable;
};

const getDateTime = (dataAndTime: string) => {
	const [day, time] = dataAndTime
		.replace(/(น.)|\(.\)/g, '')
		.trim()
		.split(' ');
	const [startTime, endTime] = time.split('-');
	return {
		day: normalizeDay(day),
		startTime: startTime,
		endTime: endTime
	};
};

const sortStudyTable = (studyTable: StudyTableSubject[]) => {
	return studyTable.sort((a, b) => {
		const DayA = engDay.indexOf(a.time?.day || '');
		const DayB = engDay.indexOf(b.time?.day || '');
		const TimeA = a.time?.startTime.split(':').reduce((acc, cur) => acc * 60 + +cur, 0) || 0;
		const TimeB = b.time?.startTime.split(':').reduce((acc, cur) => acc * 60 + +cur, 0) || 0;

		if (DayA < DayB) return -1;
		if (DayA > DayB) return 1;
		if (TimeA < TimeB) return -1;
		if (TimeA > TimeB) return 1;

		return 0;
	});
};
