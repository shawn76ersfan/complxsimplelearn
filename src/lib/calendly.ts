/** Cassandra's 1:1 booking page. Swap the env var when her real Calendly is ready. */
export const CASSANDRA_CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL?.trim() || "https://calendly.com";
