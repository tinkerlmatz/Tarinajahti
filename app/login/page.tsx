import Logo from "@/components/Logo";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-full flex-col items-center justify-center overflow-hidden p-6">
      {/* taustan hehkuvat tähdet */}
      <Sparkles />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo size="lg" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-cream">
              Lähiympäristösi on täynnä{" "}
              <span className="text-gold">tarinoita.</span>
            </p>
            <p className="text-sm text-cream/60">
              Löydä, jaa ja elä tarinat yhdessä.
            </p>
          </div>
        </div>

        <div className="card w-full p-6 shadow-glow">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

function Sparkles() {
  const dots = [
    { top: "12%", left: "18%", d: "0s", s: "h-1 w-1" },
    { top: "22%", left: "78%", d: "0.6s", s: "h-1.5 w-1.5" },
    { top: "68%", left: "12%", d: "1.2s", s: "h-1 w-1" },
    { top: "80%", left: "82%", d: "0.3s", s: "h-1.5 w-1.5" },
    { top: "45%", left: "90%", d: "0.9s", s: "h-1 w-1" },
    { top: "55%", left: "6%", d: "1.5s", s: "h-1 w-1" },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {dots.map((dot, i) => (
        <span
          key={i}
          className={`absolute rounded-full bg-gold ${dot.s} animate-twinkle shadow-glow`}
          style={{ top: dot.top, left: dot.left, animationDelay: dot.d }}
        />
      ))}
    </div>
  );
}
