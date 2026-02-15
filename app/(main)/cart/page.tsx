import { NavBar } from '@/components/layout';

export default function CartPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <NavBar />
      <div className="flex flex-1 items-center justify-center px-4">
        <p className="text-sm text-neutral-7">장바구니가 비어 있습니다.</p>
      </div>
    </div>
  );
}
