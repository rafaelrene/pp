<script lang="ts">
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import '../app.css';

	let { children, data } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta
		name="description"
		content="Publish a local HTML file and get a public URL with one command."
	/>
</svelte:head>

<header class="site-header">
	<a class="wordmark" href={resolve('/')} aria-label="pp home"
		>pp<span>.</span></a
	>
	<nav aria-label="Main navigation">
		{#if data.session}
			<a href={resolve('dashboard')}>Drafts</a>
			<form method="POST" action={resolve('auth/sign-out')}>
				<button class="text-button" type="submit">Sign out</button>
			</form>
		{:else}
			<a href={resolve('login')}>Sign in</a>
		{/if}
	</nav>
</header>

<svelte:boundary>
	{@render children()}
	{#snippet pending()}
		<main class="shell loading" aria-live="polite">Loading…</main>
	{/snippet}
</svelte:boundary>
