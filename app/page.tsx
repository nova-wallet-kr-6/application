import {
  Bot,
  ShieldCheck,
  Zap,
  QrCode,
  WalletMinimal,
  Sparkles,
} from "lucide-react";
import { CryptoTransfer } from "@/components/CryptoTransfer";
import { ChatDock } from "@/components/ChatDock";

const featureHighlights = [
  {
    icon: Bot,
    title: "Agentic AI",
    description:
      "Gemini-powered AI yang ngerti bahasa natural, siap bantu eksekusi perintah crypto dalam hitungan detik.",
  },
  {
    icon: ShieldCheck,
    title: "Guardian Layer",
    description:
      "Validasi otomatis untuk jaringan, alamat, dan gas fee agar kamu terhindar dari salah kirim.",
  },
  {
    icon: QrCode,
    title: "QRIS Paylink",
    description:
      "Terima Rupiah via QRIS lalu auto-convert jadi crypto favorit langsung ke wallet kamu.",
  },
  {
    icon: WalletMinimal,
    title: "Multi-Wallet Ready",
    description:
      "Satu dashboard buat MetaMask, Phantom, Trust Wallet, dan dompet lain tanpa gonta-ganti tab.",
  },
];

const processSteps = [
  {
    title: "Hubungkan Wallet",
    description:
      "Gunakan RainbowKit untuk connect MetaMask di jaringan Lisk Sepolia atau chain lain.",
  },
  {
    title: "Instruksikan AI",
    description:
      "Ketik perintah seperti “berapa saldo aku?” dan biarkan AI memahami konteksnya.",
  },
  {
    title: "Nova Eksekusi",
    description:
      "Backend menghubungi RPC Blockscout untuk membaca saldo dan mengirimkan jawabannya kembali.",
  },
];

const stats = [
  { label: "Chains", value: "6+" },
  { label: "Wallets", value: "8+" },
  { label: "Latency", value: "<2s" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-sky-500/20 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 lg:px-8 lg:py-24">
        <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-semibold text-indigo-200 ring-1 ring-white/20">
              <Sparkles className="h-4 w-4 text-indigo-300" />
              Agentic Multi-Wallet Orchestrator
            </span>
            <div className="space-y-6">
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Nova Wallet bikin pengalaman crypto{" "}
                <span className="text-indigo-300">sesimpel ngobrol</span>.
              </h1>
              <p className="text-lg text-slate-300">
                Sambungkan wallet, ngobrol dengan AI, dan biarkan Nova
                mengeksekusi instruksi mulai dari cek saldo sampai transfer antar
                chain—tanpa drama, tanpa takut salah jaringan.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a
                href="#app"
                className="inline-flex items-center justify-center rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
              >
                Mulai Eksplorasi
              </a>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5 text-center shadow-lg shadow-black/10"
                >
                  <p className="text-2xl font-semibold text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div id="app" className="relative">
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-60 blur-2xl" />
            <div className="relative rounded-3xl border border-white/10 bg-slate-900/80 p-1 shadow-2xl backdrop-blur">
              <div className="rounded-[22px] bg-white p-6 text-slate-900 shadow-xl sm:p-8">
                <CryptoTransfer />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Kenapa Nova
            </p>
            <h2 className="text-3xl font-semibold text-white">
              AI + Guardian Layer = pengalaman crypto anti-ribet
            </h2>
            <p className="text-slate-300">
              Setiap perintah kamu diterjemahkan ke aksi yang aman dan efisien.
              Nova mengecek jaringan, saldo, gas fee, bahkan memberi opsi
              terbaik sebelum transaksi kejadian.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {featureHighlights.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10 transition hover:border-indigo-400/50 hover:bg-white/10"
              >
                <feature.icon className="mb-4 h-10 w-10 text-indigo-300" />
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-900/80 p-8 shadow-2xl">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Cara kerja
              </p>
              <h2 className="text-3xl font-semibold text-white">
                Tiga langkah untuk cek saldo via Gemini AI
              </h2>
              <p className="text-slate-300">
                Fokus awal kita: bikin AI bisa menjawab "berapa saldo wallet aku
                di Lisk Sepolia?" dengan memanfaatkan RPC Blockscout.
              </p>
            </div>
            <div className="flex-1 space-y-6">
              {processSteps.map((step, idx) => (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-200">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <ChatDock />
    </main>
  );
}