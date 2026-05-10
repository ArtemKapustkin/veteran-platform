import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "fill" | "stroke"> {
  size?: number;
  fill?: string;
  stroke?: string;
  sw?: number;
}

function makeIcon(
  draw: (p: { fill: string }) => React.ReactNode,
  defaults?: { fill?: string; stroke?: string },
) {
  function Icon({
    size = 20,
    fill = defaults?.fill ?? "none",
    stroke = defaults?.stroke ?? "currentColor",
    sw = 1.6,
    ...rest
  }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {draw({ fill })}
      </svg>
    );
  }
  return Icon;
}

export const SearchIcon = makeIcon(() => (
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
));

export const MicIcon = makeIcon(() => (
  <>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </>
));

export const FilterIcon = makeIcon(() => (
  <path d="M3 6h18M6 12h12M10 18h4" />
));

export const ListIcon = makeIcon(() => (
  <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </>
));

export const HeartIcon = makeIcon(() => (
  <path d="M20.8 5.6a5.4 5.4 0 0 0-7.6 0L12 6.7l-1.2-1.1a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 22l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z" />
));

export const HeartFillIcon = makeIcon(
  () => (
    <path
      d="M20.8 5.6a5.4 5.4 0 0 0-7.6 0L12 6.7l-1.2-1.1a5.4 5.4 0 0 0-7.6 7.6l1.2 1.2L12 22l7.6-7.6 1.2-1.2a5.4 5.4 0 0 0 0-7.6z"
      fill="currentColor"
    />
  ),
);

export const GearIcon = makeIcon(() => (
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </>
));

export const AccessIcon = makeIcon(() => (
  <>
    <circle cx="12" cy="4.5" r="1.7" fill="currentColor" stroke="none" />
    <path d="M5 8.5h14M9 22l3-9 3 9M12 13V8.5" />
  </>
));

export const UserIcon = makeIcon(() => (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </>
));

export const UsersIcon = makeIcon(() => (
  <>
    <circle cx="9" cy="9" r="3.2" />
    <path d="M3 20c1.1-3.4 3.5-5 6-5s4.9 1.6 6 5" />
    <circle cx="16.5" cy="10" r="2.4" />
    <path d="M14.7 14.5c2.1-.1 3.7 1 4.6 3" />
  </>
));

export const CloseIcon = makeIcon(() => (
  <path d="M6 6l12 12M18 6L6 18" />
));

export const BackIcon = makeIcon(() => <path d="M15 6l-6 6 6 6" />);
export const ArrowIcon = makeIcon(() => (
  <path d="M5 12h14M13 6l6 6-6 6" />
));
export const ChevronDownIcon = makeIcon(() => <path d="M6 9l6 6 6-6" />);

export const ShareIcon = makeIcon(() => (
  <path d="M12 16V4M8 8l4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
));

export const PinIcon = makeIcon(() => (
  <>
    <path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z" />
    <circle cx="12" cy="10" r="2.5" />
  </>
));

export const CalIcon = makeIcon(() => (
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>
));

export const ClockIcon = makeIcon(() => (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
));

export const WalkIcon = makeIcon(() => (
  <>
    <circle cx="13" cy="4" r="2" />
    <path d="M9 21l3-7-2-3 4-3 3 4 3 1M5 13l3-1 2-3" />
  </>
));

export const PlusIcon = makeIcon(() => <path d="M12 5v14M5 12h14" />);
export const CheckIcon = makeIcon(() => <path d="M5 12l5 5L20 7" />);

export const TgIcon = makeIcon(
  () => (
    <path
      d="M21.5 4.3 2.9 11.5c-1.3.5-1.3 1.2-.2 1.5l4.7 1.5 11-6.9c.5-.3 1-.1.6.2L9.3 15l-.3 4.5c.5 0 .8-.2 1.1-.5l2.6-2.5 5.4 4c1 .5 1.7.3 2-1l3.5-16.4c.4-1.6-.6-2.3-1.6-1.8z"
      fill="currentColor"
    />
  ),
  { stroke: "none" },
);

export const DragIcon = makeIcon(
  () => (
    <>
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </>
  ),
  { stroke: "none", fill: "currentColor" },
);

export const GlobeIcon = makeIcon(() => (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </>
));

export const PhoneIcon = makeIcon(() => (
  <path d="M5 4.5C5 3.7 5.7 3 6.5 3h2.4c.7 0 1.3.5 1.5 1.2l.9 3.3c.1.6-.1 1.2-.6 1.6L9 10.5a13 13 0 0 0 5.5 5.5l1.4-1.7c.4-.5 1-.7 1.6-.6l3.3.9c.7.2 1.2.8 1.2 1.5v2.4c0 .8-.7 1.5-1.5 1.5h-1A16 16 0 0 1 4 5.5v-1z" />
));

export const ShieldCheckIcon = makeIcon(() => (
  <>
    <path d="M12 3 4 6v6c0 4.5 3 8.5 8 9 5-.5 8-4.5 8-9V6l-8-3z" />
    <path d="m9 12 2 2 4-4" />
  </>
));

export const LockIcon = makeIcon(() => (
  <>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>
));

export const SparkleIcon = makeIcon(() => (
  <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l2.8 2.8M15.7 15.7l2.8 2.8M5.5 18.5l2.8-2.8M15.7 8.3l2.8-2.8" />
));
