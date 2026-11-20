import { useEffect, useRef, useState } from 'react';
import { artSrc } from '../ui/warmArt';
import { lightHaptic } from '../telegram/client';
import {
  buildSkinLottieBytes, loadSkinRigData, loadTlottieEngine, type SkinSelection,
} from './skinRig';

export function OwlSkinCanvas({
  selection,
  size = 136,
  animate = true,
  className = '',
}: {
  selection: SkinSelection;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const replayRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const selectionKey = `${selection.body ?? ''}|${selection.chest ?? ''}|${selection.hat ?? ''}|${selection.glasses ?? ''}|${selection.eyes ?? ''}`;

  useEffect(() => {
    let active = true;
    let instance = 0;
    let raf = 0;
    let timer = 0;
    let engineRef: Awaited<ReturnType<typeof loadTlottieEngine>> | null = null;
    replayRef.current = null;

    const stopPlayback = () => {
      if (raf) cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
      raf = 0;
      timer = 0;
    };

    const cleanupAnim = () => {
      stopPlayback();
      replayRef.current = null;
      if (instance && engineRef) {
        try { engineRef.tlottie_drop(instance); } catch { /* ignore */ }
        instance = 0;
      }
    };

    void Promise.all([loadSkinRigData(), loadTlottieEngine()])
      .then(([data, engine]) => {
        if (!active) return;
        engineRef = engine;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const bytes = buildSkinLottieBytes(data, selection);
        if (!bytes) return;

        const ptr = engine.tlottie_alloc(bytes.length);
        if (!ptr) throw new Error('tlottie allocation failed');
        new Uint8Array(engine.memory.buffer, ptr, bytes.length).set(bytes);
        instance = engine.tlottie_new(ptr, bytes.length);
        engine.tlottie_free(ptr, bytes.length);
        if (!instance) throw new Error('tlottie invalid animation');

        const frameRate = engine.tlottie_frame_rate(instance) || 60;
        const frameCount = engine.tlottie_frame_count(instance) || 1;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const px = Math.min(384, Math.max(128, Math.round(size * dpr)));
        if (canvas.width !== px) canvas.width = px;
        if (canvas.height !== px) canvas.height = px;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2d context unavailable');

        let cachedImage: ImageData | null = null;
        let cachedPtr = 0;
        let cachedBuf: ArrayBuffer | null = null;

        const drawFrame = (frame: number) => {
          if (!instance || !active) return;
          const outPtr = engine.tlottie_render(instance, frame, px, px, 1);
          if (!outPtr) return;
          const buf = engine.memory.buffer;
          if (!cachedImage || outPtr !== cachedPtr || buf !== cachedBuf) {
            cachedImage = new ImageData(new Uint8ClampedArray(buf, outPtr, px * px * 4), px, px);
            cachedPtr = outPtr;
            cachedBuf = buf;
          }
          ctx.putImageData(cachedImage, 0, 0);
        };

        drawFrame(0);
        setFailed(false);
        setReady(true);

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (!animate || reduceMotion || frameCount <= 1) return;

        const playOnce = () => {
          if (!active || !instance) return;
          stopPlayback();
          let position = 0;
          let lastFrame = -1;
          let lastTime = 0;

          const tick = (now: number) => {
            if (!active) return;
            if (document.hidden) {
              lastTime = 0;
              timer = window.setTimeout(() => { raf = requestAnimationFrame(tick); }, 250);
              return;
            }
            const dt = lastTime ? Math.min(now - lastTime, 100) * 0.001 : 0;
            lastTime = now;
            position += dt * frameRate;

            if (position >= frameCount) {
              drawFrame(0);
              stopPlayback();
              return;
            }

            const nextFrame = position | 0;
            if (nextFrame !== lastFrame) {
              lastFrame = nextFrame;
              drawFrame(nextFrame);
            }
            raf = requestAnimationFrame(tick);
          };

          raf = requestAnimationFrame(tick);
        };

        replayRef.current = playOnce;
        playOnce();
      })
      .catch(() => {
        if (!active) return;
        setFailed(true);
      });

    return () => {
      active = false;
      cleanupAnim();
    };
  }, [selectionKey, size, animate]);

  const handleTap = () => {
    if (!ready || failed || !replayRef.current) return;
    lightHaptic();
    replayRef.current();
  };

  return <div
    className={`skinOwlRender ${className}`}
    data-ready={ready || undefined}
    data-interactive={ready && !failed ? 'true' : undefined}
    onClick={handleTap}
  >
    <canvas ref={canvasRef} className={ready ? 'isReady' : undefined} aria-hidden="true"/>
    {failed && <img src={artSrc('/game/skins/7895.png')} alt="" width={size} height={size}
      className="skinOwlFallback"/>}
  </div>;
}
