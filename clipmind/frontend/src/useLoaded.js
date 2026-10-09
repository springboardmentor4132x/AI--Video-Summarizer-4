import { useEffect, useState } from "react";

// Run an async loader whenever `deps` change; exposes { loading, data, error }.
// The result is keyed by deps, so stale results are never shown for new inputs.
export default function useLoaded(loader, deps) {
  const [state, setState] = useState({ key: null, data: null, error: "" });
  const key = JSON.stringify(deps);
  useEffect(() => {
    let cancelled = false;
    loader()
      .then((data) => !cancelled && setState({ key, data, error: "" }))
      .catch((err) => !cancelled && setState({ key, data: null, error: err.message || "Something went wrong." }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const ready = state.key === key;
  return { loading: !ready, data: ready ? state.data : null, error: ready ? state.error : "" };
}
