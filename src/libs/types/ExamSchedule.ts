import type { StudentInfo } from "./StudentInfo";

export type examSchedule = StudentInfo & {
    subjects: examScheduleSubject[];
}

export type examScheduleSubject = {
    subjectId: string;
    subjectName: string;
    section: string;
    credit: string;
    type: string;
    date: string | null;
    time: examScheduleTime | null;
    seat: examScheduleSeat | null;
}

export type examScheduleTime = {
    startTime: string;
    endTime: string;
}

export type examScheduleSeat = {
    room: string;
    url: string;
}
