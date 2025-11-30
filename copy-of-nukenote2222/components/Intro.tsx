import React, { useEffect, useState } from 'react';

export const Intro = ({ onComplete }: { onComplete: () => void }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(onComplete, 600); // Wait for fade out
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-[100] bg-gray-950 flex items-center justify-center transition-opacity duration-700 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="flex flex-col items-center justify-center select-none">
        <h1 
          className="text-7xl md:text-9xl text-gray-200 animate-intro-scale tracking-tight font-varela font-bold"
        >
          nukenote
        </h1>
      </div>
    </div>
  );
};