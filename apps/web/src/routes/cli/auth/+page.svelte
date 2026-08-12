<script lang="ts">
	import { approveCliAccess, denyCliAccess } from './data.remote';

	let { data } = $props();
	let actionState = $state<'ready' | 'working' | 'approved' | 'denied'>(
		'ready'
	);
	const viewState = $derived(
		data.status === 'approved' && actionState === 'ready'
			? 'approved'
			: actionState
	);
	let message = $state('');
	const displayCode = $derived(
		`${data.userCode.slice(0, 4)}-${data.userCode.slice(4)}`
	);

	async function approve() {
		actionState = 'working';
		message = '';
		try {
			await approveCliAccess(data.userCode);
			actionState = 'approved';
		} catch {
			actionState = 'ready';
			message = 'Could not connect this CLI. The code may have expired.';
		}
	}

	async function deny() {
		actionState = 'working';
		await denyCliAccess(data.userCode);
		actionState = 'denied';
	}
</script>

<svelte:head><title>Connect CLI — pp</title></svelte:head>

<main class="shell">
	<section class="panel">
		<div class="eyebrow">CLI authorization</div>
		{#if viewState === 'approved'}
			<h1>Connected.</h1>
			<p class="muted">Return to your terminal. You can close this tab.</p>
		{:else if viewState === 'denied'}
			<h1>Denied.</h1>
			<p class="muted">No credential was shared. You can close this tab.</p>
		{:else}
			<h1>Connect pp?</h1>
			<p>
				Signed in as <strong>{data.session.name}</strong>. Confirm the code
				shown in your terminal:
			</p>
			<p><span class="code">{displayCode}</span></p>
			<div class="panel-actions">
				<button
					class="button"
					type="button"
					disabled={viewState === 'working'}
					onclick={approve}
				>
					Authorize CLI
				</button>
				<button
					class="button secondary"
					type="button"
					disabled={viewState === 'working'}
					onclick={deny}
				>
					Deny
				</button>
			</div>
		{/if}
		{#if message}<p role="alert">{message}</p>{/if}
	</section>
</main>
