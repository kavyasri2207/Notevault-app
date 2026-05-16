const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
} = require("@aws-sdk/client-cognito-identity-provider");
const { successResponse, errorResponse } = require("./shared/response");

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION_NAME });

exports.handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // Handle Cognito Pre-SignUp Trigger
  if (event.triggerSource === "PreSignUp_SignUp") {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    return event;
  }

  const { routeKey, body, headers, requestContext } = event;

  try {
    // POST /api/auth/signup
    if (routeKey === "POST /api/auth/signup") {
      const { name, email, password } = JSON.parse(body);
      
      const command = new SignUpCommand({
        ClientId: process.env.COGNITO_CLIENT_ID,
        Username: email.toLowerCase(),
        Password: password,
        UserAttributes: [
          { Name: "name", Value: name },
          { Name: "email", Value: email.toLowerCase() },
        ],
      });

      const response = await client.send(command);

      // Auto-login after signup
      const authCommand = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email.toLowerCase(),
          PASSWORD: password,
        },
      });
      const authResponse = await client.send(authCommand);

      return successResponse({
        token: authResponse.AuthenticationResult.IdToken,
        data: { email: email.toLowerCase(), name },
        message: "User signed up and logged in successfully."
      }, 201);
    }

    // POST /api/auth/login
    if (routeKey === "POST /api/auth/login") {
      const { email, password } = JSON.parse(body);

      const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: email.toLowerCase(),
          PASSWORD: password,
        },
      });

      const response = await client.send(command);
      
      // Fetch user details to get the 'name' attribute
      const getUserCommand = new GetUserCommand({
        AccessToken: response.AuthenticationResult.AccessToken,
      });
      const userData = await client.send(getUserCommand);
      const nameAttr = userData.UserAttributes.find(a => a.Name === "name");

      return successResponse({
        token: response.AuthenticationResult.IdToken,
        data: {
          email: email.toLowerCase(),
          name: nameAttr ? nameAttr.Value : "User",
        },
        message: "Login successful"
      });
    }

    // GET /api/auth/me (JWT protected)
    if (routeKey === "GET /api/auth/me") {
      const claims = requestContext.authorizer.jwt.claims;
      return successResponse({
        data: {
          id: claims.sub,
          name: claims.name || claims.given_name || claims["custom:name"],
          email: claims.email,
        }
      });
    }

    return errorResponse("Route not found", 404);
  } catch (error) {
    console.error("Auth Error:", error);
    return errorResponse(error.message || "Authentication failed", 401, error);
  }
};
