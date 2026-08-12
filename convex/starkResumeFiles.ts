import { components } from "./_generated/api";
import { R2 } from "@convex-dev/r2";
import type { DataModel } from "./_generated/dataModel";
import { getCurrentUser } from "./_lib/auth";

export const r2 = new R2(components.r2);

/**
 * Students/teachers upload resume PDFs for Coach Mode.
 * Files go straight to R2; text is extracted client-side (or via extractText action).
 */
export const { generateUploadUrl, syncMetadata } = r2.clientApi<DataModel>({
  checkUpload: async (ctx) => {
    await getCurrentUser(ctx);
  },
});
