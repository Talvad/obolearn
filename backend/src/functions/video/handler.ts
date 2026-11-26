/**
 * Video signed URL handler.
 *
 * Route: GET /videos/{lessonId}/signed-url?courseId=<courseId>
 *
 * Flow:
 *  1. Verify caller is enrolled in the course
 *  2. Look up the lesson to find its S3 videoKey
 *  3. Generate a 15-minute CloudFront signed URL for the video
 *  4. Return the signed URL
 */

import { APIGatewayProxyHandlerV2WithJWTAuthorizer } from 'aws-lambda';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import {
  getEnrollment,
  getLessonByCourseAndId,
} from '../../lib/dynamo.js';
import { getUserId } from '../../lib/auth.js';
import {
  ok, badRequest, forbidden, notFound, internalError,
} from '../../lib/response.js';

const ssm = new SSMClient({});

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN!;
const CLOUDFRONT_KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID!;
const CLOUDFRONT_PRIVATE_KEY_SSM_PATH = process.env.CLOUDFRONT_PRIVATE_KEY_SSM_PATH!;
const SIGNED_URL_TTL_SECONDS = 900; // 15 minutes

/** Cache the private key between warm invocations. */
let cachedPrivateKey: string | undefined;

async function getPrivateKey(): Promise<string> {
  if (cachedPrivateKey) return cachedPrivateKey;
  const result = await ssm.send(
    new GetParameterCommand({
      Name: CLOUDFRONT_PRIVATE_KEY_SSM_PATH,
      WithDecryption: true,
    }),
  );
  if (!result.Parameter?.Value) {
    throw new Error('CloudFront private key not found in SSM');
  }
  cachedPrivateKey = result.Parameter.Value;
  return cachedPrivateKey;
}

// GET /videos/{lessonId}/signed-url?courseId=<courseId>
export const getVideoSignedUrl: APIGatewayProxyHandlerV2WithJWTAuthorizer = async (event) => {
  try {
    const userId = getUserId(event);
    const lessonId = event.pathParameters?.lessonId;
    const courseId = event.queryStringParameters?.courseId;

    if (!lessonId || !courseId) {
      return badRequest('lessonId (path) and courseId (query) are required');
    }

    // Check enrollment
    const enrollment = await getEnrollment(userId, courseId);
    if (!enrollment) return forbidden('Not enrolled in this course');

    // Get the lesson to find the videoKey
    const lesson = await getLessonByCourseAndId(courseId, lessonId);
    if (!lesson) return notFound('Lesson not found');
    if (!lesson.videoKey) return notFound('Video not yet uploaded for this lesson');

    // Build CloudFront URL
    const videoUrl = `https://${CLOUDFRONT_DOMAIN}/${lesson.videoKey}`;
    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000);

    const privateKey = await getPrivateKey();
    const signedUrl = getSignedUrl({
      url: videoUrl,
      keyPairId: CLOUDFRONT_KEY_PAIR_ID,
      dateLessThan: expiresAt.toISOString(),
      privateKey,
    });

    return ok({
      signedUrl,
      expiresAt: expiresAt.toISOString(),
      lessonId,
      courseId,
    });
  } catch (err) {
    console.error('getVideoSignedUrl error', err);
    return internalError();
  }
};
