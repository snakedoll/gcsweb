import { NavBar } from '@/components/layout';

export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#f8f6f4]">
      <NavBar />
      <div className="flex-1" />
    </div>
  );
}
