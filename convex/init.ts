import { mutation } from "./_generated/server";

/**
 * Seeds all tracks and lessons if the database is empty.
 * Called automatically from the auth layout on first load.
 * Completely safe to call multiple times — exits immediately if data exists.
 */
export const ensureSeeded = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("tracks").first();
    if (existing) return;

    const [hwId, aiId, csId, htmlId] = await Promise.all([
      ctx.db.insert("tracks", { name: "Hardware Fundamentals", slug: "hardware", description: "Learn about PC components, how they work, and how they connect.", color: "#F97316", icon: "cpu", order: 1, published: true }),
      ctx.db.insert("tracks", { name: "AI Fundamentals", slug: "ai", description: "Explore artificial intelligence, machine learning, and neural networks.", color: "#6366F1", icon: "brain", order: 2, published: true }),
      ctx.db.insert("tracks", { name: "Cybersecurity Basics", slug: "cybersecurity", description: "Understand threats, attacks, and how to stay safe online.", color: "#EC4899", icon: "shield", order: 3, published: true }),
      ctx.db.insert("tracks", { name: "HTML Fundamentals", slug: "html", description: "Build your first web pages with HTML tags and structure.", color: "#06B6D4", icon: "code", order: 4, published: true }),
    ]);

    // ── Hardware lessons ──────────────────────────────────────────────────────
    const hw1 = await ctx.db.insert("lessons", { trackId: hwId, title: "Introduction to PC Components", type: "content", order: 1, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "What Makes a Computer?" }, { type: "paragraph", content: "A personal computer (PC) is made up of several key components that work together. Each part has a specific job — understanding them helps you troubleshoot, upgrade, and make smart buying decisions." }, { type: "heading", content: "Core Components" }, { type: "list", content: "CPU (Central Processing Unit) — the 'brain' of the computer\nGPU (Graphics Processing Unit) — handles visual output\nRAM (Random Access Memory) — short-term memory for running programs\nStorage (SSD/HDD) — long-term memory for saving files\nMotherboard — the main circuit board connecting everything\nPSU (Power Supply Unit) — provides power to all components\nCooling — keeps components from overheating" }, { type: "paragraph", content: "In the next lessons, we'll dive deeper into each component. When you're ready, try the interactive PC parts game!" }] }) });
    const hw2 = await ctx.db.insert("lessons", { trackId: hwId, title: "The CPU: Brain of Your Computer", type: "quiz", order: 2, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "Understanding the CPU" }, { type: "paragraph", content: "The CPU (Central Processing Unit) executes instructions and performs calculations. Modern CPUs have multiple cores, allowing them to handle many tasks simultaneously." }, { type: "list", content: "Clock Speed — how many cycles per second (e.g. 3.5 GHz)\nCores — independent processing units within one CPU\nCache — ultra-fast memory built into the CPU (L1, L2, L3)\nTDP — Thermal Design Power; how much heat it generates" }] }) });
    const hw3 = await ctx.db.insert("lessons", { trackId: hwId, title: "PC Parts Interactive Game", type: "game", order: 3, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "PC Parts Challenge" }, { type: "paragraph", content: "Drag each label to the correct component on the diagram. Get them all right to complete this lesson!" }] }) });

    await Promise.all([
      ctx.db.insert("quizQuestions", { lessonId: hw2, question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Power Unit", "Core Processing Utility", "Central Program Unit"], correctIndex: 0, explanation: "CPU stands for Central Processing Unit — the main processor that executes instructions.", order: 1 }),
      ctx.db.insert("quizQuestions", { lessonId: hw2, question: "What is 'clock speed' measured in?", options: ["Watts", "GHz (Gigahertz)", "GB (Gigabytes)", "MHz per core"], correctIndex: 1, explanation: "Clock speed is measured in GHz (Gigahertz), representing billions of cycles per second.", order: 2 }),
      ctx.db.insert("quizQuestions", { lessonId: hw2, question: "More CPU cores generally means...", options: ["Slower performance", "Better multitasking ability", "More storage space", "Higher screen resolution"], correctIndex: 1, explanation: "More cores allow the CPU to handle more tasks simultaneously, improving multitasking.", order: 3 }),
    ]);

    // ── AI lessons ────────────────────────────────────────────────────────────
    const ai1 = await ctx.db.insert("lessons", { trackId: aiId, title: "What is Artificial Intelligence?", type: "content", order: 1, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "Artificial Intelligence 101" }, { type: "paragraph", content: "AI refers to systems that simulate human intelligence — learning, reasoning, problem-solving, and understanding language. AI is already part of your daily life: Netflix recommendations, voice assistants, spam filters, and autocomplete." }, { type: "list", content: "Narrow AI — designed for one specific task (e.g. image recognition)\nGeneral AI — hypothetical AI with human-like reasoning (doesn't exist yet)\nMachine Learning — AI that learns from data without explicit programming\nDeep Learning — ML using neural networks with many layers" }] }) });
    const ai2 = await ctx.db.insert("lessons", { trackId: aiId, title: "Machine Learning Basics", type: "quiz", order: 2, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "How Does Machine Learning Work?" }, { type: "paragraph", content: "Machine Learning (ML) trains algorithms on data so they can make predictions or decisions without being explicitly programmed." }, { type: "list", content: "Supervised Learning — learns from labeled data (input → correct output)\nUnsupervised Learning — finds patterns in unlabeled data\nReinforcement Learning — learns by trial and error, rewarded for correct actions" }] }) });

    await Promise.all([
      ctx.db.insert("quizQuestions", { lessonId: ai2, question: "What is Machine Learning?", options: ["Programming computers with explicit rules", "AI that learns patterns from data", "A type of computer hardware", "A programming language"], correctIndex: 1, explanation: "ML allows AI to learn from data rather than following hardcoded rules.", order: 1 }),
      ctx.db.insert("quizQuestions", { lessonId: ai2, question: "In supervised learning, training data is...", options: ["Unlabeled", "Labeled with correct answers", "Random noise", "Collected from social media only"], correctIndex: 1, explanation: "Supervised learning uses labeled data where each input has a known correct output.", order: 2 }),
      ctx.db.insert("quizQuestions", { lessonId: ai2, question: "Which ML type learns through trial and error with rewards?", options: ["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Transfer Learning"], correctIndex: 2, explanation: "Reinforcement Learning agents learn by receiving rewards for correct actions.", order: 3 }),
    ]);

    // ── Cybersecurity lessons ─────────────────────────────────────────────────
    const cs1 = await ctx.db.insert("lessons", { trackId: csId, title: "Introduction to Cybersecurity", type: "content", order: 1, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "Why Cybersecurity Matters" }, { type: "paragraph", content: "Cybersecurity is the practice of protecting computers, networks, and data from unauthorized access or attacks. With billions of devices online, this is a critical skill for everyone." }, { type: "heading", content: "The CIA Triad" }, { type: "list", content: "Confidentiality — keeping data private and accessible only to authorized users\nIntegrity — ensuring data is accurate and hasn't been tampered with\nAvailability — making sure systems are accessible when needed" }] }) });
    const cs2 = await ctx.db.insert("lessons", { trackId: csId, title: "Common Cyber Threats", type: "quiz", order: 2, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "Know Your Threats" }, { type: "paragraph", content: "Attackers use various techniques to compromise systems. Knowing these threats is the first step to defending against them." }, { type: "list", content: "Phishing — fake emails/sites tricking you into revealing credentials\nMalware — malicious software (viruses, ransomware, spyware)\nDDoS — flooding a server with traffic to take it offline\nSQL Injection — inserting malicious code into database queries" }] }) });

    await Promise.all([
      ctx.db.insert("quizQuestions", { lessonId: cs2, question: "What is phishing?", options: ["A fishing technique", "Fake messages tricking users into revealing credentials", "A type of encryption", "Network monitoring software"], correctIndex: 1, explanation: "Phishing uses deceptive emails or websites to steal credentials or personal information.", order: 1 }),
      ctx.db.insert("quizQuestions", { lessonId: cs2, question: "What does DDoS stand for?", options: ["Direct Data Over Security", "Distributed Denial of Service", "Dynamic Domain of Systems", "Digital Defense Operations"], correctIndex: 1, explanation: "DDoS overwhelms a server with traffic to make it unavailable.", order: 2 }),
      ctx.db.insert("quizQuestions", { lessonId: cs2, question: "SQL Injection attacks target...", options: ["Network cables", "Database queries", "User passwords only", "Browser extensions"], correctIndex: 1, explanation: "SQL Injection inserts malicious SQL into database queries to manipulate or steal data.", order: 3 }),
    ]);

    // ── HTML lessons ──────────────────────────────────────────────────────────
    const html1 = await ctx.db.insert("lessons", { trackId: htmlId, title: "What is HTML?", type: "content", order: 1, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "HTML: The Language of the Web" }, { type: "paragraph", content: "HTML (HyperText Markup Language) is the standard language for creating web pages. It uses tags to define the structure and content of a page. Every website you visit is built with HTML at its core." }, { type: "heading", content: "Basic HTML Structure" }, { type: "code", content: "<!DOCTYPE html>\n<html>\n  <head>\n    <title>My First Page</title>\n  </head>\n  <body>\n    <h1>Hello, World!</h1>\n    <p>This is a paragraph.</p>\n  </body>\n</html>" }, { type: "paragraph", content: "The DOCTYPE declaration tells the browser this is HTML5. The <html> tag wraps everything. <head> contains metadata. <body> contains what's visible on the page." }] }) });
    const html2 = await ctx.db.insert("lessons", { trackId: htmlId, title: "HTML Tags and Elements", type: "quiz", order: 2, published: true, content: JSON.stringify({ blocks: [{ type: "heading", content: "Common HTML Tags" }, { type: "paragraph", content: "HTML elements are defined by opening tags (<tag>) and closing tags (</tag>). Some are self-closing like <img> and <br>." }, { type: "list", content: "<h1> to <h6> — headings (h1 is largest)\n<p> — paragraph\n<a href='...'> — hyperlink\n<img src='...'> — image\n<ul> / <ol> — unordered / ordered list\n<li> — list item\n<div> — container block\n<span> — inline container" }] }) });

    await Promise.all([
      ctx.db.insert("quizQuestions", { lessonId: html2, question: "Which tag creates the largest heading?", options: ["<h6>", "<heading>", "<h1>", "<title>"], correctIndex: 2, explanation: "<h1> is the largest heading. Headings go from <h1> (largest) to <h6> (smallest).", order: 1 }),
      ctx.db.insert("quizQuestions", { lessonId: html2, question: "What does the <a> tag create?", options: ["An image", "A heading", "A hyperlink", "A list"], correctIndex: 2, explanation: "The <a> (anchor) tag creates hyperlinks. Use href='url' to specify the destination.", order: 2 }),
      ctx.db.insert("quizQuestions", { lessonId: html2, question: "Which tag is used for an unordered (bullet) list?", options: ["<ol>", "<ul>", "<list>", "<bl>"], correctIndex: 1, explanation: "<ul> creates an unordered list with bullet points. <ol> creates a numbered list.", order: 3 }),
    ]);

    // ── Bonus interactive lessons (showcasing new block types) ────────────────

    // Hardware: Flashcard + Match lesson
    await ctx.db.insert("lessons", { trackId: hwId, title: "PC Parts: Flashcards & Matching", type: "content", order: 4, published: true, content: JSON.stringify({ blocks: [
      { type: "heading", content: "Review: Key PC Components" },
      { type: "paragraph", content: "Flip each card to reveal the definition, then test yourself with the matching activity below." },
      { type: "flashcard", front: "CPU", back: "Central Processing Unit — the main processor that executes all instructions. Speed measured in GHz." },
      { type: "flashcard", front: "RAM", back: "Random Access Memory — short-term, fast memory used while programs are running. Measured in GB." },
      { type: "flashcard", front: "SSD", back: "Solid State Drive — permanent storage with no moving parts. Much faster than traditional HDDs." },
      { type: "flashcard", front: "GPU", back: "Graphics Processing Unit — handles all visual rendering. Essential for gaming and video editing." },
      { type: "heading", content: "Now match them up!" },
      { type: "match", pairs: [
        { term: "CPU",  definition: "Executes instructions — the brain of the PC" },
        { term: "RAM",  definition: "Temporary fast memory for running programs" },
        { term: "GPU",  definition: "Renders graphics and visual output" },
        { term: "SSD",  definition: "Permanent storage with no moving parts" },
        { term: "PSU",  definition: "Converts AC power and supplies the whole system" },
      ]},
    ]}) });

    // HTML: Fill-in-the-blank + Playground lesson
    await ctx.db.insert("lessons", { trackId: htmlId, title: "Write Your First HTML", type: "content", order: 3, published: true, content: JSON.stringify({ blocks: [
      { type: "heading", content: "Fill in the Blanks" },
      { type: "paragraph", content: "Test your HTML tag knowledge before building your own page." },
      { type: "fillblank", prompt: "To create a paragraph in HTML, use the ___ tag.", accepted: [["<p>", "p", "p tag"]] },
      { type: "fillblank", prompt: "The ___ tag creates the largest heading on the page.", accepted: [["<h1>", "h1"]] },
      { type: "fillblank", prompt: "To add a link, use the ___ tag with the href attribute.", accepted: [["<a>", "a"]] },
      { type: "heading", content: "Build It Yourself" },
      { type: "paragraph", content: "Edit the HTML below and click Preview to see your page." },
      { type: "playground", language: "html", code: "<!DOCTYPE html>\n<html>\n  <head>\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Hello, World!</h1>\n    <p>Edit me and click Preview!</p>\n    <a href=\"https://example.com\">A link</a>\n  </body>\n</html>" },
    ]}) });

    // AI: Inline quiz blocks mixed with content
    await ctx.db.insert("lessons", { trackId: aiId, title: "AI Concepts: Check Your Understanding", type: "content", order: 3, published: true, content: JSON.stringify({ blocks: [
      { type: "heading", content: "Quick Knowledge Check" },
      { type: "paragraph", content: "Answer each question as you read — these are embedded directly in the lesson." },
      { type: "quiz", question: "Which type of AI is designed for just ONE specific task?", options: ["General AI", "Narrow AI", "Reinforcement AI", "Deep AI"], correctIndex: 1, explanation: "Narrow AI (also called Weak AI) is built for a single task, like image recognition or spam filtering." },
      { type: "paragraph", content: "AI that learns by trying things out and receiving rewards is called Reinforcement Learning. Think of it like training a dog — reward good behavior, and the model repeats it." },
      { type: "quiz", question: "What does a Reinforcement Learning agent maximize?", options: ["Data volume", "Cumulative reward", "Model size", "Training speed"], correctIndex: 1, explanation: "RL agents are trained to maximize cumulative reward over time through trial and error." },
      { type: "fillblank", prompt: "Machine Learning allows AI to learn from ___ instead of following hardcoded rules.", accepted: [["data", "training data", "examples"]] },
    ]}) });

    // Cybersecurity: Match the threat
    await ctx.db.insert("lessons", { trackId: csId, title: "Match the Cyber Threat", type: "content", order: 3, published: true, content: JSON.stringify({ blocks: [
      { type: "heading", content: "Know Your Threats" },
      { type: "paragraph", content: "Can you match each attack type to its correct description? Drag the terms on the left to their definitions." },
      { type: "match", pairs: [
        { term: "Phishing",      definition: "Fake emails or sites designed to steal credentials" },
        { term: "Malware",       definition: "Malicious software — viruses, ransomware, spyware" },
        { term: "DDoS",          definition: "Flooding a server with traffic to knock it offline" },
        { term: "SQL Injection", definition: "Inserting malicious code into database queries" },
        { term: "Ransomware",    definition: "Encrypts your files and demands payment to unlock them" },
      ]},
    ]}) });
  },
});

