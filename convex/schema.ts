import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.union(v.literal("teacher"), v.literal("student")),
    createdAt: v.number(),
    xp: v.optional(v.number()),
    streak: v.optional(v.number()),
    lastActivityDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("dropped"))),
    droppedReason: v.optional(v.string()),
    droppedAt: v.optional(v.number()),
    droppedBy: v.optional(v.id("users")),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  enrollments: defineTable({
    email: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher")),
    status: v.union(
      v.literal("invited"),
      v.literal("accepted"),
      v.literal("revoked"),
    ),
    invitedBy: v.id("users"),
    invitedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    clerkInvitationId: v.optional(v.string()),
    displayName: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  tracks: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    color: v.string(),
    icon: v.string(),
    order: v.number(),
    published: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published"]),

  lessons: defineTable({
    trackId: v.id("tracks"),
    title: v.string(),
    content: v.string(),
    type: v.union(v.literal("content"), v.literal("quiz"), v.literal("game"), v.literal("mandatory")),
    order: v.number(),
    published: v.boolean(),
  })
    .index("by_track", ["trackId"])
    .index("by_track_published", ["trackId", "published"])
    .index("by_published", ["published"]),

  quizQuestions: defineTable({
    lessonId: v.id("lessons"),
    question: v.string(),
    options: v.array(v.string()),
    correctIndex: v.number(),
    explanation: v.optional(v.string()),
    order: v.number(),
  }).index("by_lesson", ["lessonId"]),

  // RAG: embedded chunks of course content for Stark's vector search
  lessonEmbeddings: defineTable({
    lessonId: v.optional(v.id("lessons")),
    trackId: v.optional(v.id("tracks")),
    source: v.string(),       // "lesson" | "track" | "assignment" | "faq" | "knowledge"
    title: v.string(),        // human-readable label for the chunk
    chunkText: v.string(),    // the text that was embedded
    embedding: v.array(v.float64()),
  })
    .index("by_lesson", ["lessonId"])
    .index("by_source", ["source"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1024,       // jina-embeddings-v3
    }),

  attempts: defineTable({
    userId: v.id("users"),
    lessonId: v.id("lessons"),
    trackId: v.id("tracks"),
    score: v.number(),
    maxScore: v.number(),
    answers: v.optional(v.array(v.number())),
    completedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_user_track", ["userId", "trackId"]),

  calendarEvents: defineTable({
    date: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    createdBy: v.id("users"),
  }).index("by_date", ["date"]),

  infoSessions: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    timezone: v.string(),
    meetingUrl: v.optional(v.string()),
    published: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_start", ["startsAt"])
    .index("by_published_start", ["published", "startsAt"]),

  infoSessionRegistrations: defineTable({
    sessionId: v.id("infoSessions"),
    name: v.string(),
    email: v.string(),
    normalizedEmail: v.string(),
    status: v.union(v.literal("active"), v.literal("cancelled")),
    consentedAt: v.number(),
    registeredAt: v.number(),
    reminderScheduledAt: v.optional(v.number()),
    confirmationSentAt: v.optional(v.number()),
    reminderSentAt: v.optional(v.number()),
  })
    .index("by_session", ["sessionId"])
    .index("by_session_email", ["sessionId", "normalizedEmail"])
    .index("by_normalized_email", ["normalizedEmail", "registeredAt"]),

  emailLogs: defineTable({
    subject: v.string(),
    body: v.string(),
    recipientIds: v.array(v.id("users")),
    sentBy: v.id("users"),
    sentAt: v.number(),
    recipientCount: v.number(),
  }).index("by_sent_at", ["sentAt"]),

  feedback: defineTable({
    studentId: v.id("users"),
    teacherId: v.id("users"),
    message: v.string(),
    trackId: v.optional(v.id("tracks")),
    lessonId: v.optional(v.id("lessons")),
    isRead: v.boolean(),
    createdAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
    type: v.optional(v.union(
      v.literal("feedback"),
      v.literal("warning"),
      v.literal("notice"),
    )),
  })
    .index("by_student", ["studentId"])
    .index("by_student_unread", ["studentId", "isRead"]),

  quoteOfWeek: defineTable({
    text: v.string(),
    author: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }),

  assignments: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    trackId: v.optional(v.id("tracks")),
    dueDate: v.number(),
    createdBy: v.id("users"),
    assignedToAll: v.boolean(),
  })
    .index("by_created_by", ["createdBy"])
    .index("by_title", ["title"])
    .index("by_due_date", ["dueDate"]),

  // Stark chatbot: saved conversations
  starkConversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  starkMessages: defineTable({
    conversationId: v.id("starkConversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  // Teacher-editable knowledge that gets embedded into Stark's RAG index
  knowledgeDocs: defineTable({
    title: v.string(),
    content: v.string(),
    category: v.optional(v.string()),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_updated", ["updatedAt"]),

  // Recorded class videos (e.g. Zoom recordings) teachers upload for students.
  // Files live in Cloudflare R2 (via @convex-dev/r2); we store the object key.
  videos: defineTable({
    title: v.string(),
    recordedDate: v.string(),          // "YYYY-MM-DD" — the date the class happened
    description: v.optional(v.string()),
    key: v.string(),                   // R2 object key returned by the upload hook
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    uploadedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_recorded_date", ["recordedDate"])
    .index("by_created_at", ["createdAt"]),
});
