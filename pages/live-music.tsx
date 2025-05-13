import React, { useState } from 'react';

interface AudioFile {
  name: string;
  url: string;
}

// Hardcoded list of songs (case-sensitive, as in Supabase)
const SONGS = [
  '1.mp3',
  '2.mp3',
  'Aeon.mp3',
  'base2.mp3',
  'deci.mp3',
  'Firebird.mp3',
  'lucky.mp3',
  'maxi.mp3',
  'Mercenary.mp3',
  'Night Force.mp3',
  'Resurrection.mp3',
  'Star Fighter.mp3',
  'trio.mp3',
  'Wolf.mp3',
];

const getPublicUrl = (fileName: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio/${encodeURIComponent(fileName)}`;

const LiveMusic: React.FC = () => {
  const audioFiles: AudioFile[] = SONGS.map(name => ({ name, url: getPublicUrl(name) }));
  const [selected, setSelected] = useState<AudioFile | null>(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-6">Live Music Player</h1>
      <div className="w-full max-w-md">
        <ul className="mb-6 divide-y divide-gray-700 rounded-lg overflow-hidden bg-gray-800">
          {audioFiles.map((file) => (
            <li
              key={file.name}
              className={`p-4 cursor-pointer hover:bg-gray-700 transition ${selected?.name === file.name ? 'bg-gray-700' : ''}`}
              onClick={() => setSelected(file)}
            >
              {file.name.replace('.mp3', '')}
            </li>
          ))}
        </ul>
        {selected && (
          <div className="flex flex-col items-center">
            <div className="mb-2 text-lg font-semibold">Now Playing: {selected.name.replace('.mp3', '')}</div>
            <audio src={selected.url} controls autoPlay loop className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMusic; 