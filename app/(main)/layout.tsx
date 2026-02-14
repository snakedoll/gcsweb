export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#f8f6f4]">{children}</div>;
}