/**
 * Makes Linux Mastery order:1 and shifts other tracks up.
 * Safe to call multiple times.
 */
export const reorderTracksLinuxFirst = mutation({
  args: {},
  handler: async (ctx) => {
    const tracks = await ctx.db.query("tracks").collect();
    const slugOrder: Record<string, number> = {
      linux: 1,
      aws: 2,
      azure: 3,
      "version-control": 4,
      docker: 5,
      kubernetes: 6,
      terraform: 7,
      ansible: 8,
      cicd: 9,
      monitoring: 10,
      hardware: 11,
      ai: 12,
      cybersecurity: 13,
      html: 99,
    };
    await Promise.all(
      tracks.map((t) => {
        const newOrder = slugOrder[t.slug] ?? t.order;
        if (t.order !== newOrder) return ctx.db.patch(t._id, { order: newOrder });
      })
    );
  },
});

/**
 * Patches existing crossword lessons to type "mandatory".
 */
export const patchCrosswordsToMandatory = mutation({
  args: {},
  handler: async (ctx) => {
    const lessons = await ctx.db.query("lessons").collect();
    await Promise.all(
      lessons
        .filter((l) => l.title.toLowerCase().includes("crossword"))
        .map((l) => ctx.db.patch(l._id, { type: "mandatory" as const }))
    );
  },
});

