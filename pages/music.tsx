import React from 'react';
import Image from 'next/image';

const MusicPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      {/* Viewport content */}
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-5xl font-bold text-white mt-2 mb-8 text-center">
          Go vote for 83a, 83b, 83c!
        </h1>
        <p className="text-3xl text-gray-400 mb-12">
          Comment "83a, 83b, 83c" on the pinned tweet on my profile.
        </p>
        <div className="max-w-xl w-full">
          <div className="relative aspect-[3/4] w-full">
            <Image
              src="/postcards.jpg"
              alt="HEX postcards"
              fill
              className="object-cover rounded-lg shadow-xl"
            />
          </div>
        </div>
      </div>
      
      {/* Video section */}
      <div className="w-full p-4 flex justify-center">
        <div className="max-w-3xl w-full aspect-video">
          <iframe
            className="w-full h-full rounded-lg shadow-2xl"
            src="https://www.youtube.com/embed/UlZYU5t4__0"
            title="DECI Music Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      
      {/* Small spacer below */}
      <div className="h-[20vh]" />
    </div>
  );
};

export default MusicPage; 