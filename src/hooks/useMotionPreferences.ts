import { useEffect, useState } from 'react';

export interface MotionPreferences {
  /** The viewer has asked for reduced motion; the piece should hold still. */
  reducedMotion: boolean;
  /** The canvas is on screen and the tab is focused; safe to render. */
  visible: boolean;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Two courtesies worth paying: never animate at someone who asked you not to, and
 * never burn GPU on a canvas nobody is looking at.
 *
 * `visible` combines tab focus with an intersection test against the container, so
 * scrolling the piece out of view stops the render loop as surely as switching tabs.
 */
export function useMotionPreferences(
  container: React.RefObject<HTMLElement | null>
): MotionPreferences {
  // Read the media query during initialization rather than in an effect — this is
  // external state that exists before first paint, so there is no need to render
  // once with a wrong value and then correct it.
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion);
  const [onScreen, setOnScreen] = useState(true);
  const [tabActive, setTabActive] = useState(
    () => typeof document === 'undefined' || !document.hidden
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setTabActive(!document.hidden);

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const element = container.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [container]);

  return { reducedMotion, visible: onScreen && tabActive };
}
