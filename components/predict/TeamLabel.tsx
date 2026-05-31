import type { Team } from "@/lib/types";

export function TeamLabel({
  team,
  className = "",
}: {
  team: Team | undefined | null;
  className?: string;
}) {
  if (!team) return <span className={`text-[var(--muted)] ${className}`}>—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden>{team.flag_emoji}</span>
      <span>{team.name}</span>
    </span>
  );
}
