/**
 * Enrollment handlers.
 *
 * Routes:
 *   POST /enrollments              — enroll in a published course
 *   GET  /enrollments              — list user's enrollments
 *   GET  /enrollments/{courseId}   — check enrollment status for a course
 */

import { getUserId } from "@lib/auth";
import {
  getCourse,
  getEnrollment,
  putEnrollment,
  listEnrollmentsForUser,
} from "@lib/dynamo";
import {
  badRequest,
  notFound,
  ok,
  created,
  internalError,
} from "@lib/response";
import { EnrollmentItem } from "@types-local/index";
import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";

// POST /enrollments
export const enroll: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event,
) => {
  try {
    const userId = getUserId(event);
    const body = parseBody(event);

    if (!body?.courseId) return badRequest("courseId is required");
    const { courseId } = body;

    // Verify course exists and is published
    const course = await getCourse(courseId);
    if (!course) return notFound("Course not found");
    if (course.status !== "published") {
      return badRequest("Cannot enroll in an unpublished course");
    }

    // Idempotent: check if already enrolled
    const existing = await getEnrollment(userId, courseId);
    if (existing) return ok(existing); // already enrolled — 200, not 201

    const enrollment: EnrollmentItem = {
      entityType: "ENROLLMENT",
      userId,
      courseId,
      createdAt: new Date().toISOString(),
    };

    await putEnrollment(enrollment);
    return created(enrollment);
  } catch (err) {
    console.error("enroll error", err);
    return internalError();
  }
};

// GET /enrollments
export const listEnrollments: APIGatewayProxyHandlerV2WithJWTAuthorizer =
  async (event) => {
    try {
      const userId = getUserId(event);
      const enrollments = await listEnrollmentsForUser(userId);
      return ok(enrollments);
    } catch (err) {
      console.error("listEnrollments error", err);
      return internalError();
    }
  };

// GET /enrollments/{courseId}
export const getEnrollmentHandler: APIGatewayProxyHandlerV2WithJWTAuthorizer =
  async (event) => {
    try {
      const userId = getUserId(event);
      const courseId = event.pathParameters?.courseId;
      if (!courseId) return badRequest("courseId is required");

      const enrollment = await getEnrollment(userId, courseId);
      if (!enrollment) return notFound("Not enrolled");

      return ok(enrollment);
    } catch (err) {
      console.error("getEnrollment error", err);
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
