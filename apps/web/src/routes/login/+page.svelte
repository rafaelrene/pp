<script lang="ts">
	import { resolve } from '$app/paths';

	let { data } = $props();
</script>

<svelte:head><title>Sign in — pp</title></svelte:head>

<main class="shell">
	<section class="panel">
		<div class="eyebrow">One-time setup</div>
		<h1>Sign in to pp.</h1>
		<p class="muted">
			Shoo handles identity. pp never sees or stores your Google credentials.
		</p>
		{#if data.error}
			<p role="alert">Sign-in didn’t complete. Please try again.</p>
		{/if}
		<div class="panel-actions">
			<a
				class="button"
				href={resolve(`auth/sign-in?next=${encodeURIComponent(data.next)}`)}
				>Continue with Shoo</a
			>
		</div>
	</section>
</main>
