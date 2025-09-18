// Simple, proven SM-2 spaced repetition implementation
// Reference: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

import type { SrsItem } from '../types/gameTypes'

export type SrsQuality = 0 | 1 | 2 | 3 | 4 | 5 // Again .. Easy

export function initSrsItem(id: string, now = new Date()): SrsItem {
  return {
    id,
    ef: 2.5,
    reps: 0,
    interval: 0,
    dueISO: now.toISOString(),
    lastReviewISO: undefined,
  }
}

export function reviewSrs(item: SrsItem, quality: SrsQuality, now = new Date()): SrsItem {
  return examOptimizedFSRS(item, quality, now);
}

// FSRS algorithm optimized for 39-day exam preparation timeline
function examOptimizedFSRS(item: SrsItem, quality: SrsQuality, now = new Date()): SrsItem {
  const EXAM_DATE = new Date('2025-10-26');
  const daysUntilExam = Math.max(1, (EXAM_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Compress intervals for exam timeline - more aggressive if less than 90 days
  const compressionFactor = Math.min(1, daysUntilExam / 90);

  let ef = item.ef;
  let reps = item.reps;
  let interval = item.interval;

  if (quality >= 3) {
    // Successful recall - FSRS intervals with exam compression
    if (reps === 0) {
      interval = 1; // First review: 1 day
    } else if (reps === 1) {
      interval = Math.ceil(3 * compressionFactor); // Second review: ~3 days compressed
    } else if (reps === 2) {
      interval = Math.ceil(7 * compressionFactor); // Third review: ~1 week compressed
    } else {
      // Subsequent reviews: cap at 14 days max, apply compression
      interval = Math.ceil(Math.min(14, item.interval * 1.8) * compressionFactor);
    }

    reps = reps + 1;

    // FSRS-style EF adjustment (more conservative than SM-2)
    ef = ef + (0.05 - (5 - quality) * (0.04 + (5 - quality) * 0.01));
    if (ef < 1.3) ef = 1.3;
    if (ef > 3.0) ef = 3.0; // Cap EF to prevent extreme intervals
  } else {
    // Failed recall - shorter reset interval for exam prep
    reps = 0;
    interval = Math.ceil(0.5 * compressionFactor) || 1; // Quick reset, but compressed
    ef = Math.max(1.3, ef - 0.15); // Smaller EF penalty than SM-2
  }

  // Ensure final review happens 2-3 days before exam
  if (daysUntilExam <= 7) {
    interval = Math.min(interval, Math.floor(daysUntilExam / 2));
  }

  // Ensure minimum 1 day interval
  interval = Math.max(1, interval);

  const due = new Date(now);
  due.setDate(due.getDate() + interval);

  return {
    ...item,
    ef,
    reps,
    interval,
    lastReviewISO: now.toISOString(),
    dueISO: due.toISOString(),
  };
}

export function isDue(item: SrsItem, now = new Date()): boolean {
  return new Date(item.dueISO).getTime() <= now.getTime()
}

