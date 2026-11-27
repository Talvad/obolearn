/**
 * OboLearn domain entities — DynamoDB single-table design.
 *
 * Entity key layout (PK / SK):
 *   Course     PK=COURSE#<courseId>              SK=#METADATA
 *   Lesson     PK=COURSE#<courseId>              SK=LESSON#<order>#<lessonId>
 *   Enrollment PK=USER#<userId>                  SK=ENROLL#<courseId>
 *   Progress   PK=USER#<userId>                  SK=PROGRESS#<courseId>#<lessonId>
 *   User       PK=USER#<userId>                  SK=#METADATA
 *
 * GSI1 (reverse lookups):
 *   Enrollment GSI1PK=COURSE#<courseId>          GSI1SK=ENROLL#<userId>
 */

import {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from "aws-lambda";

export type CourseStatus = "draft" | "published";

export interface Course {
  courseId: string;
  title: string;
  description: string;
  status: CourseStatus;
  coverImageUrl?: string;
  instructorName: string;
  /** ISO timestamps */
  createdAt: string;
  updatedAt: string;
  /** denormalized onto the metadata item for catalog listing */
  lessonCount: number;
}

export interface Lesson {
  lessonId: string;
  courseId: string;
  order: number;
  title: string;
  description?: string;
  /** s3://videos/<courseId>/<lessonId>.mp4 — set after upload */
  videoKey?: string;
  videoDurationSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  userId: string;
  courseId: string;
  createdAt: string;
}

export interface Progress {
  userId: string;
  courseId: string;
  lessonId: string;
  /** 0-100, percentage of the video watched */
  watchPercentage: number;
  /** seconds into the video, used for resume */
  lastPositionSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export interface User {
  userId: string;
  email: string;
  name?: string;
  createdAt: string;
}

/** Discriminator stored on every item */
export type EntityType =
  | "COURSE"
  | "LESSON"
  | "ENROLLMENT"
  | "PROGRESS"
  | "USER";

export interface BaseEntity {
  entityType: EntityType;
}

export type CourseItem = Course & BaseEntity;
export type LessonItem = Lesson & BaseEntity;
export type EnrollmentItem = Enrollment & BaseEntity;
export type ProgressItem = Progress & BaseEntity;
export type UserItem = User & BaseEntity;

export type ApiEvent = APIGatewayProxyEventV2WithJWTAuthorizer;
export type RouteHandler = (
  event: ApiEvent,
) => Promise<APIGatewayProxyResultV2>;
