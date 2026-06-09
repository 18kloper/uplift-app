// POST /api/mentor-auth
// Validates mentor login: username = first name, password = last 2 letters of last name
// Returns { ok: true, name, email } on success, { ok: false } on failure.

import { MENTEES } from "../../lib/mentees";

// Build a deduplicated list of mentors from the MENTEES array
function getMentors() {
  const seen = new Set();
  const mentors = [];
  for (const m of MENTEES) {
    if (!m.mentor) continue;
    const key = m.mentor.email?.toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      mentors.push(m.mentor);
    }
  }
  return mentors;
}

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: "Missing credentials" });

  const mentors = getMentors();

  // Match: first name case-insensitive, last 2 letters of last name case-insensitive
  const match = mentors.find(m => {
    const parts = m.name.trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts[parts.length - 1] || "";
    const expectedPw = lastName.slice(-2).toLowerCase();
    const expectedUser = firstName.slice(0, 2).toLowerCase();
    return (
      expectedUser === username.trim().toLowerCase() &&
      expectedPw === password.trim().toLowerCase()
    );
  });

  if (match) {
    return res.status(200).json({ ok: true, name: match.name, email: match.email });
  }
  return res.status(200).json({ ok: false });
}
