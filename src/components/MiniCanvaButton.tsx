import Link from 'next/link';
import {
  Palette,
  Zap,
  Users,
  Award,
} from 'lucide-react';

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  colors: string;
}

const NavButton: React.FC<NavButtonProps> = ({
  icon,
  label,
  description,
  href,
  colors,
}) => (
  <Link href={href}>
    <div
      className={`${colors} rounded-xl p-6 text-white hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer`}
    >
      <div className="flex items-center gap-4">
        <div className="text-4xl">{icon}</div>
        <div>
          <h3 className="text-lg font-bold">{label}</h3>
          <p className="text-sm opacity-90">{description}</p>
        </div>
      </div>
    </div>
  </Link>
);

export const MiniCanvaButton: React.FC = () => {
  return (
    <NavButton
      icon={<Palette size={32} />}
      label="Mini Canva"
      description="Tạo slides chuyên nghiệp với editor kéo thả"
      href="/canva"
      colors="bg-gradient-to-br from-purple-500 to-pink-500"
    />
  );
};

export function FeatureGrid() {
  const features: NavButtonProps[] = [
    {
      icon: <Palette size={32} />,
      label: 'Mini Canva',
      description: 'Tạo slides chuyên nghiệp với editor kéo thả',
      href: '/canva',
      colors: 'bg-gradient-to-br from-purple-500 to-pink-500',
    },
    {
      icon: <Zap size={32} />,
      label: 'Quizzes',
      description: 'Tạo bài kiểm tra trắc nghiệm tương tác',
      href: '/quiz',
      colors: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    },
    {
      icon: <Users size={32} />,
      label: 'Classroom',
      description: 'Quản lý lớp học và học sinh',
      href: '/classroom',
      colors: 'bg-gradient-to-br from-green-500 to-emerald-500',
    },
    {
      icon: <Award size={32} />,
      label: 'Grading',
      description: 'Chấm điểm và theo dõi tiến độ',
      href: '/grading',
      colors: 'bg-gradient-to-br from-orange-500 to-red-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {features.map((feature) => (
        <NavButton key={feature.label} {...feature} />
      ))}
    </div>
  );
}
