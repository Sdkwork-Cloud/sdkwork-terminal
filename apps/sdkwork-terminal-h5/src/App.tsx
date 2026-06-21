import { useNavigate } from "react-router-dom";

import { getCurrentEnvironment } from "./bootstrap/environment";
import { getIamRuntime } from "./bootstrap/iamRuntime";
import { TerminalMobileShell } from "@sdkwork/terminal-h5-shell";

function App() {
  const navigate = useNavigate();

  function handleSignOut() {
    getIamRuntime().tokenManager.clearTokens();
    navigate("/login", { replace: true });
  }

  return (
    <TerminalMobileShell
      environmentLabel={getCurrentEnvironment()}
      hostingLabel="H5"
      onSignOut={handleSignOut}
    />
  );
}

export default App;
