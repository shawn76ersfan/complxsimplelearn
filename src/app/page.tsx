import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Award,
  BookMarked,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Cloud,
  Container,
  Download,
  Gauge,
  GraduationCap,
  Layers,
  MessageCircle,
  Network,
  Pin,
  Quote,
  Server,
  Terminal,
  Trophy,
  Users,
  Video,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { SignInBtn, SignUpBtn, EnrollmentButtons, InviteOnlyNote } from "@/components/layout/AuthButtons";
import { InfoSessionsSection } from "@/components/marketing/InfoSessionsSection";

const TESTIMONIALS = [
  {
    text: "Coach Cassandra is a powerhouse when it comes to encouraging and mentoring her students. When I was learning under her, she helped me identify and overcome things that were holding me back from success. She never made me feel like I wasn't doing enough, and applauded my grit and always encouraged me to achieve my fullest potential. Even months after I had finished learning under her, she was still there to answer any questions I had about the field, a job, or just to advise me on life in general. She is an unforgettable coach and mentor and I credit her for much of my growth.",
    name: "Raheemah",
  },
  {
    text: "Before I began working with you, I didn't have a specific goal in mind, which left me feeling somewhat directionless in my IT journey. However, after our first few conversations, it became clear that you had the ability to help me clarify my goals and identify the steps I needed to take to achieve them. After working with you, I felt much more confident and focused. I now have a clear direction for my IT and the tools to continue growing and overcoming challenges. I would absolutely recommend your coaching and mentoring to others.",
    name: "Tsion Bulo",
  },
  {
    text: "Mrs. Cassandra is the best mentor I've ever had! She has always been there to help me improve every aspect of my career — from resume help, to improving my skill set, to pushing through adversity, to building more connections by being PROACTIVE! When she teaches IT, or anything that involves concepts, she breaks it down into easy pieces for anyone to understand. We are all super grateful to have someone like Mrs. Cassandra help us become not just better at our careers, but better in our lives as people!",
    name: "Shawn Holmes",
  },
  {
    text: "Cassandra Carter was amazing at explaining fundamentals and also when it comes to creating a clear picture of the IT space and how it interconnects with other aspects of the web.",
    name: "Eric Valdez",
  },
  {
    text: "I had the privilege of being coached by Coach Cassandra during my time in the Year Up program, and she is absolutely wonderful. She truly cares about her students, going above and beyond to support us not just in our technical growth but also in our personal and professional development. Her dedication, patience, and encouragement make all the difference. I'm incredibly grateful for her mentorship and the impact she has had on my journey. She's so so so so awesome!",
    name: "Jesse Olanrewaju",
  },
];

const TOOLS = [
  "AWS",
  "Azure",
  "Kubernetes",
  "Docker",
  "Terraform",
  "Jenkins",
  "GitHub",
  "Linux",
  "Ansible",
  "Prometheus",
  "Grafana",
];

const BENEFITS = [
  { icon: Terminal, title: "Hands-On Labs", desc: "Practice in real cloud environments." },
  { icon: BriefcaseBusiness, title: "Real Projects", desc: "Build production-grade infrastructure for your portfolio." },
  { icon: Trophy, title: "Career Support", desc: "Get resume optimization and interview preparation." },
  { icon: Users, title: "Live Mentorship", desc: "Learn in live, interactive sessions with dedicated instructors." },
  { icon: Video, title: "Recorded Sessions", desc: "Review every class inside the learning platform." },
  { icon: MessageCircle, title: "Community Support", desc: "Learn alongside an active student community." },
  { icon: BookOpen, title: "Beginner Friendly", desc: "Start with the fundamentals—no previous experience required." },
  { icon: Award, title: "Certification Voucher", desc: "AWS Solutions Architect Associate exam voucher included." },
];

