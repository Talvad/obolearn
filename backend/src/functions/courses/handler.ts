/**
 * Course CRUD handlers.
 *
 * Routes:
 *   POST   /courses              — admin: create a draft course
 *   GET    /courses              — public: list published courses
 *   GET    /courses/{courseId}   — public: get a single course
 *   PUT    /courses/{courseId}   — admin: update / publish a course
 */

import { requireAdmin } from "@lib/auth";
import {
  putCourse,
  listCourses,
  getCourse,
  Keys,
  updateItem,
} from "@lib/dynamo";
import {
  forbidden,
  badRequest,
  created,
  internalError,
  ok,
  notFound,
} from "@lib/response";
import { CourseItem } from "@types-local/index";
import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

// POST /courses
export const createCourse: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event,
) => {
  try {
    if (!requireAdmin(event)) return forbidden();

    const body = parseBody(event);
    if (!body?.title || !body?.description || !body?.instructorName) {
      return badRequest("title, description, and instructorName are required");
    }

    const course: CourseItem = {
      entityType: "COURSE",
      courseId: uuidv4(),
      title: body.title,
      description: body.description,
      instructorName: body.instructorName,
      coverImageUrl: body.coverImageUrl,
      status: "draft",
      lessonCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putCourse(course);
    return created(course);
  } catch (err) {
    console.error("createCourse error", err);
    return internalError();
  }
};

// GET /courses
export const listCoursesHandler: APIGatewayProxyHandlerV2WithJWTAuthorizer =
  async (event) => {
    try {
      // Admins can see all; public sees only published
      const isAdmin = requireAdmin(event);
      const status = isAdmin ? undefined : "published";
      const courses = await listCourses(status);
      return ok(courses);
    } catch (err) {
      console.error("listCourses error", err);
      return internalError();
    }
  };

// GET /courses/{courseId}
export const getCourseHandler: APIGatewayProxyHandlerV2WithJWTAuthorizer =
  async (event) => {
    try {
      const courseId = event.pathParameters?.courseId;
      if (!courseId) return badRequest("courseId is required");

      const course = await getCourse(courseId);
      if (!course) return notFound("Course not found");

      // Non-admins can only see published courses
      const isAdmin = requireAdmin(event);
      if (!isAdmin && course.status !== "published") {
        return notFound("Course not found");
      }

      return ok(course);
    } catch (err) {
      console.error("getCourse error", err);
      return internalError();
    }
  };

// PUT /courses/{courseId}
export const updateCourse: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (
  event,
) => {
  try {
    if (!requireAdmin(event)) return forbidden();

    const courseId = event.pathParameters?.courseId;
    if (!courseId) return badRequest("courseId is required");

    const existing = await getCourse(courseId);
    if (!existing) return notFound("Course not found");

    const body = parseBody(event);
    const allowedFields = [
      "title",
      "description",
      "instructorName",
      "coverImageUrl",
      "status",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body?.[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (
      updates.status &&
      !["draft", "published"].includes(updates.status as string)
    ) {
      return badRequest("status must be draft or published");
    }

    const keys = Keys.course(courseId);
    const now = new Date().toISOString();
    const setExpressions = Object.keys(updates).map(
      (k, i) => `#f${i} = :v${i}`,
    );
    setExpressions.push("#ua = :ua");

    const names: Record<string, string> = { "#ua": "updatedAt" };
    const values: Record<string, unknown> = { ":ua": now };
    Object.keys(updates).forEach((k, i) => {
      names[`#f${i}`] = k;
      values[`:v${i}`] = updates[k];
    });

    await updateItem({
      Key: keys,
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    });

    return ok({ ...existing, ...updates, updatedAt: now });
  } catch (err) {
    console.error("updateCourse error", err);
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
