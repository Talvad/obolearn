/**
 * Tests for progress threshold logic and course completion derivation.
 * Exercises the pure logic without hitting DynamoDB.
 */

const COMPLETION_THRESHOLD = 90;

function shouldMarkCompleted(
  existingCompleted: boolean,
  newPercentage: number,
): boolean {
  return existingCompleted || newPercentage >= COMPLETION_THRESHOLD;
}

function isCourseCompleted(
  lessonIds: string[],
  completedSet: Set<string>,
): boolean {
  return lessonIds.length > 0 && lessonIds.every((id) => completedSet.has(id));
}

describe('progress threshold logic', () => {
  it('marks lesson complete when watchPercentage >= 90', () => {
    expect(shouldMarkCompleted(false, 90)).toBe(true);
    expect(shouldMarkCompleted(false, 95)).toBe(true);
    expect(shouldMarkCompleted(false, 100)).toBe(true);
  });

  it('does not mark lesson complete below 90%', () => {
    expect(shouldMarkCompleted(false, 89)).toBe(false);
    expect(shouldMarkCompleted(false, 50)).toBe(false);
    expect(shouldMarkCompleted(false, 0)).toBe(false);
  });

  it('preserves completion once marked (idempotent)', () => {
    // Once completed, stays completed even if new watch is lower
    expect(shouldMarkCompleted(true, 50)).toBe(true);
    expect(shouldMarkCompleted(true, 0)).toBe(true);
  });
});

describe('course completion derivation', () => {
  it('marks course complete when all lessons are completed', () => {
    const lessons = ['l1', 'l2', 'l3'];
    const completed = new Set(['l1', 'l2', 'l3']);
    expect(isCourseCompleted(lessons, completed)).toBe(true);
  });

  it('does not mark course complete if any lesson is incomplete', () => {
    const lessons = ['l1', 'l2', 'l3'];
    const completed = new Set(['l1', 'l2']);
    expect(isCourseCompleted(lessons, completed)).toBe(false);
  });

  it('returns false for a course with no lessons', () => {
    expect(isCourseCompleted([], new Set())).toBe(false);
  });

  it('returns false for a course with no completed lessons', () => {
    const lessons = ['l1', 'l2'];
    expect(isCourseCompleted(lessons, new Set())).toBe(false);
  });
});
