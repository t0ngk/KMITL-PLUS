export const engDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const engMonth = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];
export const thaiDay = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const thaiMonth = [
	'ม.ค.',
	'ก.พ.',
	'มี.ค.',
	'เม.ย.',
	'พ.ค.',
	'มิ.ย.',
	'ก.ค.',
	'ส.ค.',
	'ก.ย.',
	'ต.ค.',
	'พ.ย.',
	'ธ.ค.'
];

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

export const normalizeMonth = (month: string) => {
	const monthMapping: { [key: string]: string } = {
		'ม.ค.': engMonth[0],
		'ก.พ.': engMonth[1],
		'มี.ค.': engMonth[2],
		'เม.ย.': engMonth[3],
		'พ.ค.': engMonth[4],
		'มิ.ย.': engMonth[5],
		'ก.ค.': engMonth[6],
		'ส.ค.': engMonth[7],
		'ก.ย.': engMonth[8],
		'ต.ค.': engMonth[9],
		'พ.ย.': engMonth[10],
		'ธ.ค.': engMonth[11]
	};

	return monthMapping[month] || month;
};

export const normalizeDayToThai = (day: string) => {
	const dayMapping: { [key: string]: string } = {
		Sun: thaiDay[0],
		Mon: thaiDay[1],
		Tue: thaiDay[2],
		Wed: thaiDay[3],
		Thu: thaiDay[4],
		Fri: thaiDay[5],
		Sat: thaiDay[6]
	};

	return dayMapping[day] || day;
};

export const normalizeMonthToThai = (month: string) => {
	const monthMapping: { [key: string]: string } = {
		Jan: thaiMonth[0],
		Feb: thaiMonth[1],
		Mar: thaiMonth[2],
		Apr: thaiMonth[3],
		May: thaiMonth[4],
		Jun: thaiMonth[5],
		Jul: thaiMonth[6],
		Aug: thaiMonth[7],
		Sep: thaiMonth[8],
		Oct: thaiMonth[9],
		Nov: thaiMonth[10],
		Dec: thaiMonth[11]
	};

	return monthMapping[month] || month;
};