/**
 * Adds the Linux Mastery crossword lesson.
 */
export const addLinuxCrossword = mutation({
  args: {},
  handler: async (ctx) => {
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", "linux"))
      .unique();
    if (!track) return;

    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_track", (q) => q.eq("trackId", track._id))
      .collect();

    const maxOrder = existing.reduce((m, l) => Math.max(m, l.order), 0);

    const crosswordContent = JSON.stringify({
      blocks: [
        { type: "heading", content: "Linux Mastery Crossword" },
        {
          type: "paragraph",
          content:
            "Five essential Linux concepts are hidden in this grid. Each clue shows the letter count in parentheses. You can retry as many times as you need — correct words lock in green automatically!",
        },
        {
          type: "crossword",
          pairs: [
            { term: "KERNEL",     definition: "The core of Linux that manages hardware and system processes" },
            { term: "TERMINAL",   definition: "The application that runs a shell and accepts commands" },
            { term: "PERMISSION", definition: "Read, write, or execute access granted to users on a file" },
            { term: "DIRECTORY",  definition: "A folder in the Linux file system that contains files" },
            { term: "PIPELINE",   definition: "Chaining commands together using the | (pipe) operator" },
          ],
        },
      ],
    });

    const existing_crossword = existing.find((l) => l.title === "Linux Mastery Crossword Challenge");
    if (existing_crossword) {
      await ctx.db.patch(existing_crossword._id, { content: crosswordContent, type: "mandatory" });
    } else {
      await ctx.db.insert("lessons", {
        trackId: track._id,
        title: "Linux Mastery Crossword Challenge",
        type: "mandatory",
        order: maxOrder + 1,
        published: true,
        content: crosswordContent,
      });
    }
  },
});

