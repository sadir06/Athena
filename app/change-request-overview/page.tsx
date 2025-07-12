"use client";

import { useState } from "react";

export default function ChangeRequestOverviewPage() {
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setOverview("");
    try {
      const res = await fetch("/api/change-request-overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubRepoUrl, changeRequest })
      });
      const data = await res.json();
      if (res.ok && typeof data === 'object' && data && 'overview' in data) {
        setOverview(String(data.overview));
      } else if (typeof data === 'object' && data && 'error' in data) {
        setError(String(data.error) || "Failed to generate overview");
      } else {
        setError("Failed to generate overview");
      }
    } catch (err) {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Change Request Overview Agent</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">GitHub Repo URL</label>
          <input
            type="text"
            className="w-full border rounded p-2 text-black"
            value={githubRepoUrl}
            onChange={e => setGithubRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Change Request</label>
          <textarea
            className="w-full border rounded p-2 text-black"
            value={changeRequest}
            onChange={e => setChangeRequest(e.target.value)}
            placeholder="Describe your change request..."
            rows={4}
            required
          />
        </div>
        <button
          type="submit"
          className="bg-yellow-500 text-black px-4 py-2 rounded font-bold"
          disabled={loading}
        >
          {loading ? "Generating..." : "Generate Overview"}
        </button>
      </form>
      {error && <div className="mt-4 text-red-500">{error}</div>}
      {overview && (
        <div className="mt-8 p-4 bg-gray-900 rounded border border-yellow-400/30">
          <h2 className="text-lg font-semibold mb-2">Change Request Overview</h2>
          <pre className="whitespace-pre-wrap text-yellow-200">{overview}</pre>
        </div>
      )}
    </div>
  );
} 