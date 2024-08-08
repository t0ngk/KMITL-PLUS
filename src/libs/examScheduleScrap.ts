import { getClearedText, getStudentInfo } from './utils/scrapHelper';

export const scrapData = (table: HTMLTableElement) => {
	const rows = table.querySelectorAll('tr');

	const examSubjects = [];
	const examTableRows = Array.from(rows).filter((row) => row.childNodes.length == 37);
	for (const subject of examTableRows) {
		const subjectData = subject.children;
		const timeData = getClearedText(subjectData[14].textContent).split('-');
		const seat = subjectData[16].querySelector('a');
		examSubjects.push({
			subjectId: getClearedText(subjectData[2].textContent),
			subjectName: getClearedText(subjectData[4].textContent),
			section: getClearedText(subjectData[6].textContent),
			credit: getClearedText(subjectData[8].textContent),
			type: getClearedText(subjectData[10].textContent),
			date: getClearedText(subjectData[12].textContent) || null,
			time:
				timeData.length != 2
					? null
					: {
							startTime: timeData[0],
							endTime: timeData[1]
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
		subjects: examSubjects
	};
};
