"use client";

export function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden>
      <div className="animated-bg__gradient" />
      <div className="animated-bg__orb animated-bg__orb--1" />
      <div className="animated-bg__orb animated-bg__orb--2" />
      <div className="animated-bg__orb animated-bg__orb--3" />
      <div className="animated-bg__grid" />
    </div>
  );
}
