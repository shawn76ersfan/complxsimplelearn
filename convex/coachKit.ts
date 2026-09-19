import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getCurrentUser } from "./_lib/auth";
import { requireActiveProfile } from "./lib/actionAuth";
import { chatComplete, tryExtractJsonObject } from "./lib/llmChat";
import { classifyStarkHelp } from "./lib/starkTopics";

const rewriteStep = v.object({
  title: v.string(),
  why: v.string(),
  action: v.string(),
});

const interviewQ = v.object({
  question: v.string(),
  why: v.string(),
  talkingPoint: v.string(),
});

const portfolioItem = v.object({
  title: v.string(),
  skills: v.array(v.string()),
  howToShow: v.string(),
});

const kitValidator = v.object({
  rewritePlan: v.array(rewriteStep),
  interview: v.array(interviewQ),
  portfolio: v.array(portfolioItem),
  createdAt: v.number(),
});

export const getCareerKit = query({
  args: { conversationId: v.id("starkConversations") },
  returns: v.union(kitValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) return null;
    const rows = await ctx.db
      .query("coachPlans")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    rows.sort((a, b) => b.createdAt - a.createdAt);
    const latest = rows[0];
    if (!latest) return null;
    try {
      return {
        rewritePlan: JSON.parse(latest.rewritePlanJson) as Array<{
          title: string;
          why: string;
          action: string;
        }>,
        interview: JSON.parse(latest.interviewJson) as Array<{
          question: string;
          why: string;
          talkingPoint: string;
        }>,
        portfolio: JSON.parse(latest.portfolioJson) as Array<{
          title: string;
          skills: string[];
          howToShow: string;
        }>,
        createdAt: latest.createdAt,
      };
    } catch {
      return null;
    }
  },
});

export const saveCareerKit = mutation({
  args: {
    conversationId: v.id("starkConversations"),
    versionId: v.id("resumeVersions"),
    rewritePlanJson: v.string(),
    interviewJson: v.string(),
    portfolioJson: v.string(),
  },
  returns: v.id("coachPlans"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const convo = await ctx.db.get(args.conversationId);
    if (!convo || convo.userId !== user._id) throw new Error("Not found");
    const version = await ctx.db.get(args.versionId);
    if (!version || version.userId !== user._id) throw new Error("Resume version not found");
    return await ctx.db.insert("coachPlans", {
      userId: user._id,
      conversationId: args.conversationId,
      versionId: args.versionId,
      rewritePlanJson: args.rewritePlanJson,
      interviewJson: args.interviewJson,
      portfolioJson: args.portfolioJson,
      createdAt: Date.now(),
    });
  },
});

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string").slice(0, 8);
}

function asSteps(value: unknown): Array<{ title: string; why: string; action: string }> {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.title !== "string" || typeof r.why !== "string" || typeof r.action !== "string") {
      continue;
    }
    out.push({ title: r.title.slice(0, 120), why: r.why.slice(0, 400), action: r.action.slice(0, 400) });
    if (out.length >= 6) break;
  }
  return out;
}

function asInterview(value: unknown): Array<{ question: string; why: string; talkingPoint: string }> {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.question !== "string" ||
      typeof r.why !== "string" ||
      typeof r.talkingPoint !== "string"
    ) {
      continue;
    }
    out.push({
      question: r.question.slice(0, 240),
      why: r.why.slice(0, 400),
      talkingPoint: r.talkingPoint.slice(0, 400),
    });
    if (out.length >= 6) break;
  }
  return out;
}

function asPortfolio(value: unknown): Array<{ title: string; skills: string[]; howToShow: string }> {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.title !== "string" || typeof r.howToShow !== "string") continue;
    out.push({
      title: r.title.slice(0, 120),
      skills: asStringArray(r.skills).slice(0, 6),
      howToShow: r.howToShow.slice(0, 400),
    });
    if (out.length >= 5) break;
  }
  return out;
}

