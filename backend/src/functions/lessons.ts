/**
 * Lesson CRUD + presigned upload URL handlers.
 *
 * Routes:
 *   POST   /courses/{courseId}/lessons                           — admin: create lesson
 *   GET    /courses/{courseId}/lessons                           — public: list lessons
 *   PUT    /courses/{courseId}/lessons/{lessonId}                — admin: update lesson
 *   POST   /courses/{courseId}/lessons/{lessonId}/upload-url     — admin: get presigned upload URL
 */

import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
import { requireAdmin } from "@lib/auth";
import {
  getCourse,
  listLessons,
  putLesson,
  updateItem,
  Keys,
  getLessonByCourseAndId,
} from "@lib/dynamo";
import {
  forbidden,
  badRequest,
  notFound,
  created,
  internalError,
  ok,
} from "@lib/response";
import { ApiEvent, LessonItem, RouteHandler } from "@types-local/index";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME!;

// POST /courses/{courseId}/lessons
export const createLesson: RouteHandler = async (event) => {
  try {
    if (!requireAdmin(event)) return forbidden();

    const courseId = event.pathParameters?.courseId;
    if (!courseId) return badRequest("courseId is required");

    const course = await getCourse(courseId);
    if (!course) return notFound("Course not found");

    const body = parseBody(event);
    if (!body?.title) return badRequest("title is required");

    const existing = await listLessons(courseId);
    const order =
      typeof body.order === "number" ? body.order : existing.length + 1;

    const lesson: LessonItem = {
      entityType: "LESSON",
      lessonId: uuidv4(),
      courseId,
      order,
      title: body.title,
      description: body.description,
      videoDurationSeconds: body.videoDurationSeconds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await putLesson(lesson);

    // Update lessonCount on the course
    await updateItem({
      Key: Keys.course(courseId),
      UpdateExpression: "SET lessonCount = :lc, updatedAt = :ua",
      ExpressionAttributeValues: {
        ":lc": existing.length + 1,
        ":ua": new Date().toISOString(),
      },
    });

    return created(lesson);
  } catch (err) {
    console.error("createLesson error", err);
    return internalError();
  }
};

// GET /courses/{courseId}/lessons
export const listAdminLessonsHandler: RouteHandler = async (event) => {
  try {
    if (!requireAdmin(event)) return forbidden();
    const courseId = event.pathParameters?.courseId;
    if (!courseId) return badRequest("courseId is required");

    const course = await getCourse(courseId);
    if (!course) return notFound("Course not found");

    const lessons = await listLessons(courseId);
    return ok(lessons);
  } catch (err) {
    console.error("listAdminLessons error", err);
    return internalError();
  }
};

// GET /public/courses/{courseId}/lessons
export const listPublicLessonsHandler: RouteHandler = async (event) => {
  try {
    const courseId = event.pathParameters?.courseId;
    if (!courseId) return badRequest("courseId is required");

    const course = await getCourse(courseId);
    if (!course) return notFound("Course not found");

    if (course.status !== "published") {
      return notFound("Course not found");
    }

    const lessons = await listLessons(courseId);
    return ok(lessons);
  } catch (err) {
    console.error("listPublicLessons error", err);
    return internalError();
  }
};

// PUT /courses/{courseId}/lessons/{lessonId}
export const updateLesson: RouteHandler = async (event) => {
  try {
    if (!requireAdmin(event)) return forbidden();

    const { courseId, lessonId } = event.pathParameters ?? {};
    if (!courseId || !lessonId)
      return badRequest("courseId and lessonId are required");

    const lesson = await getLessonByCourseAndId(courseId, lessonId);
    if (!lesson) return notFound("Lesson not found");

    const body = parseBody(event);
    const allowedFields = [
      "title",
      "description",
      "videoDurationSeconds",
      "order",
      "videoKey",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body?.[field] !== undefined) updates[field] = body[field];
    }

    const keys = Keys.lesson(courseId, lesson.order, lessonId);
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

    return ok({ ...lesson, ...updates, updatedAt: now });
  } catch (err) {
    console.error("updateLesson error", err);
    return internalError();
  }
};

// POST /courses/{courseId}/lessons/{lessonId}/upload-url
export const getUploadUrl: RouteHandler = async (event) => {
  try {
    if (!requireAdmin(event)) return forbidden();

    const { courseId, lessonId } = event.pathParameters ?? {};
    if (!courseId || !lessonId)
      return badRequest("courseId and lessonId are required");

    const course = await getCourse(courseId);
    if (!course) return notFound("Course not found");

    const videoKey = `videos/${courseId}/${lessonId}.mp4`;
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: videoKey,
      ContentType: "video/mp4",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 min

    return ok({ uploadUrl, videoKey, expiresIn: 900 });
  } catch (err) {
    console.error("getUploadUrl error", err);
    return internalError();
  }
};

function parseBody(event: ApiEvent): Record<string, any> | null {
  try {
    return event.body ? JSON.parse(event.body) : null;
  } catch {
    return null;
  }
}

const routes: Record<string, RouteHandler> = {
  "POST /courses/{courseId}/lessons": createLesson,
  "GET /public/courses/{courseId}/lessons": listPublicLessonsHandler,
  "GET /courses/{courseId}/lessons": listAdminLessonsHandler,
  "PUT /courses/{courseId}/lessons/{lessonId}": updateLesson,
  "POST /courses/{courseId}/lessons/{lessonId}/upload-url": getUploadUrl,
};

export const handler = async (event: ApiEvent) => {
  try {
    const route = routes[event.routeKey];
    if (!route) return notFound();
    return await route(event);
  } catch (error) {
    return internalError();
  }
};
