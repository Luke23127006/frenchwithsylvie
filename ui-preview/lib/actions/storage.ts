"use server";

import { success } from "../mock-data";

export async function getSignedUploadUrls({ files }: { files: { fileName: string; bucketName: string }[] }) {
  return success(files.map(() => {
    const url = `/api/preview-files/${crypto.randomUUID()}`;
    return { publicUrl: url, uploadUrl: url };
  }));
}
