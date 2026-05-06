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
  const safeEnd = Number.isFinite(end) ? end : 0;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 2;
  const safeDecimals = Number.isFinite(decimals) && decimals >= 0 ? decimals : 0;

  return (
    <CountUp
      end={safeEnd}
      prefix={prefix}
      suffix={suffix}
      duration={safeDuration}
      decimals={safeDecimals}
      separator={separator}
      enableScrollSpy
      scrollSpyOnce
      className={className}
    />
  );
}
