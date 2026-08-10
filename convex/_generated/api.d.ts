/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_auth from "../_lib/auth.js";
import type * as assignments from "../assignments.js";
import type * as attempts from "../attempts.js";
import type * as calendar from "../calendar.js";
import type * as chat from "../chat.js";
import type * as conversations from "../conversations.js";
import type * as curriculum from "../curriculum.js";
import type * as email from "../email.js";
import type * as emailMutations from "../emailMutations.js";
import type * as embeddings from "../embeddings.js";
import type * as feedback from "../feedback.js";
import type * as infoSessionActions from "../infoSessionActions.js";
import type * as infoSessions from "../infoSessions.js";
import type * as init from "../init.js";
import type * as knowledge from "../knowledge.js";
import type * as lessons from "../lessons.js";
import type * as quotes from "../quotes.js";
import type * as seed from "../seed.js";
import type * as tracks from "../tracks.js";
import type * as users from "../users.js";
import type * as videos from "../videos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/auth": typeof _lib_auth;
  assignments: typeof assignments;
  attempts: typeof attempts;
  calendar: typeof calendar;
  chat: typeof chat;
  conversations: typeof conversations;
  curriculum: typeof curriculum;
  email: typeof email;
  emailMutations: typeof emailMutations;
  embeddings: typeof embeddings;
  feedback: typeof feedback;
  infoSessionActions: typeof infoSessionActions;
  infoSessions: typeof infoSessions;
  init: typeof init;
  knowledge: typeof knowledge;
  lessons: typeof lessons;
  quotes: typeof quotes;
  seed: typeof seed;
  tracks: typeof tracks;
  users: typeof users;
  videos: typeof videos;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
