import { useState } from 'react';

export function GameArt({ path, size = 48 }: { path: string; size?: number }) {
  const [failed, setFailed] = useState<string>();
  return (
    <span className="gameArt" style={{ width: size, height: size }} aria-hidden="true">
      {failed === path ? <span className="artFallback">◇</span> : (
        <img src={path} width={size} height={size} alt="" loading="lazy" decoding="async" onError={() => setFailed(path)} />
      )}
    </span>
  );
}
