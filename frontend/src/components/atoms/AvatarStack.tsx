import { Avatar, type AvatarTone } from "./Avatar";

export interface AvatarStackPerson {
  initial: string;
  tone: AvatarTone;
}

export function AvatarStack({
  people,
  size = 28,
  max = 3,
}: {
  people: AvatarStackPerson[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  return (
    <div className="inline-flex items-center" aria-hidden>
      {shown.map((p, i) => (
        <Avatar
          key={i}
          initial={p.initial}
          tone={p.tone}
          size={size}
          style={{ marginLeft: i === 0 ? 0 : -size * 0.35 }}
        />
      ))}
    </div>
  );
}
