import { fetchWithTimeout } from "../network.js";
import React, { useState } from "react";
import { getBackendUrl, setBackendUrl } from "../connection.js";
export function ConnectionScreen({
  onReady,
  onCancel,
}: {
  onReady: () => void;
  onCancel?: () => void;
}) {
  const [url, setUrl] = useState(getBackendUrl()),
    [token, setToken] = useState(
      sessionStorage.getItem("viper.apiToken") || "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="connection-screen">
      <form
        className="card connection-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const parsed = new URL(url);
            if (
              parsed.protocol !== "https:" ||
              parsed.username ||
              parsed.password ||
              parsed.search ||
              parsed.hash
            )
              throw new Error("Enter a valid HTTPS backend URL.");
            const response = await fetchWithTimeout(
              `${url.replace(/\/$/, "")}/api/health`,
              { headers: token ? { Authorization: `Bearer ${token}` } : {} },
              15000,
            );
            const body = await response.json();
            if (!response.ok || body.service !== "vyapar-api")
              throw new Error(
                "Could not connect. Check the server address and access token.",
              );
            setBackendUrl(url);
            if (token) sessionStorage.setItem("viper.apiToken", token);
            else sessionStorage.removeItem("viper.apiToken");
            onReady();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>Connect Viper</h1>
        <p>
          Connect to your business server to open your invoices and inventory.
        </p>
        {error && (
          <div role="alert" className="error-banner">
            {error}
          </div>
        )}
        <label className="form-group">
          Server address
          <input
            className="form-input"
            type="url"
            placeholder="https://business.example.com"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label className="form-group">
          Access token
          <input
            className="form-input"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <small>
            Kept for this session. Your administrator provides this token.
          </small>
        </label>
        <div className="action-row">
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Connecting…" : "Connect"}
          </button>
        </div>
      </form>
    </main>
  );
}
