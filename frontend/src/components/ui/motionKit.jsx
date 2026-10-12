import React, { useEffect, useRef } from 'react';
import { animate, stagger, motion, useInView, useReducedMotion, useScroll, useSpring } from 'motion/react';

export const EASE = [0.16, 1, 0.3, 1];
export const SPRING = { type: 'spring', stiffness: 400, damping: 32 };

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Children appear one after another when the group scrolls into view. */
export function Stagger({ children, className = '', as = 'div', gap = 0.08, delay = 0 }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ children, className = '', as = 'div', y = 22 }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      variants={{ hidden: { opacity: 0, y }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
    >
      {children}
    </Tag>
  );
}

/** A surface that lifts toward the pointer and presses in on tap. */
export function HoverLift({ children, className = '', as = 'div', lift = 5, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      whileHover={reduce ? undefined : { y: -lift }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      transition={SPRING}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Counts up to a number once it is on screen. */
export function CountUp({ to, duration = 1.4, className = '', suffix = '', decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView || !ref.current) return;
    if (reduce) { ref.current.textContent = `${to.toFixed(decimals)}${suffix}`; return; }
    const controls = animate(0, to, {
      duration,
      ease: EASE,
      onUpdate: (v) => { if (ref.current) ref.current.textContent = `${v.toFixed(decimals)}${suffix}`; },
    });
    return () => controls.stop();
  }, [inView, to, duration, suffix, decimals, reduce]);
  return <span ref={ref} className={className}>{`${(0).toFixed(decimals)}${suffix}`}</span>;
}

/** Thin progress bar showing how far down the page you are. */
export function ScrollProgress({ className = '' }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  return <motion.div aria-hidden="true" style={{ scaleX, transformOrigin: '0% 50%' }} className={`fixed inset-x-0 top-0 z-[60] h-1 bg-eg-teal ${className}`} />;
}

const CARD_SELECTOR = '[class*="rounded-2xl"][class*="border"], [class*="rounded-2xl"][class*="bg-white"], [class*="rounded-xl"][class*="border"]';

/**
 * Brings every top-level card on a portal page in with a short stagger.
 * Works on the DOM directly so it applies to every page without editing each one.
 */
export function enterCards(root) {
  if (!root || prefersReducedMotion()) return;
  const all = [...root.querySelectorAll(CARD_SELECTOR)];
  const top = all.filter((el) => !el.parentElement.closest(CARD_SELECTOR)).slice(0, 30);
  if (!top.length) return;
  const controls = animate(
    top,
    { opacity: [0, 1], y: [16, 0] },
    { duration: 0.5, ease: EASE, delay: stagger(Math.min(0.05, 0.45 / top.length)) }
  );
  const clear = () => top.forEach((el) => { el.style.opacity = ''; el.style.transform = ''; });
  controls.then(clear, clear);
}

/** Brings the direct children of an element in one after another (forms, tile grids). */
export function enterChildren(el, { y = 14, delay = 0.1 } = {}) {
  if (!el || prefersReducedMotion()) return;
  const kids = [...el.children];
  if (!kids.length) return;
  const controls = animate(kids, { opacity: [0, 1], y: [y, 0] }, { duration: 0.5, ease: EASE, delay: stagger(0.07, { startDelay: delay }) });
  const clear = () => kids.forEach((k) => { k.style.opacity = ''; k.style.transform = ''; });
  controls.then(clear, clear);
}
