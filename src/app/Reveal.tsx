'use client';

import React, { useEffect, useRef, useState } from 'react';

interface Props {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType; // ← changed from keyof JSX.IntrinsicElements
}

export default function Reveal({ children, delay = 0, className = '', as = 'div' }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const Tag = as; // now directly usable

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLElement>}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ animationDelay: visible ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}