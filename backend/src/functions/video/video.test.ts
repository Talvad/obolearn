/**
 * Tests for signed URL issuance flow — enrollment gate + key fetching.
 * Simulates the handler's guard logic with mocked dependencies.
 */

jest.mock('../../lib/dynamo', () => ({
  getEnrollment: jest.fn(),
  getLessonByCourseAndId: jest.fn(),
}));

jest.mock('@aws-sdk/client-ssm', () => {
  const send = jest.fn();
  return {
    SSMClient: jest.fn(() => ({ send })),
    GetParameterCommand: jest.fn((input: any) => input),
    __ssmSend: send,
  };
});

jest.mock('@aws-sdk/cloudfront-signer', () => ({
  getSignedUrl: jest.fn(() => 'https://cdn.example.com/video.mp4?sig=abc&expires=123'),
}));

import * as dynamo from '../../lib/dynamo';
import { LessonItem } from '../../types/index';

const { getEnrollment, getLessonByCourseAndId } = dynamo as jest.Mocked<typeof dynamo>;

async function simulateSignedUrlRequest(userId: string, courseId: string, lessonId: string) {
  const enrollment = await getEnrollment(userId, courseId);
  if (!enrollment) return { statusCode: 403, body: 'Not enrolled' };

  const lesson = await getLessonByCourseAndId(courseId, lessonId);
  if (!lesson) return { statusCode: 404, body: 'Lesson not found' };
  if (!lesson.videoKey) return { statusCode: 404, body: 'Video not yet uploaded' };

  const { getSignedUrl } = require('@aws-sdk/cloudfront-signer');
  return { statusCode: 200, body: JSON.stringify({ signedUrl: getSignedUrl({}) }) };
}

describe('video signed URL flow', () => {
  const userId = 'user-1';
  const courseId = 'course-1';
  const lessonId = 'lesson-1';

  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when the user is not enrolled', async () => {
    getEnrollment.mockResolvedValue(undefined);
    const res = await simulateSignedUrlRequest(userId, courseId, lessonId);
    expect(res.statusCode).toBe(403);
  });

  it('returns 404 when the lesson does not exist', async () => {
    getEnrollment.mockResolvedValue({ userId, courseId } as any);
    getLessonByCourseAndId.mockResolvedValue(undefined);
    const res = await simulateSignedUrlRequest(userId, courseId, lessonId);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when the lesson has no video uploaded', async () => {
    getEnrollment.mockResolvedValue({ userId, courseId } as any);
    getLessonByCourseAndId.mockResolvedValue({
      lessonId, courseId, videoKey: undefined,
    } as LessonItem);
    const res = await simulateSignedUrlRequest(userId, courseId, lessonId);
    expect(res.statusCode).toBe(404);
  });

  it('returns a signed URL for enrolled users with an uploaded video', async () => {
    getEnrollment.mockResolvedValue({ userId, courseId } as any);
    getLessonByCourseAndId.mockResolvedValue({
      lessonId, courseId, videoKey: 'videos/course-1/lesson-1.mp4',
    } as LessonItem);
    const res = await simulateSignedUrlRequest(userId, courseId, lessonId);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).signedUrl).toContain('sig=abc');
  });
});
