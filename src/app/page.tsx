import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Award,
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
  Quote,
  Rocket,
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
import { RainAnimation } from "@/components/layout/RainAnimation";
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
  { icon: Users, title: "Live Mentorship", desc: "Learn directly from an experienced instructor." },
  { icon: Video, title: "Recorded Sessions", desc: "Review every class inside the learning platform." },
  { icon: MessageCircle, title: "Community Support", desc: "Learn alongside an active student community." },
  { icon: BookOpen, title: "Beginner Friendly", desc: "Start with the fundamentals—no previous experience required." },
  { icon: Award, title: "Certification Voucher", desc: "AWS Solutions Architect Associate exam voucher included." },
];

const CURRICULUM = [
  {
    number: "01",
    title: "Linux Administration",
    topics: ["Linux Fundamentals", "Command Line Interface", "File Permissions", "Users and Groups", "Networking", "Process Management", "Package Management", "Bash Scripting"],
  },
  {
    number: "02",
    title: "AWS Cloud",
    topics: ["IAM", "EC2", "S3", "VPC", "Route Tables", "Security Groups", "Load Balancers", "Auto Scaling", "Route 53", "RDS", "CloudWatch", "EFS", "Lambda", "SNS", "SQS", "CloudFormation"],
  },
  {
    number: "03",
    title: "Microsoft Azure",
    topics: ["Virtual Machines", "Storage", "Networking", "Virtual Networks", "Azure Active Directory", "Monitoring", "Security"],
  },
  {
    number: "04",
    title: "Version Control",
    topics: ["Git", "GitHub", "Branching", "Pull Requests"],
  },
  {
    number: "05",
    title: "Containerization",
    topics: ["Docker Fundamentals", "Docker Images", "Containers", "Docker Compose"],
  },
  {
    number: "06",
    title: "Kubernetes",
    topics: ["Pods", "Deployments", "Services", "ConfigMaps", "Secrets", "Persistent Volumes", "Scaling Applications"],
  },
  {
    number: "07",
    title: "Infrastructure as Code",
    topics: ["Terraform Basics", "Variables", "Modules", "Provisioning AWS Infrastructure"],
  },
  {
    number: "08",
    title: "Configuration Management",
    topics: ["Ansible", "Playbooks", "Inventory", "Automation"],
  },
  {
    number: "09",
    title: "CI/CD",
    topics: ["Jenkins", "GitHub Actions", "Pipelines", "Deployment Automation"],
  },
  {
    number: "10",
    title: "Monitoring",
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

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  const tracks = [
    { icon: Terminal,  label: "Linux Administration", color: "#F59E0B", bg: "#F59E0B10" },
    { icon: Cloud,     label: "AWS Cloud",            color: "#FF9900", bg: "#FF990010" },
    { icon: Network,   label: "Microsoft Azure",      color: "#0078D4", bg: "#0078D410" },
    { icon: Container, label: "Docker",               color: "#2496ED", bg: "#2496ED10" },
    { icon: Boxes,     label: "Kubernetes",           color: "#326CE5", bg: "#326CE510" },
  ];

  const features = [
    { icon: Zap,    title: "Interactive Lessons",  desc: "Hands-on quizzes and games make learning stick — not just reading.", color: "#2563EB" },
    { icon: Trophy, title: "Track Your Progress",  desc: "Earn scores on every lesson. Watch your knowledge percentage grow.", color: "#F97316" },
    { icon: Users,  title: "Teacher Dashboard",    desc: "Cassandra can see every student's progress, grades, and send updates.", color: "#0EA5E9" },
  ];

  // Duplicate testimonials so the loop is seamless
  const doubled = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <div className="min-h-screen relative" style={{ background: "var(--bg)" }}>
      <RainAnimation />

      {/* Nav */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-lg">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          >
            C
          </span>
          <span className="gradient-text">ComplxSimple</span>
        </div>
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
          <SignInBtn
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
          />
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl" style={{ background: "rgba(37,99,235,0.12)" }} />
          <div className="absolute top-20 right-1/4 w-80 h-80 rounded-full blur-3xl"      style={{ background: "rgba(249,115,22,0.10)" }} />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 rounded-full blur-3xl"     style={{ background: "rgba(14,165,233,0.08)" }} />
        </div>
        <div className="relative">
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }} />
            Next cohort date to be announced &mdash; Limited seats
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-tight"
            style={{ color: "var(--text)" }}
          >
            Become a Job-Ready
            <br />
            <span className="gradient-text">DevOps &amp; Cloud Engineer</span>
          </h1>
          <p className="text-xl max-w-3xl mx-auto mb-7" style={{ color: "var(--text-muted)" }}>
            Master Linux, AWS, Azure, Docker, Kubernetes, Terraform, Jenkins, GitHub Actions, Ansible, and Infrastructure as Code through live training, hands-on labs, and real-world projects.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {["Beginner Friendly", "Live Instructor-Led Classes", "Hands-On Projects", "Career Support", "Free AWS Certification Voucher"].map((item) => (
              <span
                key={item}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                {item}
              </span>
            ))}
          </div>
          <EnrollmentButtons />
          <InviteOnlyNote className="mt-6" />
        </div>
      </section>

      <InfoSessionsSection />

      {/* Tools */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <p className="text-center text-xs font-bold uppercase tracking-[0.22em] mb-6" style={{ color: "var(--text-muted)" }}>
          Tools you&apos;ll master
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {TOOLS.map((tool) => (
            <div
              key={tool}
              className="px-5 py-3 rounded-2xl text-sm font-bold transition-transform hover:-translate-y-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", boxShadow: "0 8px 24px rgba(15,23,42,0.05)" }}
            >
              {tool}
            </div>
          ))}
        </div>
      </section>

      {/* Tracks */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center mb-3" style={{ color: "var(--text)" }}>Core Skills You&apos;ll Build</h2>
        <p className="text-center mb-12 text-sm" style={{ color: "var(--text-muted)" }}>Start with Linux, then move into cloud platforms, containers, automation, and operations.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {tracks.map((track) => (
            <div
              key={track.label}
              className="card p-5 flex flex-col items-center text-center gap-3 hover:scale-105 transition-transform cursor-default"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: track.bg, border: `1px solid ${track.color}33` }}
              >
                <track.icon size={24} style={{ color: track.color }} />
              </div>
              <p className="font-semibold text-xs" style={{ color: "var(--text)" }}>{track.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Linux spotlight — Cassandra's quote */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div
          className="rounded-3xl p-8 sm:p-10 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1c1917 0%, #292524 100%)", border: "1px solid #44403c" }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle at 70% 50%, #F59E0B, transparent 60%)" }} />
          <div className="relative flex flex-col sm:flex-row items-start gap-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
              style={{ background: "#F59E0B20", border: "1px solid #F59E0B44" }}
            >
              🐧
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={14} style={{ color: "#F59E0B" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#F59E0B" }}>Linux Mastery Track</span>
              </div>
              <p className="text-lg font-semibold leading-relaxed mb-3" style={{ color: "#fafaf9" }}>
                &ldquo;This is not just a certification — it&apos;s a <span style={{ color: "#F59E0B" }}>job-ready pathway</span> to managing servers at scale. At the end of this training you should be confident applying to System Admin roles and managing servers and Linux environments at scale!&rdquo;
              </p>
              <p className="text-sm font-semibold" style={{ color: "#a8a29e" }}>— Cassandra Carter</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="card p-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${f.color}18` }}
              >
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 className="font-bold text-lg mb-2" style={{ color: "var(--text)" }}>{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose the program */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#2563EB" }}>Why choose us</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text)" }}>
            Everything you need to launch your cloud career
          </h2>
          <p style={{ color: "var(--text-muted)" }}>A premium learning experience built around practice, mentorship, and job-ready results.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((benefit, index) => (
            <div key={benefit.title} className="card p-6">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ background: index % 2 === 0 ? "#2563EB14" : "#F9731614" }}
              >
                <benefit.icon size={20} style={{ color: index % 2 === 0 ? "#2563EB" : "#F97316" }} />
              </div>
              <h3 className="font-bold mb-2" style={{ color: "var(--text)" }}>{benefit.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Curriculum */}
      <section className="relative z-10 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-12">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#F97316" }}>Program curriculum</p>
              <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text)" }}>10 modules. Zero to job-ready.</h2>
              <p style={{ color: "var(--text-muted)" }}>A structured roadmap covering the essential DevOps and cloud engineering skills employers expect.</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <Server size={20} style={{ color: "#2563EB" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Foundation → Cloud → Automation</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CURRICULUM.map((module) => (
              <div key={module.number} className="card p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <span
                    className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black"
                    style={{ background: "linear-gradient(135deg, #2563EB, #0EA5E9)", color: "white" }}
                  >
                    {module.number}
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "var(--text-muted)" }}>Module {module.number}</p>
                    <h3 className="text-lg font-bold mb-4" style={{ color: "var(--text)" }}>{module.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {module.topics.map((topic) => (
                        <span
                          key={topic}
                          className="px-2.5 py-1 rounded-lg text-xs"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#2563EB" }}>Real-world projects</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text)" }}>Build a portfolio recruiters take seriously</h2>
          <p style={{ color: "var(--text-muted)" }}>Complete production-style projects across the full DevOps lifecycle.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROJECTS.map((project) => (
            <div key={project.title} className="card p-6 group">
              <div className="flex items-center justify-between mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "#2563EB14" }}>
                  <project.icon size={20} style={{ color: "#2563EB" }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "#F9731612", color: "#F97316" }}>
                  {project.tag}
                </span>
              </div>
              <h3 className="font-bold leading-snug" style={{ color: "var(--text)" }}>{project.title}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Certification */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div
          className="rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #172554, #1e3a8a 55%, #0c4a6e)", border: "1px solid rgba(96,165,250,0.35)" }}
        >
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full" style={{ background: "rgba(56,189,248,0.16)", filter: "blur(50px)" }} />
          <div className="relative grid md:grid-cols-[auto_1fr] gap-7 items-center">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)" }}>
              <GraduationCap size={36} style={{ color: "#7dd3fc" }} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#7dd3fc" }}>Certification track</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">AWS Certified Solutions Architect Associate (SAA-C03)</h2>
              <p className="leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.7)" }}>
                Get structured exam preparation, practical labs, and support designed to help you test with confidence.
              </p>
              <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)" }}>
                <Award size={20} style={{ color: "#fbbf24" }} />
                <span className="text-sm font-bold text-white">Free AWS Solutions Architect Associate exam voucher included</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stark teaser */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div
          className="rounded-3xl p-8 sm:p-12 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #020d0d 0%, #071a17 40%, #030f0f 100%)", border: "1px solid rgba(20,184,166,0.25)" }}
        >
          {/* Teal glow blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-20 left-1/4 w-96 h-96 rounded-full" style={{ background: "rgba(20,184,166,0.12)", filter: "blur(70px)" }} />
            <div className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full" style={{ background: "rgba(13,148,136,0.10)", filter: "blur(60px)" }} />
          </div>

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-8">
            {/* Logo mark */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #0d4f4a, #14B8A6)",
                boxShadow: "0 0 40px rgba(20,184,166,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                border: "1px solid rgba(20,184,166,0.4)",
              }}
            >
              <span style={{ fontFamily: "var(--font-orbitron)", fontWeight: 900, fontSize: "28px", color: "#fff", letterSpacing: "-1px" }}>S</span>
            </div>

            <div className="flex-1">
              {/* Name + badge */}
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <h2
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    fontWeight: 900,
                    fontSize: "clamp(28px, 5vw, 40px)",
                    color: "#fff",
                    letterSpacing: "0.05em",
                    lineHeight: 1,
                  }}
                >
                  STARK
                </h2>
                <span
                  style={{
                    fontFamily: "var(--font-orbitron)",
                    fontWeight: 700,
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    color: "#14B8A6",
                    border: "1px solid #14B8A644",
                    background: "#14B8A610",
                    padding: "4px 10px",
                    borderRadius: "99px",
                  }}
                >
                  INCLUDED WITH ENROLLMENT
                </span>
              </div>

              <p className="text-base leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.6)", maxWidth: "580px" }}>
                Join the platform and get access to Stark, your course-aware AI learning assistant. Ask questions about lessons, break down Linux and cloud concepts, review DevOps tools, and get guidance whenever you need it.
              </p>

              <div className="flex flex-wrap gap-2 mb-5">
                {["Course-specific knowledge", "Linux & Cloud Q&A", "DevOps explanations", "Career guidance", "Available to enrolled students"].map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(20,184,166,0.08)", color: "#5eead4", border: "1px solid rgba(20,184,166,0.2)" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <SignUpBtn
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: "#14B8A6", color: "#fff" }}
              >
                Sign in to access Stark
              </SignUpBtn>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials — infinite horizontal marquee */}
      <section className="relative z-10 pb-32">
        <h2 className="text-3xl font-bold text-center mb-3 px-6" style={{ color: "var(--text)" }}>What Students Say</h2>
        <p className="text-center mb-10 text-sm px-6" style={{ color: "var(--text-muted)" }}>Real feedback from Cassandra&apos;s students</p>

        <div className="marquee-wrapper">
          <div className="marquee-track">
            {doubled.map((t, i) => (
              <div
                key={i}
                className="card mx-4 p-6 flex-shrink-0"
                style={{ width: "360px", maxWidth: "90vw", position: "relative" }}
              >
                <Quote size={28} className="mb-3 opacity-20" style={{ color: "#2563EB" }} />
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: "var(--text-muted)", display: "-webkit-box", WebkitLineClamp: 6, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                >
                  {t.text}
                </p>
                <div className="flex items-center gap-3 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
                  >
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>ComplxSimple Student</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#F97316" }}>Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "var(--text)" }}>Programs &amp; tuition</h2>
          <p style={{ color: "var(--text-muted)" }}>
            The DevOps bootcamp and the instructor course are separate programs with different pricing.
          </p>
        </div>

        <div className="card overflow-hidden mb-6">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
            <div className="p-8 sm:p-10" style={{ background: "linear-gradient(145deg, #111827, #172554)", color: "white" }}>
              <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold mb-6" style={{ background: "#2563EB25", border: "1px solid #2563EB55", color: "#93C5FD" }}>
                DevOps bootcamp
              </span>
              <h3 className="text-2xl font-black mb-3">Complete Bootcamp</h3>
              <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.65)" }}>
                Everything included—live training, labs, projects, mentorship, career support, Stark access, and certification preparation.
              </p>
              <p className="text-lg font-bold mb-2">Tuition by cohort</p>
              <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.65)" }}>
                Bootcamp pricing is not the same as the instructor course below. Schedule a free consultation for current tuition, installment plans, and seat availability.
              </p>
              <SignUpBtn
                className="w-full py-3.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", color: "white" }}
              >
                Sign in (invite only)
              </SignUpBtn>
              <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.5)" }}>Next cohort date to be announced</p>
            </div>

            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-3 mb-7">
                <Network size={22} style={{ color: "#2563EB" }} />
                <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>Everything included in the bootcamp</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-7 gap-y-4">
                {PRICING_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "#16A34A16" }}>
                      <Check size={12} strokeWidth={3} style={{ color: "#16A34A" }} />
                    </span>
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="max-w-xl">
            <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold mb-4" style={{ background: "#F9731620", border: "1px solid #F9731644", color: "#F97316" }}>
              Separate program
            </span>
            <h3 className="text-xl font-black mb-2" style={{ color: "var(--text)" }}>Instructor course</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              This is not the DevOps bootcamp. It is Cassandra&apos;s instructor-focused program with its own curriculum and enrollment.
            </p>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <div className="flex items-end gap-2 sm:justify-end mb-1">
              <span className="text-4xl font-black" style={{ color: "var(--text)" }}>$1,600+</span>
              <span className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>one-time</span>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>Installment payment available—contact the administrator for details.</p>
            <a
              href="#info-sessions"
              className="px-6 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] inline-block"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              Inquire about instructor course
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black mb-3" style={{ color: "var(--text)" }}>Frequently asked questions</h2>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>The essentials before you enroll.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.question} className="card group p-5">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold" style={{ color: "var(--text)" }}>
                {faq.question}
                <span className="text-xl transition-transform group-open:rotate-45" style={{ color: "#2563EB" }}>+</span>
              </summary>
              <p className="text-sm leading-relaxed pt-4 pr-8" style={{ color: "var(--text-muted)" }}>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        <div
          className="rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #EFF6FF, #FFF7ED)", border: "1px solid var(--border)" }}
        >
          <div className="absolute -top-16 left-1/4 w-64 h-64 rounded-full" style={{ background: "rgba(37,99,235,0.10)", filter: "blur(50px)" }} />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
              <Rocket size={25} color="white" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black mb-4" style={{ color: "#111827" }}>Start your cloud engineering career</h2>
            <p className="max-w-2xl mx-auto mb-8" style={{ color: "#4B5563" }}>
              Master AWS, Azure, Docker, Kubernetes, Terraform, CI/CD, and DevOps through practical projects and expert mentorship.
            </p>
            <EnrollmentButtons />
          <InviteOnlyNote className="mt-6" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 border-t py-8 text-center text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-3">
          <a
            href="/pamphlet"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", color: "white" }}
          >
            <Download size={15} /> Download Course Guide (PDF)
          </a>
        </div>
        ComplxSimple &mdash; Built with ❤️ for Cassandra Carter&apos;s students
      </footer>
    </div>
  );
}
