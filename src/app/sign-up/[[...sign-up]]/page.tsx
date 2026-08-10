import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">ComplxSimpleLearn</h1>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Accept your invitation — set your name and password to join
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              card: "card shadow-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
            },
          }}
        />
      </div>
    </div>
  );
}