const CURRICULUM = [
  {
    number: "01",
    title: "Linux Administration",
    spine: "Linux Admin",
    color: "#F59E0B",
    topics: ["Linux Fundamentals", "Command Line Interface", "File Permissions", "Users and Groups", "Networking", "Process Management", "Package Management", "Bash Scripting"],
  },
  {
    number: "02",
    title: "AWS Cloud",
    color: "#FF9900",
    topics: ["IAM", "EC2", "S3", "VPC", "Route Tables", "Security Groups", "Load Balancers", "Auto Scaling", "Route 53", "RDS", "CloudWatch", "EFS", "Lambda", "SNS", "SQS", "CloudFormation"],
  },
  {
    number: "03",
    title: "Microsoft Azure",
    color: "#0078D4",
    topics: ["Virtual Machines", "Storage", "Networking", "Virtual Networks", "Azure Active Directory", "Monitoring", "Security"],
  },
  {
    number: "04",
    title: "Version Control",
    color: "#F05032",
    topics: ["Git", "GitHub", "Branching", "Pull Requests"],
  },
  {
    number: "05",
    title: "Containerization",
    spine: "Containers",
    color: "#2496ED",
    topics: ["Docker Fundamentals", "Docker Images", "Containers", "Docker Compose"],
  },
  {
    number: "06",
    title: "Kubernetes",
    color: "#326CE5",
    topics: ["Pods", "Deployments", "Services", "ConfigMaps", "Secrets", "Persistent Volumes", "Scaling Applications"],
  },
  {
    number: "07",
    title: "Infrastructure as Code",
    spine: "Infra as Code",
    color: "#7B42BC",
    topics: ["Terraform Basics", "Variables", "Modules", "Provisioning AWS Infrastructure"],
  },
  {
    number: "08",
    title: "Configuration Management",
    spine: "Config Mgmt",
    color: "#EE0000",
    topics: ["Ansible", "Playbooks", "Inventory", "Automation"],
  },
  {
    number: "09",
    title: "CI/CD",
    color: "#D33833",
    topics: ["Jenkins", "GitHub Actions", "Pipelines", "Deployment Automation"],
  },
  {
    number: "10",
    title: "Monitoring",
    color: "#E6522C",
    topics: ["Prometheus", "Grafana", "Alerting"],
  },
];

const PROJECTS = [
  { icon: Cloud, tag: "AWS · HA", title: "Deploy Highly Available Web Applications on AWS" },
  { icon: Layers, tag: "IaC", title: "Build Infrastructure with Terraform" },
  { icon: Workflow, tag: "CI/CD", title: "Create CI/CD Pipelines Using Jenkins" },
  { icon: Container, tag: "Containers", title: "Containerize Applications with Docker" },
  { icon: Boxes, tag: "K8s", title: "Deploy Applications on Kubernetes" },
  { icon: Gauge, tag: "Monitoring", title: "Configure Monitoring with Prometheus and Grafana" },
  { icon: Wrench, tag: "Automation", title: "Implement Infrastructure Automation with Ansible" },
];

const PRICING_FEATURES = [
  "Live classes",
  "Recorded sessions",
  "Hands-on labs",
  "Real-world projects",
  "Live mentorship",
  "Community support",
  "Resume optimization",
  "Interview preparation",
  "Certificate of completion",
  "AWS certification preparation",
  "Free AWS Solutions Architect Associate voucher",
  "Access to Stark AI learning support",
];

const FAQS = [
  { question: "Do I need previous experience?", answer: "No. The program starts with core Linux and cloud fundamentals before progressing into production tools." },
  { question: "Is this beginner-friendly?", answer: "Yes. The roadmap is structured to take beginners from foundational skills through complete DevOps projects." },
  { question: "Are recordings available?", answer: "Yes. Enrolled students can revisit recorded sessions inside the ComplxSimple platform." },
  { question: "Will I receive a certificate?", answer: "Students who complete the program requirements receive a certificate of completion." },
  { question: "Will I work on real projects?", answer: "Yes. You will build portfolio projects across AWS, Terraform, CI/CD, Docker, Kubernetes, monitoring, and automation." },
  { question: "Will I get support for AWS certification?", answer: "Yes. The program includes SAA-C03 preparation, practical labs, and an AWS Solutions Architect Associate exam voucher." },
  { question: "How long is the program?", answer: "The complete schedule will be shared when the next cohort dates are announced." },
  {
    question: "What is the difference between the bootcamp and the instructor course?",
    answer:
      "The DevOps & Cloud Engineering Bootcamp is the full career program (labs, projects, mentorship, certification prep, and platform access). The instructor course is a separate program with its own tuition—see pricing on this page.",
  },
  {
    question: "How much does the bootcamp cost?",
    answer:
      "Bootcamp tuition depends on the cohort. Schedule a free consultation for current pricing, installment options, and seat availability.",
  },
];

