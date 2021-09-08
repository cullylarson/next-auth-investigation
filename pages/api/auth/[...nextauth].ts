import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import {
  CognitoUserPool,
  AuthenticationDetails,
  CognitoUser,
  CognitoUserSession,
  CognitoIdToken,
} from "amazon-cognito-identity-js";

type AuthorizePayload = {
  idToken: CognitoIdToken;
  accessToken: string;
  refreshToken: string;
};

async function loginCognitoUser({
  username,
  password,
}: {
  username: string;
  password: string;
}): Promise<CognitoUserSession> {
  const userPool = new CognitoUserPool({
    UserPoolId: process.env.COGNITO_USER_POOL_ID || "",
    ClientId: process.env.COGNITO_CLIENT_ID || "",
  });

  const user = new CognitoUser({ Username: username, Pool: userPool });

  const authenticationDetails = new AuthenticationDetails({
    Username: username,
    Password: password,
  });

  return new Promise((resolve, reject) =>
    user.authenticateUser(authenticationDetails, {
      onSuccess: (result) => resolve(result),
      onFailure: (err) => reject(err),
    })
  );
}

export default NextAuth({
  providers: [
    Providers.Credentials({
      name: "Credentials",
      authorize: async (credentials: {
        username: string;
        password: string;
      }) => {
        try {
          const result = await loginCognitoUser(credentials);
          return {
            idToken: result.getIdToken(),
            accessToken: result.getAccessToken().getJwtToken(),
            refreshToken: result.getRefreshToken().getToken(),
          };
        } catch (err) {
          console.log(err);
          return null;
        }
      },
    }),
  ],
  debug: process.env.NODE_ENV === "development" ? true : false,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt(token, user) {
      // just logged in. only set once.
      if (user) {
        const cognitoPayload = user as unknown as AuthorizePayload;

        // TODO: this payload is too big to fit in a cookie (longer than 4096 characters)
        return {
          user: {
            username: cognitoPayload.idToken.payload["cognito:username"],
            name: cognitoPayload.idToken.payload.name,
            email: cognitoPayload.idToken.payload.email,
          },
          refreshToken: cognitoPayload.refreshToken,
          accessToken: cognitoPayload.accessToken,
          exp: cognitoPayload.idToken.payload.exp,
          iat: cognitoPayload.idToken.payload.iat,
        };
      } else {
        return token;
      }
    },
  },
});
