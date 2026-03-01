'use client';

import CountUp from 'react-countup';

interface AnimatedCounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  separator?: string;
  className?: string;
}

export default function AnimatedCounter({
  end,
  prefix = '',
  suffix = '',
  duration = 2,
  decimals = 0,
  separator = ' ',
  className,
}: AnimatedCounterProps) {
  return (
    <CountUp
      end={end}
      prefix={prefix}
      suffix={suffix}
      duration={duration}
      decimals={decimals}
      separator={separator}
      enableScrollSpy
      scrollSpyOnce
      className={className}
    />
  );
}
