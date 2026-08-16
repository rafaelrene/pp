export type DraftReference = {
	apiUrl: string;
	draftId: string;
};

export type UploadMetadata = {
	cliVersion: string;
	fileSha256: string;
	gitBranch?: string;
	gitCommit?: string;
	gitSubject?: string;
	gitDirty?: boolean;
	ciUrl?: string;
	ciActor?: string;
};

export type UploadResponse = {
	draftId: string;
	version: number;
	url: string;
};

export type Account = {
	id: string;
	name: string;
	email: string | null;
	pictureUrl?: string | null;
};

export type DraftSummary = {
	id: string;
	title: string;
	description: string | null;
	currentVersion: number;
	versionCount: number;
	updatedAt: number;
	createdAt: number;
	url?: string;
};
