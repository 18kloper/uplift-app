// Temporary debug endpoint — inspect mentor application Typeform fields
// GET /api/debug-mentor-form

const FORM_ID = "AayoroO1";

export default async function handler(req, res) {
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "No TYPEFORM_TOKEN env var" });

  try {
    // Fetch form definition to see field titles/IDs
    const formRes = await fetch(`https://api.typeform.com/forms/${FORM_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const form = await formRes.json();

    // Fetch first 5 responses to see answer shapes
    const respRes = await fetch(
      `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const responses = await respRes.json();

    return res.status(200).json({
      fields: (form.fields || []).map(f => ({ id: f.id, title: f.title, type: f.type, ref: f.ref })),
      sampleResponses: (responses.items || []).slice(0, 3).map(r => ({
        submitted: r.submitted_at,
        answers: r.answers,
      })),
      totalResponses: responses.total_items,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
