// Authenticated app shell. Session gating and the onboarding redirect are
// implemented in Prompt 2 (see middleware.ts). This is the layout placeholder.
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen">{children}</div>;
}
