'use client';

import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

const variants: Variants = {
  hidden: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.4, 0.25, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
