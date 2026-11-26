'use client';

/**
 * VideoPlayer — Task 10.
 *
 * - Resumes from lastPositionSeconds on load.
 * - Syncs progress every SYNC_INTERVAL_SECONDS and on pause/end.
 * - Reports watchPercentage as (currentTime / duration * 100).
 */

import { useRef, useEffect, useCallback, useState } from 'react';

interface VideoPlayerProps {
  signedUrl: string;
  courseId: string;
  lessonId: string;
  lastPositionSeconds?: number;
  token: string;
  onLessonComplete?: () => void;
}

const SYNC_INTERVAL_SECONDS = 10;
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export function VideoPlayer({
  signedUrl,
  courseId,
  lessonId,
  lastPositionSeconds = 0,
  token,
  onLessonComplete,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncedAt = useRef<number>(0);
  const isSyncing = useRef(false);
  const hasCalledComplete = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);

  /** Send progress to the backend. */
  const syncProgress = useCallback(
    async (video: HTMLVideoElement) => {
      if (isSyncing.current || !video.duration) return;
      isSyncing.current = true;

      const watchPercentage = (video.currentTime / video.duration) * 100;
      const lastPositionSecs = Math.round(video.currentTime);

      try {
        const res = await fetch(`${API_URL}/progress/${courseId}/${lessonId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ watchPercentage, lastPositionSeconds: lastPositionSecs }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.completed && !hasCalledComplete.current) {
            hasCalledComplete.current = true;
            onLessonComplete?.();
          }
        }
      } catch {
        // Non-fatal: progress sync failures should not interrupt playback
      } finally {
        isSyncing.current = false;
      }
    },
    [courseId, lessonId, token, onLessonComplete],
  );

  /** Resume from last position once metadata is available. */
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (lastPositionSeconds > 0 && lastPositionSeconds < video.duration - 2) {
      video.currentTime = lastPositionSeconds;
    }
    setIsLoaded(true);
  }, [lastPositionSeconds]);

  /** Throttled timeupdate handler — syncs every SYNC_INTERVAL_SECONDS. */
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime - lastSyncedAt.current >= SYNC_INTERVAL_SECONDS) {
      lastSyncedAt.current = video.currentTime;
      syncProgress(video);
    }
  }, [syncProgress]);

  /** Sync on pause. */
  const handlePause = useCallback(() => {
    const video = videoRef.current;
    if (video) syncProgress(video);
  }, [syncProgress]);

  /** Sync on end (100% watch). */
  const handleEnded = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Force 100% on ended
    isSyncing.current = false;
    syncProgress(video);
  }, [syncProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [handleLoadedMetadata, handleTimeUpdate, handlePause, handleEnded]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-white/20 border-t-white" aria-label="Loading video" />
        </div>
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={signedUrl}
        controls
        className="w-full h-full"
        playsInline
        preload="metadata"
        aria-label="Course video player"
      />
    </div>
  );
}
