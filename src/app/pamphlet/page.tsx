"use client";

import Link from "next/link";
import { Printer } from "lucide-react";

const TRACKS = [
  {
    name: "Linux Administration",
    color: "#F59E0B",
    description: "Master Linux fundamentals, commands, permissions, networking, services, packages, processes, and Bash automation.",
    lessons: ["Linux Fundamentals", "Networking & Services", "Bash Automation", "Mandatory Crossword"],
  },
  {
    name: "AWS Cloud",
    color: "#FF9900",
    description: "Design secure, highly available AWS environments with compute, storage, networking, databases, monitoring, serverless, and infrastructure as code.",
    lessons: ["Core AWS Services", "Highly Available Architecture", "IAM & Networking", "Mandatory Crossword"],
  },
  {
    name: "Microsoft Azure",
    color: "#0078D4",
    description: "Deploy and protect Azure virtual machines, storage, virtual networks, identity, security, and monitoring resources.",
    lessons: ["Azure Foundations", "Secure Azure Networking", "Identity & Monitoring", "Mandatory Crossword"],
  },
  {
    name: "Git and GitHub",
    color: "#6E5494",
    description: "Use Git, GitHub, branches, commits, pull requests, code review, and collaborative workflows.",
    lessons: ["Git Fundamentals", "Branches & Pull Requests", "Team Workflow", "Mandatory Crossword"],
  },
  {
    name: "Docker Containerization",
    color: "#2496ED",
    description: "Package and run applications with Docker images, containers, Dockerfiles, registries, volumes, networks, and Compose.",
    lessons: ["Images & Containers", "Dockerfiles", "Compose & Storage", "Mandatory Crossword"],
  },
  {
    name: "Kubernetes",
    color: "#326CE5",
    description: "Operate containerized applications using Pods, Deployments, Services, ConfigMaps, Secrets, persistent storage, and scaling.",
    lessons: ["Workloads & Services", "Configuration & Secrets", "Scaling & Storage", "Mandatory Crossword"],
  },
  {
    name: "Terraform Infrastructure as Code",
    color: "#7B42BC",
    description: "Provision repeatable cloud infrastructure with providers, resources, variables, modules, plans, and remote state.",
    lessons: ["Terraform Workflow", "Variables & Modules", "Safe State Management", "Mandatory Crossword"],
  },
  {
    name: "Ansible Automation",
    color: "#EE0000",
    description: "Configure Linux systems consistently with inventories, playbooks, modules, tasks, roles, handlers, and idempotent automation.",
    lessons: ["Inventories & Playbooks", "Idempotent Configuration", "Roles & Handlers", "Mandatory Crossword"],
  },
  {
    name: "CI/CD Pipelines",
    color: "#D24939",
    description: "Automate build, test, security, artifact, approval, and deployment stages with Jenkins and GitHub Actions.",
    lessons: ["CI/CD Foundations", "Jenkins", "GitHub Actions", "Mandatory Crossword"],
  },
  {
    name: "Monitoring",
    color: "#E6522C",
    description: "Observe production systems with Prometheus metrics, Grafana dashboards, service-level indicators, and actionable alerts.",
    lessons: ["Metrics & Alerts", "Prometheus", "Grafana Dashboards", "Mandatory Crossword"],
  },
];