/**
 * Adds the Hardware Fundamentals crossword lesson if it doesn't already exist.
 * Safe to call multiple times.
 */
export const addHardwareCrossword = mutation({
  args: {},
  handler: async (ctx) => {
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", "hardware"))
      .unique();
    if (!track) return;

    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_track", (q) => q.eq("trackId", track._id))
      .collect();

    const maxOrder = existing.reduce((m, l) => Math.max(m, l.order), 0);

    const crosswordContent = JSON.stringify({
      blocks: [
        {
          type: "heading",
          content: "Hardware Fundamentals Crossword",
        },
        {
          type: "paragraph",
          content:
            "Five advanced hardware terms are hidden in this grid. Click a clue or a cell to start typing — each clue shows the letter count in parentheses. Submit when you're done. You can retry as many times as you need!",
        },
        {
          type: "crossword",
          pairs: [
            { term: "MOTHERBOARD", definition: "The main circuit board that connects every component in the PC" },
            { term: "PROCESSOR",   definition: "Another name for the CPU — the chip that executes all instructions" },
            { term: "HEATSINK",    definition: "A metal block that draws heat away from the CPU to prevent overheating" },
            { term: "FIRMWARE",    definition: "Low-level software permanently stored in a chip (e.g. BIOS/UEFI)" },
            { term: "BANDWIDTH",   definition: "The maximum amount of data that can transfer per second on a bus" },
          ],
        },
      ],
    });

    // Update if already exists, otherwise insert
    const existing_crossword = existing.find((l) => l.title === "Hardware Crossword Challenge");
    if (existing_crossword) {
      await ctx.db.patch(existing_crossword._id, { content: crosswordContent, type: "mandatory" });
    } else {
      await ctx.db.insert("lessons", {
        trackId: track._id,
        title: "Hardware Crossword Challenge",
        type: "mandatory",
        order: maxOrder + 1,
        published: true,
        content: crosswordContent,
      });
    }
  },
});

