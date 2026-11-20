"use server";

import { previewData, success } from "../mock-data";

export async function getNotificationSettings() {
  return previewData.settings;
}

export async function updateNotificationPreferences(changes: Partial<Omit<typeof previewData.settings, "email">>) {
  Object.assign(previewData.settings, changes);
  return success(null);
}

export async function linkPreviewEmail() {
  previewData.settings.email = "camille@example.test";
  return success({ email: previewData.settings.email });
}

export async function unlinkEmail() {
  previewData.settings.email = null;
  return success(null);
}
