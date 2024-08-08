import type { StudentInfo } from './StudentInfo';

export type StudyTable = StudentInfo & {
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
