import StudyTable from '@/pages/StudyTable.svelte';
import './app.css';

document.body.innerHTML = '';
new StudyTable({
	target: document.body
});
