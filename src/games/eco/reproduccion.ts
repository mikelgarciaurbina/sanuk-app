import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';

import { restoreAudio, type Take } from './captura';

type PlaybackOptions = {
  onStart?: () => void;
  onProgress?: (fraction: number) => void;
  onEnd: () => void;
  onError: () => void;
};

/** Reproduce un archivo finalizado; su cursor y su final vienen del reproductor, no de una estimación. */
export function playTake(take: Take, options: PlaybackOptions): () => void {
  let player: AudioPlayer | null = null;
  let subscription: ReturnType<AudioPlayer['addListener']> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let started = false;
  let ready = false;
  let resolveLoaded: (() => void) | undefined;

  const dispose = () => {
    clearTimeout(timer);
    subscription?.remove();
    subscription = undefined;
    try { player?.pause(); } catch {}
    try { player?.remove(); } catch {}
    player = null;
    resolveLoaded?.();
    resolveLoaded = undefined;
  };
  const end = (error: boolean) => {
    if (closed) return;
    closed = true;
    dispose();
    if (error) options.onError();
    else {
      options.onProgress?.(1);
      options.onEnd();
    }
  };
  const observe = (status: AudioStatus) => {
    if (closed) return;
    if (status.error || status.playbackState === 'error') { end(true); return; }
    if (status.isLoaded) resolveLoaded?.();
    if (!ready) return;
    if (!started && status.playing) {
      started = true;
      options.onStart?.();
    }
    if (started && status.duration > 0) options.onProgress?.(Math.max(0, Math.min(1, status.currentTime / status.duration)));
    if (status.didJustFinish) end(false);
  };
  const run = async () => {
    if (!take.uri) { end(true); return; }
    await restoreAudio();
    if (closed) return;
    player = createAudioPlayer(take.uri, { updateInterval: 50, keepAudioSessionActive: true });
    player.volume = 1;
    player.muted = false;
    player.loop = false;
    subscription = player.addListener('playbackStatusUpdate', observe);
    // Un archivo que no carga debe dar un aviso; no simular que se ha escuchado.
    timer = setTimeout(() => end(true), 8000);
    if (!player.isLoaded) await new Promise<void>((resolve) => {
      resolveLoaded = resolve;
      if (player?.isLoaded || closed) resolve();
    });
    if (closed || !player) return;
    await player.seekTo(0);
    if (closed || !player) return;
    clearTimeout(timer);
    // Solo protege frente a un reproductor bloqueado. Nunca adelanta el final de una grabación.
    timer = setTimeout(() => end(true), Math.max(30000, player.duration * 1000 + 15000));
    ready = true;
    player.play();
  };
  void run().catch(() => end(true));
  return () => {
    if (closed) return;
    closed = true;
    dispose();
  };
}
