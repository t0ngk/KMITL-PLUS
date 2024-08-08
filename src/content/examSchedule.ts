import { scrapData } from '@/libs/examScheduleScrap';
import './app.pcss';

const examSchedule: HTMLTableElement | null = document.querySelector(
	'body > center > form > table > tbody > tr:nth-child(5) > td > table'
);
if (examSchedule) {
	const examData = scrapData(examSchedule);
	console.log(examData);
} else {
	console.error('[KMITL +] : No exam schedule found');
}
