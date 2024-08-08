import type { StudentInfo } from './StudentInfo';

export type examSchedule = StudentInfo & {
	subjects: examScheduleGroupByDate[];
};

export type examScheduleGroupByDate = {
	date: string | undefined;
	subjects: examScheduleSubject[];
};

export type examScheduleSubject = {
	subjectId: string;
	subjectName: string;
	section: string;
	credit: string;
	type: string;
	time: examScheduleTime | null;
	seat: examScheduleSeat | null;
};

export type examScheduleTime = {
	startTime: Date;
	endTime: Date;
};

export type examScheduleDate = {
	weekDay: string;
	day: string;
	month: string;
	year: string;
};

export type examScheduleSeat = {
	room: string;
	url: string;
};