export default function PamphletPage() {
  function handlePrint() {
    window.print();
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: #111 !important; }
          .page { box-shadow: none !important; }
          a { color: inherit !important; }
        }
        @page { margin: 1in; }
      `}</style>

      {/* Print/Download button — hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}
        >
          <Printer size={15} /> Print / Save as PDF
        </button>
        <Link href="/" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-70" style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}>
          ← Back
        </Link>
      </div>

      <div className="page max-w-3xl mx-auto px-8 py-12" style={{ background: "white", color: "#111", minHeight: "100vh" }}>
        {/* Header */}
        <div className="text-center mb-10 pb-8 border-b-2" style={{ borderColor: "#2563EB" }}>
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)" }}>
              C
            </div>
            <span className="text-2xl font-black" style={{ background: "linear-gradient(135deg, #2563EB, #F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ComplxSimple
            </span>
          </div>
          <h1 className="text-4xl font-black mt-2" style={{ color: "#111" }}>
            DevOps &amp; Cloud Engineering Bootcamp
          </h1>
          <p className="text-lg mt-2" style={{ color: "#555" }}>
            From beginner fundamentals to job-ready cloud projects
          </p>
        </div>

        {/* About the Course */}
        <section className="mb-10">
          <h2 className="text-xl font-black mb-3" style={{ color: "#111" }}>About ComplxSimple</h2>
          <p className="leading-relaxed" style={{ color: "#444" }}>
            ComplxSimple combines live instruction, recorded sessions, hands-on labs, quizzes, mandatory crosswords, homework, portfolio projects, career support, and Stark AI learning assistance. Students build practical skills across Linux, AWS, Azure, containers, infrastructure as code, automation, CI/CD, and monitoring.
          </p>
        </section>

        {/* About the Instructor */}
        <section className="mb-10 p-6 rounded-xl" style={{ background: "#f8f7ff", border: "2px solid #2563EB33" }}>
          <h2 className="text-xl font-black mb-2" style={{ color: "#111" }}>Your Instructor</h2>
          <p className="text-lg font-bold mb-1" style={{ color: "#2563EB" }}>Cassandra Carter</p>
          <p className="leading-relaxed" style={{ color: "#444" }}>
            Cassandra is a passionate CS educator dedicated to making technical concepts accessible to everyone. She designed ComplxSimple to bridge the gap between theory and hands-on understanding, ensuring every student gets personalized feedback and real-world applicable skills.
          </p>
        </section>

        {/* How It Works */}
        <section className="mb-10">
          <h2 className="text-xl font-black mb-4" style={{ color: "#111" }}>How It Works</h2>
          <div className="space-y-3">
            {[
              ["1. Enroll", "Create your account and reserve a place in the next cohort."],
              ["2. Follow the Roadmap", "Progress through 10 structured DevOps and cloud modules."],
              ["3. Learn Interactively", "Combine live instruction, labs, quizzes, crosswords, homework, and Stark AI support."],
              ["4. Level up & streaks", "Finish each homework assignment to gain a level, and keep a daily learning streak."],
              ["5. Build Your Portfolio", "Complete production-style cloud, automation, CI/CD, and monitoring projects."],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <span className="font-black text-sm flex-shrink-0" style={{ color: "#2563EB" }}>{title}</span>
                <span className="text-sm" style={{ color: "#555" }}>{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Tracks */}
        <section className="mb-10">
          <h2 className="text-xl font-black mb-5" style={{ color: "#111" }}>Course Tracks</h2>
          <div className="space-y-5">
            {TRACKS.map((track) => (
              <div key={track.name} className="pl-4" style={{ borderLeft: `4px solid ${track.color}` }}>
                <h3 className="font-black text-base mb-1" style={{ color: track.color }}>{track.name}</h3>
                <p className="text-sm mb-2" style={{ color: "#444" }}>{track.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {track.lessons.map((l) => (
                    <span key={l} className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${track.color}18`, color: track.color, border: `1px solid ${track.color}33` }}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mb-10 p-6 rounded-xl" style={{ background: "#f8f7ff" }}>
          <h2 className="text-xl font-black mb-3" style={{ color: "#111" }}>Platform Features</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              "Interactive quizzes with instant feedback",
              "Mandatory crosswords and homework",
              "Hands-on cloud labs and projects",
              "Flashcard flip cards for memorization",
              "Assignment levels and daily learning streaks"
              "Personal feedback from Cassandra",
              "Stark course-aware AI assistant",
              "Recorded class sessions",
              "Resume and interview preparation",
              "AWS certification preparation and voucher",
              "Quote of the Week for motivation",
              "Works on phone, tablet, and desktop",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm" style={{ color: "#444" }}>
                <span style={{ color: "#2563EB" }}>✓</span> {f}
              </div>
            ))}
          </div>
        </section>

        {/* Programs & pricing */}
        <section className="text-center py-8 px-6 rounded-xl mb-6" style={{ background: "#2563EB15", border: "2px solid #2563EB33" }}>
          <h2 className="text-2xl font-black mb-2" style={{ color: "#111" }}>DevOps &amp; Cloud Engineering Bootcamp</h2>
          <p className="mb-4 max-w-lg mx-auto" style={{ color: "#555" }}>
            Live training, labs, projects, mentorship, career support, Stark AI, and certification preparation on ComplxSimple.
          </p>
          <p className="text-sm font-semibold" style={{ color: "#111" }}>Bootcamp tuition varies by cohort.</p>
          <p className="text-sm mt-1" style={{ color: "#888" }}>Contact the administrator for current bootcamp pricing and installment options.</p>
        </section>

        <section className="text-center py-8 px-6 rounded-xl" style={{ background: "#FFF7ED", border: "2px solid #F9731633" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#F97316" }}>Separate program</p>
          <h2 className="text-xl font-black mb-2" style={{ color: "#111" }}>Instructor course</h2>
          <p className="text-sm mb-3 max-w-md mx-auto" style={{ color: "#555" }}>
            Not the DevOps bootcamp—a dedicated instructor program with its own enrollment.
          </p>
          <p className="text-3xl font-black" style={{ color: "#2563EB" }}>$1,600+</p>
          <p className="text-sm mt-2" style={{ color: "#888" }}>Installment payment available. Next cohort date to be announced.</p>
        </section>

        {/* Footer */}
        <div className="text-center mt-10 pt-6 border-t text-xs" style={{ borderColor: "#e5e7eb", color: "#999" }}>
          ComplxSimple · Designed and taught by Cassandra Carter · {new Date().getFullYear()}
        </div>
      </div>
    </>
  );
}