const TRACKS = [
  { icon: Terminal,  label: "Linux Administration", blurb: "Servers, shells, permissions, scripting.", color: "#F59E0B" },
  { icon: Cloud,     label: "AWS Cloud",            blurb: "Compute, storage, networking, IAM.",       color: "#FF9900" },
  { icon: Network,   label: "Microsoft Azure",      blurb: "VMs, VNets, identity, monitoring.",       color: "#0078D4" },
  { icon: Container, label: "Docker",               blurb: "Images, containers, Compose.",            color: "#2496ED" },
  { icon: Boxes,     label: "Kubernetes",           blurb: "Pods, deployments, scaling.",             color: "#326CE5" },
];

const FEATURE_NOTES = [
  { icon: Zap,    title: "Interactive lessons", desc: "Quizzes and games make it stick — not just reading.", tone: "", pin: "#EF4444", tilt: "-2deg" },
  { icon: Trophy, title: "Track your progress", desc: "Earn scores on every lesson and watch your percentage climb.", tone: "blue", pin: "#2563EB", tilt: "1.5deg" },
  { icon: Users,  title: "Teacher dashboard",   desc: "Cassandra sees every student's progress, grades, and sends updates.", tone: "pink", pin: "#16A34A", tilt: "-1deg" },
];

/* Books on the hero shelf — heights vary so it reads like a real shelf */
const SHELF_SIZES = ["tall", "", "short", "wide", "", "tall", "short", "", "wide lean", ""];

