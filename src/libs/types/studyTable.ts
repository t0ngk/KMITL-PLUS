export type StudyTable = {
	faculty: string;
	department: string;
	major: string;
	semester: string;
	academicYear: string;
	studentId: string;
	studentName: string;
	studyTable: StudyTableSubject[];
};

export type StudyTableSubject = {
	subjectId: string;
	subjectName: string;
	type: 'lecture' | 'practical';
	credit: string;
	classroom: string;
	building: string;
	note: string;
	time: StudyTableTime | null;
};

export type StudyTableTime = {
	day: string;
	startTime: string;
	endTime: string;
};
