interface MemberPageIntroProps {
  description: string;
}

export default function MemberPageIntro({ description }: MemberPageIntroProps) {
  return <p className="text-sm leading-relaxed text-apex-body sm:text-base">{description}</p>;
}
