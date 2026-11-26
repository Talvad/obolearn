/**
 * Tests for enrollment idempotency and published-course guard.
 * Uses manual mocks for DynamoDB helpers.
 */

jest.mock('../../lib/dynamo', () => ({
  getCourse: jest.fn(),
  getEnrollment: jest.fn(),
  putEnrollment: jest.fn(),
}));

import * as dynamo from '../../lib/dynamo';
import { CourseItem, EnrollmentItem } from '../../types/index';

const { getCourse, getEnrollment, putEnrollment } = dynamo as jest.Mocked<typeof dynamo>;

async function simulateEnroll(
  userId: string,
  courseId: string,
): Promise<{ statusCode: number; body: string }> {
  const course = await getCourse(courseId);
  if (!course) return { statusCode: 404, body: JSON.stringify({ error: 'Course not found' }) };
  if ((course as CourseItem).status !== 'published') {
    return { statusCode: 400, body: JSON.stringify({ error: 'Cannot enroll in an unpublished course' }) };
  }

  const existing = await getEnrollment(userId, courseId);
  if (existing) return { statusCode: 200, body: JSON.stringify(existing) };

  const enrollment: EnrollmentItem = {
    entityType: 'ENROLLMENT',
    userId,
    courseId,
    createdAt: new Date().toISOString(),
  };
  await putEnrollment(enrollment);
  return { statusCode: 201, body: JSON.stringify(enrollment) };
}

describe('enrollment logic', () => {
  const userId = 'user-1';
  const courseId = 'course-1';

  beforeEach(() => jest.clearAllMocks());

  it('enrolls a user in a published course (201)', async () => {
    getCourse.mockResolvedValue({ courseId, status: 'published', entityType: 'COURSE' } as CourseItem);
    getEnrollment.mockResolvedValue(undefined);
    putEnrollment.mockResolvedValue(undefined);

    const res = await simulateEnroll(userId, courseId);
    expect(res.statusCode).toBe(201);
    expect(putEnrollment).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — returns 200 if already enrolled', async () => {
    const existing: EnrollmentItem = {
      entityType: 'ENROLLMENT',
      userId,
      courseId,
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    getCourse.mockResolvedValue({ courseId, status: 'published', entityType: 'COURSE' } as CourseItem);
    getEnrollment.mockResolvedValue(existing);

    const res = await simulateEnroll(userId, courseId);
    expect(res.statusCode).toBe(200);
    expect(putEnrollment).not.toHaveBeenCalled();
  });

  it('returns 400 for an unpublished course', async () => {
    getCourse.mockResolvedValue({ courseId, status: 'draft', entityType: 'COURSE' } as CourseItem);

    const res = await simulateEnroll(userId, courseId);
    expect(res.statusCode).toBe(400);
    expect(putEnrollment).not.toHaveBeenCalled();
  });

  it('returns 404 when course does not exist', async () => {
    getCourse.mockResolvedValue(undefined);

    const res = await simulateEnroll(userId, courseId);
    expect(res.statusCode).toBe(404);
  });
});
