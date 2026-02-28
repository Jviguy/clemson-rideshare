import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { cookies } from "next/headers";

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

function getClientId() {
  const id = process.env.COGNITO_CLIENT_ID;
  if (!id) {
    throw new Error(
      "COGNITO_CLIENT_ID is not set. Run the app via `npx sst dev` or set it in .env.local"
    );
  }
  return id;
}

export async function signUp(email: string, password: string, name: string) {
  const command = new SignUpCommand({
    ClientId: getClientId(),
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "name", Value: name },
    ],
  });

  return client.send(command);
}

export async function confirmSignUp(email: string, code: string) {
  const command = new ConfirmSignUpCommand({
    ClientId: getClientId(),
    Username: email,
    ConfirmationCode: code,
  });

  return client.send(command);
}

export async function signIn(email: string, password: string) {
  const command = new InitiateAuthCommand({
    ClientId: getClientId(),
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });

  const response = await client.send(command);
  const tokens = response.AuthenticationResult;

  if (!tokens?.AccessToken || !tokens.IdToken || !tokens.RefreshToken) {
    throw new Error("Authentication failed: missing tokens");
  }

  // Store tokens in httpOnly cookies
  const cookieStore = await cookies();

  cookieStore.set("access_token", tokens.AccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: tokens.ExpiresIn || 3600,
    path: "/",
  });

  cookieStore.set("id_token", tokens.IdToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: tokens.ExpiresIn || 3600,
    path: "/",
  });

  cookieStore.set("refresh_token", tokens.RefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/",
  });

  return tokens;
}

export async function getSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return null;
  }

  try {
    const command = new GetUserCommand({
      AccessToken: accessToken,
    });

    const user = await client.send(command);

    const attributes: Record<string, string> = {};
    user.UserAttributes?.forEach((attr) => {
      if (attr.Name && attr.Value) {
        attributes[attr.Name] = attr.Value;
      }
    });

    return {
      username: user.Username || "",
      email: attributes.email || "",
      name: attributes.name || "",
      sub: attributes.sub || "",
    };
  } catch {
    return null;
  }
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("id_token");
  cookieStore.delete("refresh_token");
}
