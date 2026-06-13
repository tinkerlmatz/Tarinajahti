import Link from "next/link";

export default function Placeholder({
  title,
  back = "/game-board",
}: {
  title: string;
  back?: string;
}) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-extrabold text-gold">{title}</h1>
      <p className="text-sm text-cream/60">Tämä näkymä rakennetaan seuraavaksi.</p>
      <Link href={back} className="text-sm text-cream/70 hover:text-gold">
        ← Takaisin
      </Link>
    </main>
  );
}
