import './GradientText.css';
import type { ReactNode } from 'react';

type GradientTextProps = {
  children?: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
};

export default function GradientText({
  children,
  className = 'ml-0 mr-0',
  // default gradient: green -> cyan -> purple
  colors = ['#10B981', '#06B6D4', '#7C3AED'],
  animationSpeed = 8,
  showBorder = false
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(', ')})`,
    animationDuration: `${animationSpeed}s`
  };

  return (
    <div className={`animated-gradient-text ${className}`}>
      {showBorder && <div className="gradient-overlay" style={gradientStyle}></div>}
      <div className="text-content" style={gradientStyle}>
        {children}
      </div>
    </div>
  );
}
