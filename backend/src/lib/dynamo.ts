/**
 * DynamoDB data-access layer.
 *
 * Uses the high-level DynamoDBDocumentClient so values are plain JS types —
 * no manual AttributeValue marshaling needed in handlers.
 */

import {
  DynamoDBClient,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  GetCommand,
  GetCommandInput,
  QueryCommand,
  QueryCommandInput,
  UpdateCommand,
  UpdateCommandInput,
  DeleteCommand,
  DeleteCommandInput,
  TransactWriteCommand,
  TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import {
  Course,
  Lesson,
  Enrollment,
  Progress,
  User,
  CourseItem,
  LessonItem,
  EnrollmentItem,
  ProgressItem,
  UserItem,
} from '../types/index.js';

const TABLE_NAME = process.env.TABLE_NAME!;

/** Lazily created so Lambda cold-start doesn't pay the cost unless the module
 *  is actually imported. */
let _client: DynamoDBDocumentClient | undefined;

export function getDocClient(): DynamoDBDocumentClient {
  if (!_client) {
    const raw = new DynamoDBClient({});
    _client = DynamoDBDocumentClient.from(raw, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Key builders
// ---------------------------------------------------------------------------

export const Keys = {
  course: (courseId: string) => ({
    PK: `COURSE#${courseId}`,
    SK: '#METADATA',
  }),
  lesson: (courseId: string, order: number, lessonId: string) => ({
    PK: `COURSE#${courseId}`,
    SK: `LESSON#${String(order).padStart(5, '0')}#${lessonId}`,
  }),
  lessonPrefix: (courseId: string) => ({
    PK: `COURSE#${courseId}`,
    SKPrefix: 'LESSON#',
  }),
  enrollment: (userId: string, courseId: string) => ({
    PK: `USER#${userId}`,
    SK: `ENROLL#${courseId}`,
  }),
  enrollmentGsi: (courseId: string, userId: string) => ({
    GSI1PK: `COURSE#${courseId}`,
    GSI1SK: `ENROLL#${userId}`,
  }),
  enrollmentPrefix: (userId: string) => ({
    PK: `USER#${userId}`,
    SKPrefix: 'ENROLL#',
  }),
  progress: (userId: string, courseId: string, lessonId: string) => ({
    PK: `USER#${userId}`,
    SK: `PROGRESS#${courseId}#${lessonId}`,
  }),
  progressPrefix: (userId: string, courseId: string) => ({
    PK: `USER#${userId}`,
    SKPrefix: `PROGRESS#${courseId}#`,
  }),
  user: (userId: string) => ({
    PK: `USER#${userId}`,
    SK: '#METADATA',
  }),
};

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

export async function putItem(item: Record<string, unknown>): Promise<void> {
  const input: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: item,
  };
  await getDocClient().send(new PutCommand(input));
}

export async function putItemIfNotExists(
  item: Record<string, unknown>,
): Promise<boolean> {
  try {
    const input: PutCommandInput = {
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    };
    await getDocClient().send(new PutCommand(input));
    return true;
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw err;
  }
}

export async function getItem<T>(
  keys: { PK: string; SK: string },
): Promise<T | undefined> {
  const input: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: keys,
  };
  const result = await getDocClient().send(new GetCommand(input));
  return result.Item as T | undefined;
}

export async function queryItems<T>(
  input: Omit<QueryCommandInput, 'TableName'>,
): Promise<T[]> {
  const result = await getDocClient().send(
    new QueryCommand({ TableName: TABLE_NAME, ...input }),
  );
  return (result.Items ?? []) as T[];
}

export async function updateItem(
  input: Omit<UpdateCommandInput, 'TableName'>,
): Promise<void> {
  await getDocClient().send(
    new UpdateCommand({ TableName: TABLE_NAME, ...input }),
  );
}

export async function deleteItem(
  keys: { PK: string; SK: string },
): Promise<void> {
  const input: DeleteCommandInput = {
    TableName: TABLE_NAME,
    Key: keys,
  };
  await getDocClient().send(new DeleteCommand(input));
}

export async function transactWrite(
  input: Omit<TransactWriteCommandInput, 'TableName'>,
): Promise<void> {
  await getDocClient().send(new TransactWriteCommand(input));
}

// ---------------------------------------------------------------------------
// Domain-specific helpers
// ---------------------------------------------------------------------------

/** Write a new course. Throws if courseId already exists. */
export async function putCourse(course: CourseItem): Promise<void> {
  const keys = Keys.course(course.courseId);
  await putItem({ ...keys, ...course });
}

/** Fetch a single course by ID. */
export async function getCourse(
  courseId: string,
): Promise<CourseItem | undefined> {
  return getItem<CourseItem>(Keys.course(courseId));
}

/** List all courses (optionally filter by status). */
export async function listCourses(status?: string): Promise<CourseItem[]> {
  // We use a full table scan on the GSI-less path for simplicity in Phase 1.
  // In production, add a GSI on status#createdAt for efficient filtering.
  const { DynamoDBClient: DDBClient } = await import('@aws-sdk/client-dynamodb');
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');
  const filter = status
    ? {
        FilterExpression: '#st = :status AND SK = :sk',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':status': status, ':sk': '#METADATA' },
      }
    : {
        FilterExpression: 'SK = :sk',
        ExpressionAttributeValues: { ':sk': '#METADATA' },
      };
  const result = await getDocClient().send(
    new ScanCommand({ TableName: TABLE_NAME, ...filter }),
  );
  return (result.Items ?? []).filter(
    (item) => item.entityType === 'COURSE',
  ) as CourseItem[];
}

/** Write a lesson (upsert). */
export async function putLesson(lesson: LessonItem): Promise<void> {
  const keys = Keys.lesson(lesson.courseId, lesson.order, lesson.lessonId);
  await putItem({ ...keys, ...lesson });
}

/** Get all lessons for a course, ordered by SK. */
export async function listLessons(courseId: string): Promise<LessonItem[]> {
  const { PK, SKPrefix } = Keys.lessonPrefix(courseId);
  return queryItems<LessonItem>({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': PK, ':prefix': SKPrefix },
    ScanIndexForward: true,
  });
}

/** Get a single lesson by courseId + lessonId (requires knowing order;
 *  use listLessons + find for ad-hoc lookups). */
export async function getLessonByCourseAndId(
  courseId: string,
  lessonId: string,
): Promise<LessonItem | undefined> {
  const lessons = await listLessons(courseId);
  return lessons.find((l) => l.lessonId === lessonId);
}

/** Write an enrollment (idempotent). */
export async function putEnrollment(enrollment: EnrollmentItem): Promise<void> {
  const keys = Keys.enrollment(enrollment.userId, enrollment.courseId);
  const gsiKeys = Keys.enrollmentGsi(enrollment.courseId, enrollment.userId);
  await putItem({ ...keys, ...gsiKeys, ...enrollment });
}

/** Get enrollment for user + course. */
export async function getEnrollment(
  userId: string,
  courseId: string,
): Promise<EnrollmentItem | undefined> {
  return getItem<EnrollmentItem>(Keys.enrollment(userId, courseId));
}

/** List all enrollments for a user. */
export async function listEnrollmentsForUser(
  userId: string,
): Promise<EnrollmentItem[]> {
  const { PK, SKPrefix } = Keys.enrollmentPrefix(userId);
  return queryItems<EnrollmentItem>({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': PK, ':prefix': SKPrefix },
  });
}

/** Upsert progress for a lesson. */
export async function putProgress(progress: ProgressItem): Promise<void> {
  const keys = Keys.progress(
    progress.userId,
    progress.courseId,
    progress.lessonId,
  );
  await putItem({ ...keys, ...progress });
}

/** Get progress for a specific lesson. */
export async function getProgress(
  userId: string,
  courseId: string,
  lessonId: string,
): Promise<ProgressItem | undefined> {
  return getItem<ProgressItem>(Keys.progress(userId, courseId, lessonId));
}

/** List all progress records for a user + course. */
export async function listProgressForCourse(
  userId: string,
  courseId: string,
): Promise<ProgressItem[]> {
  const { PK, SKPrefix } = Keys.progressPrefix(userId, courseId);
  return queryItems<ProgressItem>({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    ExpressionAttributeValues: { ':pk': PK, ':prefix': SKPrefix },
  });
}

/** Write a user record. */
export async function putUser(user: UserItem): Promise<void> {
  const keys = Keys.user(user.userId);
  await putItem({ ...keys, ...user });
}

/** Get a user by ID. */
export async function getUser(userId: string): Promise<UserItem | undefined> {
  return getItem<UserItem>(Keys.user(userId));
}
