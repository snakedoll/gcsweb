import Image from 'next/image';

interface MemberProfileCardProps {
  name: string;
  email: string;
  isSeller?: boolean;
  profileImage?: string;
}

export default function MemberProfileCard({ name, email, isSeller, profileImage }: MemberProfileCardProps) {
  return (
    <div className="flex gap-8 items-center w-full">
      <div className="relative rounded-full overflow-hidden w-[100px] h-[100px] flex-shrink-0">
        <Image
          src={profileImage || '/assets/images/default-avatar.svg'}
          alt="프로필 이미지"
          fill
          className="object-cover"
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-2 items-center">
          <span className="font-bold text-[17px] leading-[1.5] text-[#3F3835]">{name}</span>
          {isSeller && (
            <span className="bg-[#FAC0A1] rounded-lg px-2 py-0.5 flex items-center justify-center gap-1">
              <span className="text-[#CF5D1F] text-[13px] font-normal leading-[1.5]">판매자</span>
            </span>
          )}
        </div>
        <span className="text-[15px] leading-[1.5] text-[#5A5451]">{email}</span>
      </div>
    </div>
  );
}