/**
 * Adds the AI Fundamentals crossword lesson if it doesn't already exist.
 */
export const addAICrossword = mutation({
  args: {},
  handler: async (ctx) => {
    const track = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", "ai"))
      .unique();
    if (!track) return;

    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_track", (q) => q.eq("trackId", track._id))
      .collect();

    const maxOrder = existing.reduce((m, l) => Math.max(m, l.order), 0);

    const crosswordContent = JSON.stringify({
      blocks: [
        { type: "heading", content: "AI Fundamentals Crossword" },
        {
          type: "paragraph",
          content:
            "Five core AI concepts are hidden in this grid. Each clue shows the letter count. Click a cell or a clue to start — you can retry as many times as you need!",
        },
        {
          type: "crossword",
          pairs: [
            { term: "ALGORITHM",  definition: "A step-by-step set of rules a computer follows to solve a problem" },
            { term: "TRAINING",   definition: "The process of feeding data to a model so it can learn patterns" },
            { term: "NEURAL",     definition: "___ network — a system loosely modelled on the human brain" },
            { term: "INFERENCE",  definition: "Using a trained model to make predictions on new data" },
            { term: "GRADIENT",   definition: "___ descent — the optimisation technique used to train most AI models" },
          ],
        },
      ],
    });

    const existing_crossword = existing.find((l) => l.title === "AI Concepts Crossword Challenge");
    if (existing_crossword) {
      await ctx.db.patch(existing_crossword._id, { content: crosswordContent, type: "mandatory" });
    } else {
      await ctx.db.insert("lessons", {
        trackId: track._id,
        title: "AI Concepts Crossword Challenge",
        type: "mandatory",
        order: maxOrder + 1,
        published: true,
        content: crosswordContent,
      });
    }
  },
});

