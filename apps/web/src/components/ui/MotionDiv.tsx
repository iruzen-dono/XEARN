'use client';

import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { forwardRef } from 'react';

/* ── Presets ───────────────────────────────────── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.25, 0.4, 0.25, 1] } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] } },
};

/* ── MotionDiv with viewport trigger ──────────── */
type MotionDivProps = HTMLMotionProps<'div'> & {
  /** Use one of the preset variant objects, or supply custom */
  preset?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideLeft' | 'slideRight';
  /** Delay in seconds, added to base transition */
  delay?: number;
};

const presetMap: Record<string, Variants> = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideLeft: slideInLeft,
  slideRight: slideInRight,
};

const MotionDiv = forwardRef<HTMLDivElement, MotionDivProps>(
  ({ preset = 'fadeUp', delay, variants, ...props }, ref) => {
    const selected = variants ?? presetMap[preset] ?? fadeUp;
    const delayedVariants = delay
      ? {
          ...selected,
          visible: {
            ...(selected.visible as object),
            transition: {
              ...((selected.visible as Record<string, unknown>)?.transition as object),
              delay,
            },
          },
        }
      : selected;

    return (
      <motion.div
        ref={ref}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={delayedVariants}
        {...props}
      />
    );
  },
);

MotionDiv.displayName = 'MotionDiv';
export default MotionDiv;
