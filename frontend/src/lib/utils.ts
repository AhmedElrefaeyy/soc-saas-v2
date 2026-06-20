import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now  = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then; // positive = past, negative = future

  // Future date (e.g. invitation expiry)
  if (diff < 0) {
    const abs     = Math.abs(diff);
    const seconds = Math.floor(abs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours   = Math.floor(minutes / 60);
    const days    = Math.floor(hours / 24);
    if (seconds < 60)  return "in a moment";
    if (minutes < 60)  return `in ${minutes}m`;
    if (hours < 24)    return `in ${hours}h`;
    if (days < 7)      return `in ${days}d`;
    return formatDate(date);
  }

  // Past date
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24)   return `${hours}h ago`;
  if (days < 7)     return `${days}d ago`;
  return formatDate(date);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

export function extractApiError(error: unknown): string {
  // ApiError (thrown by apiPost/apiGet when the server returns error in body)
  if (error instanceof Error && error.name === "ApiError") return error.message;

  // AxiosError — server returned 4xx/5xx; try to read the structured error body
  if (
    error != null &&
    typeof error === "object" &&
    "response" in error &&
    error.response != null &&
    typeof error.response === "object" &&
    "data" in error.response
  ) {
    const data = (error.response as { data: unknown }).data;
    if (data != null && typeof data === "object" && "error" in data) {
      const apiErr = (data as { error: unknown }).error;
      if (apiErr != null && typeof apiErr === "object" && "message" in apiErr) {
        const msg = (apiErr as { message: unknown }).message;
        if (typeof msg === "string" && msg.length > 0) return msg;
      }
    }
  }

  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}
