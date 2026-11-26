/**
 * Cognito Post-Confirmation Lambda trigger.
 *
 * Fires after a user confirms their account (email verification).
 * Creates a USER#<userId> record in DynamoDB.
 */

import { PostConfirmationTriggerHandler } from 'aws-lambda';
import { putUser } from '../../lib/dynamo.js';

export const handler: PostConfirmationTriggerHandler = async (event) => {
  const { sub, email, name } = event.request.userAttributes;

  await putUser({
    entityType: 'USER',
    userId: sub,
    email: email ?? '',
    name: name,
    createdAt: new Date().toISOString(),
  });

  console.log(`User record created for ${sub} (${email})`);

  // Must return the event unchanged
  return event;
};
