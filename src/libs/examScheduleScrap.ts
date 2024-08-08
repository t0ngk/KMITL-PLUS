import type { examScheduleGroupByDate, examScheduleSubject } from './types/ExamSchedule';
import { getClearedText, getStudentInfo, normalizeMonth } from './utils/scrapHelper';

export const scrapData = (table: HTMLTableElement) => {
	const rows = table.querySelectorAll('tr');

	const examSubjects: examScheduleSubject[] = [];
	const examTableRows = Array.from(rows).filter((row) => row.childNodes.length == 37);
	for (const subject of examTableRows) {
		const isExisted = examSubjects.find(
			(s) => s.subjectId === getClearedText(subject.children[2].textContent)
		);
		const subjectData = subject.children;
		if (isExisted) {
			isExisted.type += `/${getClearedText(subjectData[10].textContent)}`;
			continue;
		}
		const timeData = getClearedText(subjectData[14].textContent).split('-');
		const seat = subjectData[16].querySelector('a');
		const date = getClearedText(subjectData[12].textContent);
		examSubjects.push({
			subjectId: getClearedText(subjectData[2].textContent),
			subjectName: getClearedText(subjectData[4].textContent),
			section: getClearedText(subjectData[6].textContent),
			credit: getClearedText(subjectData[8].textContent),
			type: getClearedText(subjectData[10].textContent),
			time:
				timeData.length != 2
					? null
					: {
							startTime: convertToDateTime(date, timeData[0]),
							endTime: convertToDateTime(date, timeData[1])
						},
			seat: seat
				? {
						room: getClearedText(seat.textContent),
						url: seat?.href
					}
				: null
		});
	}
	return {
		...getStudentInfo(rows),
		subjects: groupByDate(sortSubjects(examSubjects))
	};
};

const convertToDateTime = (date: string, time: string) => {
	const rawDate = date.split(' ');
	const rawTime = time.replace(/(น.)|\(.\)/g, '');
	const day = rawDate[1];
	const month = normalizeMonth(rawDate[2]);
	const year = rawDate[3];
	return new Date(`20${year}-${month}-${day}-${rawTime}`);
};

const sortSubjects = (subjects: examScheduleSubject[]) => {
	return subjects.sort((a, b) => {
		if (a.time && b.time) {
			return a.time.startTime.getTime() - b.time.startTime.getTime();
		} else {
			if (a.time) {
				return -1;
			} else if (b.time) {
				return 1;
			}
		}
		return 0;
	});
};

const groupByDate = (subjects: examScheduleSubject[]) => {
	const groupedSubjects: examScheduleGroupByDate[] = [];
	subjects.forEach((subject) => {
		const date = subject.time?.startTime.toDateString();
		const isExisted = groupedSubjects.find((s) => s.date === date);
		if (isExisted) {
			isExisted.subjects.push(subject);
		} else {
			groupedSubjects.push({ date: date, subjects: [subject] });
		}
	});
	return groupedSubjects;
};
