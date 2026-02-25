import Image from 'next/image';

interface MemberProfileCardProps {
  name: string;
  email: string;
  isSeller?: boolean;
  profileImage?: string;
}

export default function MemberProfileCard({ name, email, isSeller, profileImage }: MemberProfileCardProps) {
  return (
    <div className="p-4 rounded-2xl flex items-center w-full">
      <div className="flex gap-[32px] items-center w-full">
        <div className="relative rounded-full overflow-hidden w-[100px] h-[100px] flex-shrink-0 bg-neutral-4">
          <Image
            src={profileImage || '/assets/images/default-avatar.svg'}
            alt="프로필 이미지"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col gap-1 py-3">
          <div className="flex gap-2 items-center">
            <span className="font-bold text-[17px] leading-[1.5] text-[#3f3835]">{name}</span>
            {isSeller && (
              <span className="bg-[#fac0a1] rounded-[8px] px-2 py-[2px] flex items-center justify-center">
                <span className="text-[#cf5d1f] text-[13px] font-normal leading-[1.5] tracking-[-0.26px]">판매자</span>
              </span>
            )}
          </div>
          <span className="text-[15px] leading-[1.5] text-[#5a5451]">{email}</span>
        </div>
      </div>
    </div>
  );
}