/** Build rewrite plan, interview questions, and portfolio map from the scored resume. */
export const generateCareerKit = action({
  args: { conversationId: v.id("starkConversations") },
  returns: kitValidator,
  handler: async (ctx, args) => {
    const profile = await requireActiveProfile(ctx);
    const progress = await ctx.runQuery(api.resumeCoach.getProgress, {
      conversationId: args.conversationId,
    });
    if (!progress?.activeVersionId) {
      throw new Error("Score a resume first, then generate the career kit.");
    }
    const version = await ctx.runQuery(api.resumeCoach.getVersion, {
      versionId: progress.activeVersionId,
    });
    if (!version) throw new Error("Active resume version not found");

    const latest = progress.latestReview as {
      overallScore?: number;
      readinessLabel?: string;
      milestones?: Array<{ title: string; why?: string }>;
      jdMatch?: { missingRequired?: string[]; roleTitle?: string } | null;
    } | null;

    const system = `You are Stark Coach for ComplxSimple. Return ONLY JSON with this shape:
{
  "rewritePlan": [{ "title": string, "why": string, "action": string }],
  "interview": [{ "question": string, "why": string, "talkingPoint": string }],
  "portfolio": [{ "title": string, "skills": string[], "howToShow": string }]
}
Rules:
- 4-6 rewritePlan steps that the student can do this week. Never invent jobs, metrics, or certs.
- 5 interview questions a hiring manager would actually ask for this track/level, with a talking point grounded in THEIR resume.
- 3-5 portfolio/project ideas they can honestly build from current skills or ComplxSimple labs.
- If a JD was provided, tailor interview + rewrite steps to the missing keywords they can truthfully earn.`;

    const userPayload = {
      careerTrack: version.careerTrack,
      jobLevel: version.jobLevel,
      score: latest?.overallScore,
      readiness: latest?.readinessLabel,
      milestones: latest?.milestones?.slice(0, 5),
      jdRole: latest?.jdMatch?.roleTitle ?? null,
      missingKeywords: latest?.jdMatch?.missingRequired?.slice(0, 12) ?? [],
      resume: String(version.rawText).slice(0, 8000),
    };

    let rewritePlan = asSteps(latest?.milestones?.map((m) => ({
      title: m.title,
      why: m.why ?? "This is holding the score back.",
      action: "Use Fix this, then rewrite the affected bullets with real evidence.",
    })));
    let interview: Array<{ question: string; why: string; talkingPoint: string }> = [];
    let portfolio: Array<{ title: string; skills: string[]; howToShow: string }> = [];

    try {
      const reply = await chatComplete(
        [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        { maxTokens: 1600, temperature: 0.3, preferOpenAI: true },
      );
      const obj = tryExtractJsonObject(reply) as Record<string, unknown> | null;
      if (obj) {
        const parsedPlan = asSteps(obj.rewritePlan);
        if (parsedPlan.length) rewritePlan = parsedPlan;
        interview = asInterview(obj.interview);
        portfolio = asPortfolio(obj.portfolio);
      }
    } catch (err) {
      console.warn("generateCareerKit LLM failed", err);
    }

    if (interview.length === 0) {
      interview = [
        {
          question: "Walk me through a system you built or operated.",
          why: "Shows ownership at your target level.",
          talkingPoint: "Pick one resume bullet and tell the problem, what you did, and the result.",
        },
        {
          question: "What would you do if a deploy failed in production?",
          why: "DevOps interviews test incident thinking.",
          talkingPoint: "Describe rollback, logs, and how you would communicate.",
        },
      ];
    }
    if (portfolio.length === 0) {
      portfolio = [
        {
          title: "Documented home lab",
          skills: ["Linux", "Git", "Docker"],
          howToShow: "A GitHub repo with README, diagrams, and what you learned — no fake metrics.",
        },
      ];
    }

    await ctx.runMutation(api.coachKit.saveCareerKit, {
      conversationId: args.conversationId,
      versionId: progress.activeVersionId,
      rewritePlanJson: JSON.stringify(rewritePlan),
      interviewJson: JSON.stringify(interview),
      portfolioJson: JSON.stringify(portfolio),
    });

    const classified = classifyStarkHelp("career kit interview portfolio rewrite", false);
    await ctx.runMutation(internal.analytics.logEvent, {
      userId: profile._id,
      conversationId: args.conversationId,
      mode: "coach",
      kind: classified.kind,
      topic: "Career kit",
      createdAt: Date.now(),
    });

    return {
      rewritePlan,
      interview,
      portfolio,
      createdAt: Date.now(),
    };
  },
});
