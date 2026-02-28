import type { PreSignUpTriggerEvent } from "aws-lambda";

export const handler = async (
  event: PreSignUpTriggerEvent
): Promise<PreSignUpTriggerEvent> => {
  const email = event.request.userAttributes.email;

  if (!email || !email.toLowerCase().endsWith("@clemson.edu")) {
    throw new Error("Only @clemson.edu email addresses are allowed to sign up.");
  }

  return event;
};
