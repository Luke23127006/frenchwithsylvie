"use server";

import { previewData, success } from "../mock-data";

export async function getNotifications(_input: object) {
  return success(previewData.notifications);
}

export async function markAsRead({ notificationId }: { notificationId: string }) {
  const notification = previewData.notifications.find(({ id }) => id === notificationId);
  if (notification) notification.is_read = true;
  return success(null);
}

export async function markAllAsRead(_input: object) {
  for (const notification of previewData.notifications) notification.is_read = true;
  return success(null);
}
