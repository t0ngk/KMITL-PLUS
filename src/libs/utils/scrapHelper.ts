export const engDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getClearedText = (text: string | null) => {
	return text?.replace(/[\n]/g, '').trim() || '';
};

export const getStudentInfo = (rows: NodeListOf<HTMLTableRowElement>) => {
	return {
		faculty: getClearedText(rows[3].textContent),
		department: getClearedText(rows[5].childNodes[1].childNodes[1].textContent),
		major: getClearedText(rows[5].childNodes[1].childNodes[3].textContent),
		semester: getClearedText(rows[7].childNodes[1].childNodes[1].textContent),
		academicYear: getClearedText(rows[7].childNodes[1].childNodes[3].textContent),
		studentId: getClearedText(rows[9].childNodes[1].childNodes[1].textContent),
		studentName: getClearedText(rows[9].childNodes[1].childNodes[3].textContent)
	};
};

export const normalizeDay = (day: string) => {
	const dayMapping: { [key: string]: string } = {
		'อา.': engDay[0],
		'จ.': engDay[1],
		'อ.': engDay[2],
		'พ.': engDay[3],
		'พฤ.': engDay[4],
		'ศ.': engDay[5],
		'ส.': engDay[6]
	};

	return dayMapping[day] || day;
};