function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={`${align === "center" ? "text-center mx-auto" : ""} max-w-2xl mb-12`}>
      <p className={`eyebrow mb-4 ${align === "center" ? "justify-center" : ""}`}>{eyebrow}</p>
      <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text)" }}>
        {title}
      </h2>
      {description && <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>{description}</p>}
    </div>
  );
}

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  // Duplicate testimonials so the loop is seamless
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <div className="min-h-screen relative" style={{ background: "transparent" }}>
      {/* Nav */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-md flex items-center justify-center text-white"
            style={{
              background: "linear-gradient(160deg, #2563EB, #1e40af)",
              boxShadow: "3px 3px 0 var(--accent)",
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
            }}
          >
            <BookMarked size={18} />
          </span>
          <span className="font-serif text-xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            ComplxSimple
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold" style={{ color: "var(--text-muted)" }}>
          <a href="#curriculum" className="hover:opacity-70 transition-opacity">Curriculum</a>
          <a href="#projects" className="hover:opacity-70 transition-opacity">Projects</a>
          <a href="#pricing" className="hover:opacity-70 transition-opacity">Tuition</a>
          <a href="#faq" className="hover:opacity-70 transition-opacity">Office hours</a>
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="#info-sessions"
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "var(--text)" }}
          >
            <CalendarDays size={15} />
            <span className="hidden lg:inline">Info Sessions</span>
          </a>
          <ThemeToggle />
          <SignInBtn className="btn-ink btn-sm" />
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative z-10 max-w-7xl mx-auto px-6 pt-10 pb-24 lg:pt-16">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-14 items-center">
          <div>
            <p className="eyebrow mb-6">Cohort-based · Live instruction · Invite only</p>
            <h1
              className="font-serif text-5xl sm:text-6xl lg:text-[4.4rem] font-bold tracking-tight mb-7 leading-[1.05]"
              style={{ color: "var(--text)" }}
            >
              Become a job-ready{" "}
              <span className="highlighter">DevOps &amp; Cloud</span> Engineer.
            </h1>
            <p className="text-lg sm:text-xl max-w-xl mb-9 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Live, interactive classes and modules with dedicated instructors, plus a portfolio of real infrastructure. Hands-on labs and mentorship that follows you into the job hunt.
            </p>
            <EnrollmentButtons />
            <InviteOnlyNote className="mt-6" />

            <dl className="mt-12 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: "10+", v: "Interactive modules" },
                { k: "7", v: "Portfolio projects" },
                { k: "1", v: "AWS voucher" },
              ].map((s) => (
                <div key={s.v} className="border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>
                  <dt className="font-serif text-3xl font-bold leading-none" style={{ color: "var(--text)" }}>{s.k}</dt>
                  <dd className="text-xs mt-1.5 font-medium" style={{ color: "var(--text-muted)" }}>{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The shelf */}
          <div className="relative pt-10">
            <div className="sticky-note absolute -top-2 right-2 sm:right-6 z-20 w-44 p-4" style={{ ["--tilt" as string]: "4deg" }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70 mb-1">Reminder</p>
              <p className="font-serif text-base font-bold leading-snug">Next cohort date TBA — limited seats.</p>
            </div>

            <div className="index-card p-5 pt-0 mb-8 max-w-xs">
              <div className="index-card-title">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                  Course catalog · Fall syllabus
                </p>
              </div>
              <p className="font-serif text-lg font-bold leading-snug mt-2" style={{ color: "var(--text)" }}>
                DevOps &amp; Cloud Engineering Bootcamp
              </p>
              <p className="text-sm mt-1.5" style={{ color: "var(--text-muted)" }}>
                Instructor: Cassandra Carter · Foundation → Cloud → Automation
              </p>
            </div>

            <div className="bookshelf overflow-x-auto sm:overflow-visible">
              {CURRICULUM.map((m, i) => (
                <a
                  key={m.number}
                  href="#curriculum"
                  className={`book-spine ${SHELF_SIZES[i] ?? ""}`}
                  style={{ ["--book-color" as string]: m.color }}
                  title={`Module ${m.number}: ${m.title}`}
                >
                  <span className="spine-badge text-[11px] font-black">{m.number}</span>
                  <span className="spine-title">{"spine" in m && m.spine ? m.spine : m.title}</span>
                  <span className="text-[9px] font-bold tracking-widest opacity-80">CS</span>
                </a>
              ))}
            </div>
            <p className="text-center text-xs mt-6 font-medium" style={{ color: "var(--text-muted)" }}>
              Ten volumes. Pull one off the shelf below.
            </p>
          </div>
        </div>
      </section>

      <InfoSessionsSection />

      {/* Tools — the supply list */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="index-card p-6 sm:p-8 pt-0">
          <div className="index-card-title">
            <p className="eyebrow">Required supplies</p>
          </div>
          <div className="flex flex-wrap gap-2.5 mt-3">
            {TOOLS.map((tool) => (
              <span
                key={tool}
                className="px-4 py-2 rounded-lg text-sm font-bold font-serif transition-transform hover:-translate-y-0.5"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                {tool}
              </span>
            ))}
            <span className="px-4 py-2 rounded-lg text-sm italic" style={{ color: "var(--text-muted)" }}>
              …and a notebook. Laptop optional; curiosity mandatory.
            </span>
          </div>
        </div>
      </section>

      {/* Tracks — five books on the desk */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <SectionHeading
          eyebrow="Core skills"
          title={<>Five textbooks, one <span className="pencil-underline">career</span>.</>}
          description="Start with Linux, then move into cloud platforms, containers, automation, and operations."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {TRACKS.map((track) => (
            <div
              key={track.label}
              className="book-cover hover:-translate-y-1 transition-transform"
              style={{ ["--book-color" as string]: track.color }}
            >
              <div className="relative z-10 p-5 flex flex-col gap-3 min-h-[168px]">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center"
                  style={{ background: `${track.color}1a`, border: `1px solid ${track.color}44` }}
                >
                  <track.icon size={20} style={{ color: track.color }} />
                </div>
                <div className="mt-auto">
                  <p className="font-serif font-bold leading-tight" style={{ color: "var(--text)" }}>{track.label}</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{track.blurb}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Linux spotlight — on the chalkboard */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-28">
        <div className="chalkboard p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row items-start gap-8">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-3xl"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px dashed rgba(255,255,255,0.3)" }}
            >
              🐧
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Terminal size={14} />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Today&apos;s lesson — Linux Mastery Track</span>
              </div>
              <p className="font-serif text-xl sm:text-2xl leading-relaxed mb-5">
                &ldquo;This is not just a certification — it&apos;s a{" "}
                <span className="chalk-line">job-ready pathway</span>{" "}to managing servers at scale. At the end of this training you should be confident applying to System Admin roles and managing servers and Linux environments at scale!&rdquo;
              </p>
              <p className="text-sm font-semibold chalk-muted">— Cassandra Carter, written on the board</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — sticky notes on the cork board */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="cork-board rounded-2xl p-6 sm:p-10">
          <div className="flex items-center gap-2 mb-8">
            <Pin size={16} className="text-white/80" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/85">Pinned to the board</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURE_NOTES.map((f) => (
              <div
                key={f.title}
                className={`sticky-note ${f.tone} p-6 pt-8`}
                style={{ ["--tilt" as string]: f.tilt }}
              >
                <span className="push-pin" style={{ ["--pin" as string]: f.pin }} />
                <f.icon size={22} className="mb-3 opacity-80" />
                <h3 className="font-serif font-bold text-xl mb-2 leading-tight">{f.title}</h3>
                <p className="text-sm leading-relaxed opacity-85">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why choose the program — index cards */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <SectionHeading
          eyebrow="Why choose us"
          title="Everything you need to launch your cloud career"
          description="A premium learning experience built around practice, mentorship, and job-ready results."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((benefit, index) => (
            <div key={benefit.title} className="index-card p-5 pt-0">
              <div className="index-card-title gap-3">
                <span
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ background: index % 2 === 0 ? "#2563EB14" : "#F9731614" }}
                >
                  <benefit.icon size={16} style={{ color: index % 2 === 0 ? "var(--primary)" : "var(--accent)" }} />
                </span>
                <h3 className="font-serif font-bold" style={{ color: "var(--text)" }}>{benefit.title}</h3>
              </div>
              <p className="text-sm leading-7 mt-2" style={{ color: "var(--text-muted)" }}>{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Curriculum — table of contents in an open textbook */}
      <section id="curriculum" className="relative z-10 max-w-7xl mx-auto px-6 pb-24 scroll-mt-20">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-12">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">Program curriculum</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: "var(--text)" }}>
              Table of contents. Ten chapters, zero to job-ready.
            </h2>
            <p style={{ color: "var(--text-muted)" }}>A structured roadmap covering the essential DevOps and cloud engineering skills employers expect.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <Server size={20} style={{ color: "var(--primary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Foundation → Cloud → Automation</span>
          </div>
        </div>

        <div className="open-book">
          {[CURRICULUM.slice(0, 5), CURRICULUM.slice(5)].map((half, pageIndex) => (
            <div key={pageIndex} className="page">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-6" style={{ color: "var(--text-muted)" }}>
                {pageIndex === 0 ? "Part I · Foundations & Cloud" : "Part II · Orchestration & Automation"}
              </p>
              <ol className="space-y-7">
                {half.map((module) => (
                  <li key={module.number}>
                    <div className="toc-row">
                      <span className="font-serif text-2xl font-bold w-10 flex-shrink-0" style={{ color: module.color }}>
                        {module.number}
                      </span>
                      <span className="font-serif text-lg font-bold" style={{ color: "var(--text)" }}>{module.title}</span>
                      <span className="toc-leader" />
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                        {module.topics.length} topics
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pl-10">
                      {module.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-2 py-0.5 rounded text-[11px]"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
              <p className="text-center text-xs mt-10 font-serif italic" style={{ color: "var(--text-muted)" }}>
                — {pageIndex === 0 ? "i" : "ii"} —
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Projects — lab notebook */}
      <section id="projects" className="relative z-10 max-w-7xl mx-auto px-6 pb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="Lab notebook"
          title="Build a portfolio recruiters take seriously"
          description="Complete production-style projects across the full DevOps lifecycle. Every one goes in your notebook."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7 pt-3">
          {PROJECTS.map((project, i) => (
            <article
              key={project.title}
              className="notebook-sheet relative rounded-md p-6 pl-12 min-h-[164px] flex flex-col"
              style={{ border: "1px solid var(--border)", boxShadow: "0 10px 26px rgba(30,20,5,0.08)" }}
            >
              <span className={`washi-tape ${i % 3 === 0 ? "left" : i % 3 === 1 ? "" : "right"}`} />
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "#2563EB14" }}>
                  <project.icon size={18} style={{ color: "var(--primary)" }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "#F9731614", color: "var(--accent)" }}>
                  {project.tag}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "var(--text-muted)" }}>
                Project {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="font-serif font-bold text-lg leading-snug" style={{ color: "var(--text)" }}>{project.title}</h3>
            </article>
          ))}
        </div>
      </section>

      {/* Certification — the diploma */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="diploma p-10 sm:p-14 text-center">
          <p className="eyebrow justify-center mb-5">Certification track</p>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold mb-3" style={{ color: "var(--text)" }}>
            AWS Certified Solutions Architect
            <br className="hidden sm:block" /> Associate (SAA-C03)
          </h2>
          <p className="max-w-xl mx-auto leading-relaxed mb-8" style={{ color: "var(--text-muted)" }}>
            Structured exam preparation, practical labs, and support designed to help you test with confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="diploma-seal">
              <GraduationCap size={30} />
            </div>
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-lg text-left" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <Award size={20} style={{ color: "#B8860B" }} />
              <span className="text-sm font-bold" style={{ color: "var(--text)" }}>Free SAA exam voucher included with enrollment</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stark teaser — teal chalk on the board */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-28">
        <div className="chalkboard p-8 sm:p-12" style={{ ["--board" as string]: "#0b201e", ["--board-edge" as string]: "#07302b" }}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #0d4f4a, #14B8A6)",
                boxShadow: "0 0 40px rgba(20,184,166,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                border: "1px solid rgba(20,184,166,0.4)",
              }}
            >
              <span className="font-extrabold text-[28px] text-white tracking-tight">S</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h2 className="font-extrabold text-white leading-none" style={{ fontSize: "clamp(28px, 5vw, 40px)", letterSpacing: "0.18em" }}>
                  STARK
                </h2>
                <span className="stamp" style={{ ["--stamp" as string]: "#5eead4" }}>Included with enrollment</span>
              </div>

              <p className="text-base leading-relaxed mb-5 chalk-muted" style={{ maxWidth: "580px" }}>
                Your course-aware AI teaching assistant. Ask questions about lessons, break down Linux and cloud concepts, review DevOps tools, and get guidance whenever office hours are closed.
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {["Course-specific knowledge", "Linux & Cloud Q&A", "DevOps explanations", "Career guidance", "Enrolled students only"].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(20,184,166,0.1)", color: "#5eead4", border: "1px dashed rgba(94,234,212,0.4)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <SignUpBtn className="btn-ink btn-sm" style={{ ["--ink" as string]: "#14B8A6", ["--paper" as string]: "#062b28", ["--accent" as string]: "#5eead4" }}>
                Sign in to meet Stark
              </SignUpBtn>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials — notes passed around class */}
      <section className="relative z-10 pb-32">
        <div className="px-6">
          <SectionHeading
            eyebrow="From the guest book"
            title="What students say"
            description="Real feedback from Cassandra's students."
          />
        </div>

        <div className="marquee-wrapper py-4">
          <div className="marquee-track">
            {doubled.map((t, i) => (
              <div
                key={i}
                className="index-card mx-4 p-6 pt-0 flex-shrink-0"
                style={{ width: "360px", maxWidth: "90vw" }}
              >
                <div className="index-card-title justify-between">
                  <Quote size={20} style={{ color: "var(--accent)" }} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-muted)" }}>
                    Note #{(i % TESTIMONIALS.length) + 1}
                  </span>
                </div>
                <p
                  className="text-sm leading-7 mb-4 mt-1"
                  style={{ color: "var(--text)", display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {t.text}
                </p>
                <div className="flex items-center gap-3 pt-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 font-serif"
                    style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold font-serif" style={{ color: "var(--text)" }}>{t.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>ComplxSimple student</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — tuition folder */}
      <section id="pricing" className="relative z-10 max-w-6xl mx-auto px-6 pb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="Tuition"
          title="Programs &amp; tuition"
          description="The DevOps bootcamp and the instructor course are separate programs with different pricing."
        />

        <div className="relative mt-8 mb-12">
          <span className="folder-tab">Bootcamp · Tuition folder</span>
          <div className="card overflow-hidden rounded-tl-none">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
              <div className="chalkboard flat p-8 sm:p-10">
                <span className="stamp mb-6" style={{ ["--stamp" as string]: "#fde68a" }}>DevOps bootcamp</span>
                <h3 className="font-serif text-3xl font-bold mb-3 mt-4">Complete Bootcamp</h3>
                <p className="text-sm leading-relaxed mb-8 chalk-muted">
                  Everything included—live training, labs, projects, mentorship, career support, Stark access, and certification preparation.
                </p>
                <p className="font-serif text-xl font-bold mb-2">Tuition by cohort</p>
                <p className="text-sm leading-relaxed mb-8 chalk-muted">
                  Bootcamp pricing is not the same as the instructor course. Schedule a free consultation for current tuition, installment plans, and seat availability.
                </p>
                <SignUpBtn className="btn-ink w-full" style={{ ["--ink" as string]: "#E9F1EB", ["--paper" as string]: "#1F3B32", ["--accent" as string]: "#fde68a" }}>
                  Sign in (invite only)
                </SignUpBtn>
                <p className="text-center text-xs mt-4 chalk-muted">Next cohort date to be announced</p>
              </div>

              <div className="p-8 sm:p-10">
                <div className="flex items-center gap-3 mb-7">
                  <Network size={22} style={{ color: "var(--primary)" }} />
                  <h3 className="font-serif text-xl font-bold" style={{ color: "var(--text)" }}>Everything included in the bootcamp</h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-7 gap-y-3.5">
                  {PRICING_FEATURES.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5" style={{ border: "2px solid var(--ink)", background: "var(--surface-2)" }}>
                        <Check size={12} strokeWidth={3} style={{ color: "#16A34A" }} />
                      </span>
                      <span className="text-sm" style={{ color: "var(--text)" }}>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="index-card p-8 sm:p-10 pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="max-w-xl">
            <div className="index-card-title">
              <span className="stamp">Separate program</span>
            </div>
            <h3 className="font-serif text-2xl font-bold mb-2 mt-2" style={{ color: "var(--text)" }}>Instructor course</h3>
            <p className="text-sm leading-7" style={{ color: "var(--text-muted)" }}>
              This is not the DevOps bootcamp. It is Cassandra&apos;s instructor-focused program with its own curriculum and enrollment.
            </p>
          </div>
          <div className="text-left sm:text-right flex-shrink-0 sm:pt-8">
            <div className="flex items-end gap-2 sm:justify-end mb-1">
              <span className="font-serif text-4xl font-bold" style={{ color: "var(--text)" }}>$1,600+</span>
              <span className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>one-time</span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Installment payment available—contact the administrator for details.</p>
            <a href="#info-sessions" className="btn-paper btn-sm">
              Inquire about instructor course
            </a>
          </div>
        </div>
      </section>

      {/* FAQ — office hours */}
      <section id="faq" className="relative z-10 max-w-4xl mx-auto px-6 pb-24 scroll-mt-20">
        <SectionHeading
          eyebrow="Office hours"
          title="Frequently asked questions"
          description="The essentials before you enroll."
        />
        <div className="notebook-sheet rounded-lg p-2 sm:p-4" style={{ border: "1px solid var(--border)", boxShadow: "0 12px 30px rgba(30,20,5,0.08)" }}>
          {FAQS.map((faq, i) => (
            <details key={faq.question} className="group px-4 sm:px-6 pl-12 sm:pl-14 py-3.5" style={{ borderBottom: i === FAQS.length - 1 ? "none" : "1px solid var(--border)" }}>
              <summary className="cursor-pointer list-none flex items-start justify-between gap-4 font-serif font-bold text-base sm:text-lg leading-7" style={{ color: "var(--text)" }}>
                <span><span className="mr-3" style={{ color: "var(--accent)" }}>Q{i + 1}.</span>{faq.question}</span>
                <span className="text-xl leading-7 transition-transform group-open:rotate-45 flex-shrink-0" style={{ color: "var(--primary)" }}>+</span>
              </summary>
              <p className="text-sm leading-7 pt-2 pr-8" style={{ color: "var(--text-muted)" }}>
                <span className="font-bold mr-2" style={{ color: "var(--primary)" }}>A.</span>{faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="index-card relative p-10 sm:p-14 pt-0 text-center">
          <span className="washi-tape left" />
          <span className="washi-tape right" />
          <div className="index-card-title justify-center">
            <p className="eyebrow">Enrollment</p>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl font-bold mb-4 mt-4" style={{ color: "var(--text)" }}>
            Your seat is waiting.
          </h2>
          <p className="max-w-2xl mx-auto mb-8 leading-relaxed" style={{ color: "var(--text-muted)" }}>
            Master AWS, Azure, Docker, Kubernetes, Terraform, CI/CD, and DevOps through practical projects and expert mentorship.
          </p>
          <EnrollmentButtons align="center" />
          <InviteOnlyNote className="mt-6 justify-center" />
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 border-t py-10 text-center text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-5">
          <a href="/pamphlet" target="_blank" rel="noopener noreferrer" className="btn-paper btn-sm">
            <Download size={15} /> Download course guide (PDF)
          </a>
        </div>
        <p className="font-serif">ComplxSimple &mdash; Built with ❤️ for Cassandra Carter&apos;s students</p>
      </footer>
    </div>
  );
}
