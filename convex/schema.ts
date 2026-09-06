import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    // admin = runs the school (Cassandra + dev); teacher = instructor scoped to
    // their cohorts; student = learner. See convex/lib/roles.ts.
    role: v.union(v.literal("admin"), v.literal("teacher"), v.literal("student")),
    createdAt: v.number(),
    xp: v.optional(v.number()),
    streak: v.optional(v.number()),
    lastActivityDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("dropped"))),
    droppedReason: v.optional(v.string()),
    droppedAt: v.optional(v.number()),
    droppedBy: v.optional(v.id("users")),
    // Email a copy of in-app notifications. Undefined = on.
    notifyByEmail: v.optional(v.boolean()),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // In-app notifications (bell in the navbar + /notifications). One row per
  // recipient so read state is per user. `dedupeKey` prevents the daily
  // due-soon cron from nagging twice about the same assignment.
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("assignment_posted"),
      v.literal("assignment_due_soon"),
      v.literal("submission_graded"),
      v.literal("submission_received"),
      v.literal("video_posted"),
      v.literal("calendar_event"),
      v.literal("announcement"),
    ),
    title: v.string(),
    body: v.optional(v.string()),
    href: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
    dedupeKey: v.optional(v.string()),
    actorId: v.optional(v.id("users")),
    emailedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_user_read", ["userId", "isRead"])
    .index("by_user_dedupe", ["userId", "dedupeKey"]),

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
    // Cohort the invitee joins the moment they finish signing up.
    cohortId: v.optional(v.id("cohorts")),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_cohort", ["cohortId"]),

  // A cohort is one run of the program: a named group of students with
  // assigned instructors, a start/end date, and a weekly schedule. Content
  // rows carry an optional cohortId; undefined means school-wide.
  cohorts: defineTable({
    name: v.string(),               // "Cohort 4", "Fall 2026 Evening"
    code: v.optional(v.string()),   // short tag shown on badges, e.g. "C4"
    description: v.optional(v.string()),
    startDate: v.string(),          // "YYYY-MM-DD"
    endDate: v.optional(v.string()),// "YYYY-MM-DD"
    schedule: v.optional(v.string()),   // "Tue & Thu · 6–8pm ET"
    meetingUrl: v.optional(v.string()),
    color: v.string(),
    status: v.union(
      v.literal("upcoming"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("archived"),
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_start", ["startDate"]),

  cohortMembers: defineTable({
    cohortId: v.id("cohorts"),
    userId: v.id("users"),
    role: v.union(v.literal("student"), v.literal("teacher")),
    addedBy: v.id("users"),
    addedAt: v.number(),
  })
    .index("by_cohort", ["cohortId"])
    .index("by_user", ["userId"])
    .index("by_cohort_role", ["cohortId", "role"])
    .index("by_cohort_user", ["cohortId", "userId"]),

  // Who was released from a cohort and why. The membership row is deleted;
  // this is the lasting record (the "reason for release").
  cohortDepartures: defineTable({
    cohortId: v.id("cohorts"),
    userId: v.id("users"),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("student"), v.literal("teacher")),
    reason: v.string(),
    removedBy: v.id("users"),
    removedAt: v.number(),
  })
    .index("by_cohort", ["cohortId", "removedAt"])
    .index("by_user", ["userId"]),

  // Posts from instructors to a cohort (or school-wide when cohortId is unset).
  announcements: defineTable({
    cohortId: v.optional(v.id("cohorts")),
    title: v.string(),
    body: v.string(),
    pinned: v.optional(v.boolean()),
    authorId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_cohort", ["cohortId", "createdAt"])
    .index("by_created", ["createdAt"]),

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
    cohortId: v.optional(v.id("cohorts")), // undefined = school-wide
  })
    .index("by_date", ["date"])
    .index("by_cohort", ["cohortId"]),

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
    cohortId: v.optional(v.id("cohorts")),
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
    // When true, students submit text/file work for teacher grading.
    // When false/undefined, status is inferred from track lesson attempts (legacy).
    requiresSubmission: v.optional(v.boolean()),
    allowFileUpload: v.optional(v.boolean()),
    cohortId: v.optional(v.id("cohorts")), // undefined = every cohort
  })
    .index("by_created_by", ["createdBy"])
    .index("by_title", ["title"])
    .index("by_due_date", ["dueDate"])
    .index("by_cohort", ["cohortId"]),

  assignmentSubmissions: defineTable({
    assignmentId: v.id("assignments"),
    studentId: v.id("users"),
    textContent: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    submittedAt: v.number(),
    status: v.union(
      v.literal("submitted"),
      v.literal("graded"),
      v.literal("returned"),
    ),
    grade: v.optional(v.number()), // 0–100
    feedback: v.optional(v.string()),
    gradedBy: v.optional(v.id("users")),
    gradedAt: v.optional(v.number()),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentId"])
    .index("by_assignment_student", ["assignmentId", "studentId"]),

  // Stark chatbot: saved conversations
  starkConversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    mode: v.optional(v.union(v.literal("default"), v.literal("coach"))),
    careerTrack: v.optional(v.string()),
    jobLevel: v.optional(v.string()),
    activeResumeVersionId: v.optional(v.id("resumeVersions")),
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

  // Stark Coach Mode: resume versions + structured reviews
  resumeVersions: defineTable({
    userId: v.id("users"),
    conversationId: v.id("starkConversations"),
    versionNumber: v.number(),
    rawText: v.string(),
    parsedJson: v.string(), // JSON.stringify(ParsedResume)
    careerTrack: v.string(),
    jobLevel: v.optional(v.string()),
    jobDescription: v.optional(v.string()),
    fileKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user_created", ["userId", "createdAt"]),

  resumeReviews: defineTable({
    userId: v.id("users"),
    conversationId: v.id("starkConversations"),
    versionId: v.id("resumeVersions"),
    rubricVersion: v.string(),
    careerTrack: v.string(),
    jobLevel: v.optional(v.string()),
    overallScore: v.number(),
    strengthLabel: v.string(),
    readinessLabel: v.string(),
    positioningSummary: v.optional(v.string()),
    categoryScoresJson: v.string(),
    milestonesJson: v.string(),
    feedbackMarkdown: v.string(),
    jdMatchJson: v.optional(v.string()),
    redFlagsJson: v.optional(v.string()),
    keepAsIsJson: v.optional(v.string()),
    competenciesJson: v.optional(v.string()),
    scoreChangeSummary: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_version", ["versionId"])
    .index("by_conversation", ["conversationId"])
    .index("by_user_created", ["userId", "createdAt"]),

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
    cohortId: v.optional(v.id("cohorts")), // undefined = every cohort
  })
    .index("by_recorded_date", ["recordedDate"])
    .index("by_created_at", ["createdAt"])
    .index("by_cohort", ["cohortId"]),
});
