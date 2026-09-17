import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

function Login() {
  async function handleGoogleLogin() {
    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      console.log("Logged-in user:", result.user);
    } catch (error) {
      console.error("Login failed:", error);
    }
  }

  return (
    <button onClick={handleGoogleLogin}>
      Continue with Google
    </button>
  );
}

export default Login;