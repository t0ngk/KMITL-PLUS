import StudyTable from '@/pages/StudyTable.svelte';
import './app.pcss';
import { scrapData } from '@/libs/studyTableScrap';

const studyTable: HTMLTableElement | null = document.querySelector(
	'body > center > table > tbody > tr:nth-child(5) > td > table'
);
if (studyTable) {
	const info = scrapData(studyTable);
	const isEng = document
		.querySelector('body > center > table > tbody > tr:nth-child(4) > td')
		?.textContent?.includes('Individual Class Schedule')
		? true
		: false;
	document.body.innerHTML = '';
	new StudyTable({
		target: document.body,
		props: {
			data: info,
			isEng
		}
	});
}