/**
 * Adds the Linux Mastery track if it doesn't exist yet.
 * Safe to call multiple times — exits immediately if the track already exists.
 */
export const addLinuxTrack = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("tracks")
      .withIndex("by_slug", (q) => q.eq("slug", "linux"))
      .unique();
    if (existing) return;

    const linuxId = await ctx.db.insert("tracks", {
      name: "Linux Mastery",
      slug: "linux",
      description: "Master the command line, file system, permissions, and scripting in Linux.",
      color: "#F59E0B",
      icon: "terminal",
      order: 5,
      published: true,
    });

    const l1 = await ctx.db.insert("lessons", {
      trackId: linuxId,
      title: "Introduction to Linux",
      type: "content",
      order: 1,
      published: true,
      content: JSON.stringify({ blocks: [
        { type: "heading", content: "What is Linux?" },
        { type: "paragraph", content: "Linux is a free, open-source operating system kernel first created by Linus Torvalds in 1991. Today it powers everything from Android phones and web servers to supercomputers and the International Space Station." },
        { type: "heading", content: "Why Learn Linux?" },
        { type: "list", content: "It runs over 90% of the world's servers\nEssential for cybersecurity, DevOps, and software development\nFree and open — anyone can inspect and modify the source code\nStable, secure, and blazing fast" },
        { type: "heading", content: "Linux Distributions" },
        { type: "paragraph", content: "A 'distro' is a packaged version of Linux. Popular ones include Ubuntu (beginner-friendly), Debian (stable), Arch (advanced), and Kali (security-focused). The core kernel is the same — they differ in package managers, defaults, and tooling." },
        { type: "flashcard", front: "Kernel", back: "The core of the OS — manages hardware, memory, and processes. Linux IS the kernel; everything else is userland." },
        { type: "flashcard", front: "Shell", back: "A command-line interpreter (e.g. bash, zsh) that lets you interact with the OS by typing commands." },
        { type: "flashcard", front: "Terminal", back: "The application that runs a shell — your window into the command line." },
      ]}),
    });

    const l2 = await ctx.db.insert("lessons", {
      trackId: linuxId,
      title: "Essential Linux Commands",
      type: "quiz",
      order: 2,
      published: true,
      content: JSON.stringify({ blocks: [
        { type: "heading", content: "The Command Line Essentials" },
        { type: "paragraph", content: "Every Linux user needs to know these core commands. They work on any Linux distro and on macOS too." },
        { type: "code", content: "pwd          # print working directory\nls -la       # list files (all, long format)\ncd /home     # change directory\nmkdir mydir  # create a directory\nrm -r mydir  # remove directory recursively\ncp file dest # copy file\nmv file dest # move or rename file\ncat file.txt # print file contents\ngrep 'text' file  # search in file\nman ls       # open the manual for any command" },
        { type: "paragraph", content: "The `man` (manual) command is your best friend — `man ls`, `man grep`, `man chmod` will explain every flag and option." },
      ]}),
    });

    const l3 = await ctx.db.insert("lessons", {
      trackId: linuxId,
      title: "File Permissions Explained",
      type: "content",
      order: 3,
      published: true,
      content: JSON.stringify({ blocks: [
        { type: "heading", content: "Understanding Linux Permissions" },
        { type: "paragraph", content: "Every file and directory in Linux has permissions that control who can read, write, or execute it. Permissions are shown as a string like -rwxr-xr-- which breaks into three groups: owner, group, and others." },
        { type: "code", content: "-rwxr-xr--\n│└──┘└──┘└──┘\n│owner group others\n│\n│r = read (4)\n│w = write (2)\n│x = execute (1)" },
        { type: "fillblank", prompt: "The command to change file permissions in Linux is ___.", accepted: [["chmod", "chmod command"]] },
        { type: "fillblank", prompt: "To give the owner full permissions (rwx), you use the number ___.", accepted: [["7", "777"]] },
        { type: "match", pairs: [
          { term: "chmod 755",  definition: "Owner: rwx, Group: r-x, Others: r-x" },
          { term: "chmod 644",  definition: "Owner: rw-, Group: r--, Others: r--" },
          { term: "chmod 777",  definition: "Everyone: full read, write, execute" },
          { term: "chmod 400",  definition: "Owner: read only, no one else" },
        ]},
      ]}),
    });

    await Promise.all([
      ctx.db.insert("quizQuestions", {
        lessonId: l2,
        question: "Which command shows your current directory in Linux?",
        options: ["ls", "pwd", "cd", "dir"],
        correctIndex: 1,
        explanation: "pwd (Print Working Directory) outputs the full path of your current location.",
        order: 1,
      }),
      ctx.db.insert("quizQuestions", {
        lessonId: l2,
        question: "What does the -la flag do when added to ls?",
        options: ["Lists files alphabetically", "Lists all files including hidden, in long format", "Searches for a file", "Moves to the last directory"],
        correctIndex: 1,
        explanation: "-l is long format (shows permissions, size, date) and -a shows hidden files (starting with .).",
        order: 2,
      }),
      ctx.db.insert("quizQuestions", {
        lessonId: l2,
        question: "Which command searches for text inside a file?",
        options: ["find", "ls", "grep", "cat"],
        correctIndex: 2,
        explanation: "grep searches for patterns inside files. Try: grep 'hello' myfile.txt",
        order: 3,
      }),
    ]);
  },
});
