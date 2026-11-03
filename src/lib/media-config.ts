// Client-safe upload limits, shared by the upload form and src/lib/media.ts.
// Uploads go one file per request, so a single file must also fit the server action body limit
// (experimental.serverActions.bodySizeLimit in next.config.ts).

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "10 MB";
