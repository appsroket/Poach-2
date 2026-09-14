const ITEMS = [
  "Jobs that never hit the boards",
  "Apply direct to the hiring manager",
  "3.2× higher reply rate",
  "Real jobs, not ghost listings",
];

export function Marquee() {
  // Rendered twice back-to-back so the -50% translate loops seamlessly.
  const sequence = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee-group relative flex overflow-hidden border-y border-white/10 py-5">
      <div className="flex w-max shrink-0 animate-marquee items-center">
        {sequence.map((item, i) => (
          <div key={i} className="flex items-center whitespace-nowrap">
            <span className="px-8 text-sm font-medium text-muted">{item}</span>
            <span className="text-accent" aria-hidden>
              •
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
