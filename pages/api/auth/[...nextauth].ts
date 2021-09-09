import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import Amplify, { Auth } from "aws-amplify";

type CognitoIdToken = {
  payload: {
    name: string;
    email: string;
    "cognito:username": string;
    exp: number;
    iat: number;
  };
};

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
}): Promise<AuthorizePayload> {
  // TODO: this should only be done once, on startup
  Amplify.configure({
    Auth: {
      userPoolId: process.env.COGNITO_USER_POOL_ID,
      userPoolWebClientId: process.env.COGNITO_CLIENT_ID,
    },
  });

  const user = await Auth.signIn(username, password);

  return {
    idToken: user.signInUserSession.getIdToken(),
    accessToken: user.signInUserSession.getAccessToken().getJwtToken(),
    refreshToken: user.signInUserSession.getRefreshToken().getToken(),
  };
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
          return loginCognitoUser(credentials);
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
