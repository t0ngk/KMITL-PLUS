export const engDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getClearedText = (text: string | null) => {
	return text?.replace(/[\n]/g, '').trim() || '';
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

	return dayMapping[day] || 'Unknown day';
};
