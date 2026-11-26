/**
 * Progress tracking handlers.
 *
 * Routes:
 *   PUT /progress/{courseId}/{lessonId}  — upsert lesson progress
 *   GET /progress/{courseId}             — all progress for a course
 *
 * Completion rules:
 *   Lesson complete:  watchPercentage >= 90
 *   Course complete:  all lessons completed
 */

import { getUserId } from "@lib/auth";
import {
  getEnrollment,
  getProgress,
  putProgress,
  listLessons,
  listProgressForCourse,
} from "@lib/dynamo";
import { badRequest, forbidden, internalError, ok } from "@lib/response";
import { ProgressItem } from "@types-local/index";

import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";

const COMPLETION_THRESHOLD = 90;

// PUT /progress/{courseId}/{lessonId}
export const updateProgress: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event,
) => {
  try {
    const userId = getUserId(event);
    const { courseId, lessonId } = event.pathParameters ?? {};
    if (!courseId || !lessonId)
      return badRequest("courseId and lessonId are required");

    // Only enrolled users can record progress
    const enrollment = await getEnrollment(userId, courseId);
    if (!enrollment) return forbidden("Not enrolled in this course");

    const body = parseBody(event);
    if (
      !body ||
      typeof body.watchPercentage !== "number" ||
      typeof body.lastPositionSeconds !== "number"
    ) {
      return badRequest(
        "watchPercentage and lastPositionSeconds (numbers) are required",
      );
    }

    const watchPercentage = Math.min(100, Math.max(0, body.watchPercentage));
    const lastPositionSeconds = Math.max(
      0,
      Math.round(body.lastPositionSeconds),
    );

    // Fetch existing progress to preserve `completed` once it's set
    const existing = await getProgress(userId, courseId, lessonId);
    const newlyCompleted = watchPercentage >= COMPLETION_THRESHOLD;
    const completed = Boolean(existing?.completed) || newlyCompleted;

    const progress: ProgressItem = {
      entityType: "PROGRESS",
      userId,
      courseId,
      lessonId,
      watchPercentage,
      lastPositionSeconds,
      completed,
      updatedAt: new Date().toISOString(),
    };

    await putProgress(progress);
    return ok(progress);
  } catch (err) {
    console.error("updateProgress error", err);
    return internalError();
  }
};

// GET /progress/{courseId}
export const getCourseProgress: APIGatewayProxyHandlerV2WithJWTAuthorizer =
  async (event) => {
    try {
      const userId = getUserId(event);
      const courseId = event.pathParameters?.courseId;
      if (!courseId) return badRequest("courseId is required");

      const enrollment = await getEnrollment(userId, courseId);
      if (!enrollment) return forbidden("Not enrolled in this course");

      const [lessons, progress] = await Promise.all([
        listLessons(courseId),
        listProgressForCourse(userId, courseId),
      ]);

      const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));
      const allLessonsCompleted =
        lessons.length > 0 &&
        lessons.every(
          (l) => progressByLesson.get(l.lessonId)?.completed === true,
        );

      return ok({
        courseId,
        lessons: progress,
        totalLessons: lessons.length,
        completedLessons: lessons.filter(
          (l) => progressByLesson.get(l.lessonId)?.completed,
        ).length,
        courseCompleted: allLessonsCompleted,
      });
    } catch (err) {
      console.error("getCourseProgress error", err);
      return internalError();
    }
  };

function parseBody(
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Record<string, any> | null {
  try {
    return event.body ? JSON.parse(event.body) : null;
  } catch {
    return null;
  }
}
