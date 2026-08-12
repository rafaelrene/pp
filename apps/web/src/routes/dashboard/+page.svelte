<script lang="ts">
	import { deleteDraft, getDrafts } from './data.remote';

	let deleting = $state<string | null>(null);

	async function remove(draftId: string, title: string) {
		if (!confirm(`Delete “${title}”?`)) return;
		deleting = draftId;
		try {
			await deleteDraft(draftId);
		} finally {
			deleting = null;
		}
	}
</script>

<svelte:head><title>Drafts — pp</title></svelte:head>

<main class="shell">
	<div class="dashboard-heading">
		<div>
			<div class="eyebrow">Your uploads</div>
			<h1>Drafts.</h1>
		</div>
		<code>npx pp ./file.html</code>
	</div>

	<svelte:boundary>
		{@const drafts = await getDrafts()}
		{#if drafts.length}
			<div class="draft-list">
				{#each drafts as draft (draft.id)}
					<article class="draft-row">
						<div>
							<!-- eslint-disable svelte/no-navigation-without-resolve -- public URL can use another origin -->
							<a
								class="draft-title"
								href={draft.url}
								target="_blank"
								rel="noreferrer"
							>
								{draft.title}
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
							<p class="draft-meta">
								v{draft.currentVersion} · {draft.versionCount}
								{draft.versionCount === 1 ? 'version' : 'versions'} · {new Date(
									draft.updatedAt
								)
									.toISOString()
									.slice(0, 10)}
							</p>
							{#if draft.description}<p>{draft.description}</p>{/if}
						</div>
						<button
							class="danger"
							type="button"
							disabled={deleting === draft.id}
							onclick={() => remove(draft.id, draft.title)}
						>
							{deleting === draft.id ? 'Deleting…' : 'Delete'}
						</button>
					</article>
				{/each}
			</div>
		{:else}
			<div class="empty">No drafts yet. Publish one from your terminal.</div>
		{/if}
		{#snippet pending()}<div class="empty">Loading drafts…</div>{/snippet}
	</svelte:boundary>
</main>
