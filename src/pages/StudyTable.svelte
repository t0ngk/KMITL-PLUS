<script lang="ts">
	import type { StudyTable } from '@/libs/types/studyTable';

	export let data: StudyTable;
	export let isEng: boolean;
	console.log(data);
</script>

<main class="w-full h-dvh">
	<div class="w-full h-full flex flex-col justify-center items-center p-10">
		<h1 class="text-3xl">🚧 : WIP</h1>
		<h1 class="text-3xl">
			User using
			<span class="underline">
				{isEng ? 'English' : 'Thai'}
			</span>
			language
		</h1>
		<p class="text-black/10">Use Console to see the data</p>
	</div>
</main>
