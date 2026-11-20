"use server";

import { previewData, success } from "../mock-data";

export async function getSeenFeatures(_input: object) {
  return success([...previewData.seen]);
}

export async function markFeatureAsSeen({ featureKey }: { featureKey: string }) {
  previewData.seen.add(featureKey);
  return success(null);
}
