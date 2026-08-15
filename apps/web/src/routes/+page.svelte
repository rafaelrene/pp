<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>pp — publish HTML in one command</title></svelte:head>

<main class="shell hero">
	<div class="eyebrow">HTML drafts, instantly public</div>
	<h1>Your file.<br />One URL.</h1>
	<p class="lede">
		Publish any static HTML file from your terminal. No project setup, deploy
		config, or build pipeline.
	</p>

	<div class="command" aria-label="Install and run command">
		<span aria-hidden="true">$</span>
		<code>npx pp ./plan.html</code>
		<button
			class="copy-button"
			type="button"
			onclick={() => navigator.clipboard.writeText('npx pp ./plan.html')}
		>
			Copy
		</button>
	</div>

	<div class="steps" aria-label="How it works">
		<div><strong>01</strong><span>Run the command</span></div>
		<div><strong>02</strong><span>Sign in once</span></div>
		<div><strong>03</strong><span>Share the URL</span></div>
	</div>

	<p class="quiet">
		Already published?
		<a href={resolve('dashboard')}>Open your drafts</a>
		·
		<a href={resolve('healthz')}>Status</a>
	</p>
</main>
