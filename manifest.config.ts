import { defineManifest } from '@crxjs/vite-plugin';
import packageJson from './package.json';
const { version } = packageJson;

// Convert from Semver (example: 0.1.0-beta6)
const [major, minor, patch, label = '0'] = version
	// can only contain digits, dots, or dash
	.replace(/[^\d.-]+/g, '')
	// split into version parts
	.split(/[.-]/);

export default defineManifest(async (env) => ({
	manifest_version: 3,
	name: env.mode === 'development' ? '[DEV] KMITL +' : 'KMITL +',
	version: `${major}.${minor}.${patch}.${label}`,
	version_name: version,
	content_scripts: [
		{
			js: ['/src/content/studyTable'],
			matches: ['https://*.reg.kmitl.ac.th/u_student/report_studytable_show.php']
		},
		{
			js: ['src/content/examSchedule'],
			matches: ['https://*.reg.kmitl.ac.th/u_student/report_examtable_show.php']
		}
	]
}));
