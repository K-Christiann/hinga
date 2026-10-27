import type { Notification } from "../domain/models";

export function notificationPresentation(item: Notification) {
  if (item.kind === "moderation") return { label: "There is an update on your shared submission.", path: "/activity?view=submissions" };
  if (item.kind === "report") return { label: "A concern you raised has a review update.", path: "/activity?view=reports" };
  if (item.kind === "appeal") return { label: "Your request for another review has an update.", path: "/activity?view=appeals" };
  return { label: "Someone replied to your shared thought.", path: `/thoughts?thread=${encodeURIComponent(item.postId)}` };
}
