/** A meeting stays listed for a day after it happens, so its result is visible. */
export const MEETING_VISIBILITY_MS = 24 * 60 * 60 * 1000;

/**
 * Oldest meeting date still worth showing. Taking `now` as an argument keeps
 * the clock read out of the server components that render the listings.
 */
export function recentMeetingCutoff(now: number = Date.now()): Date {
    return new Date(now - MEETING_VISIBILITY_MS);
}
