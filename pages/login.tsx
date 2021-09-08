import { useState } from "react";
import { signIn } from "next-auth/client";
import { useRouter } from "next/router";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    (async () => {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (result?.ok) {
        router.push("/");
      }
    })();
  };

  const handleChange =
    <T extends unknown>(setter: (x: T) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value as T);
    };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Username
        <input
          name="username"
          type="text"
          onChange={handleChange(setUsername)}
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          onChange={handleChange(setPassword)}
        />
      </label>
      <button type="submit">Sign in</button>
    </form>
  );
}
