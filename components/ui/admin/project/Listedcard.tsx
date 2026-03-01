import ProjectCard from './ProjectCard';

type ListedcardVariant = string;

interface ListedcardProps {
  className?: string;
  property1?: ListedcardVariant;
  onContentClick?: () => void;
  onHomeExposeChange?: (checked: boolean) => void;
  onPublicChange?: (checked: boolean) => void;
  actionDisabled?: boolean;
  imageSrc?: string;
  brand?: string;
  title?: string;
  likeCount?: number;
  views?: number;
  postedAt?: string;
  publicExpose?: boolean;
  publicChecked?: boolean;
  publicStatusText?: string;
  projectTags?: string[];
}

export default function Listedcard({
  className,
  property1 = 'project_post',
  onContentClick,
  onHomeExposeChange,
  onPublicChange,
  actionDisabled = false,
  imageSrc = '/assets/images/profile_image.png',
  brand = '팀명',
  title = '프로젝트 제목',
  likeCount = 17,
  views = 393,
  postedAt = '2025.01.04 15:13',
  publicExpose = true,
  publicChecked = true,
  publicStatusText = '공개',
  projectTags = ['2025', '겨울 공모전'],
}: ListedcardProps) {
  if (property1 !== 'project_post') {
    return null;
  }

  return (
    <ProjectCard
      className={className}
      onContentClick={onContentClick}
      onHomeExposeChange={onHomeExposeChange}
      onPublicChange={onPublicChange}
      actionDisabled={actionDisabled}
      imageSrc={imageSrc}
      brand={brand}
      title={title}
      likeCount={likeCount}
      views={views}
      postedAt={postedAt}
      publicExpose={publicExpose}
      publicChecked={publicChecked}
      publicStatusText={publicStatusText}
      projectTags={projectTags}
    />
  );
}
