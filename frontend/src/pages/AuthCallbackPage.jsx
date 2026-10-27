import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { socialAuthAPI } from "../api/endpoints";
import Loading from "../components/common/Loading";
import toast from "react-hot-toast";

/**
 * Landing page for the OAuth redirect flow.
 * The backend redirects here with either `?code=...` (one-time code, success)
 * or `?error=...` (failure). The code is exchanged for a token, then the session is set.
 */
const AuthCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    // Guard against React 18 StrictMode double-invoking the effect in dev.
    if (handled.current) return;
    handled.current = true;

    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      if (error) toast.error(error);
      navigate("/login", { replace: true });
      return;
    }

    socialAuthAPI
      .exchangeCode(code)
      .then((response) => loginWithToken(response.data.data.accessToken))
      .then((result) => navigate(result.success ? "/" : "/login", { replace: true }))
      .catch(() => navigate("/login", { replace: true }));
  }, [loginWithToken, navigate, searchParams]);

  return <Loading fullScreen />;
};

export default AuthCallbackPage;
