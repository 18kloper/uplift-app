// GET /api/founder-age-stats
// Pulls Age Range responses from the mentee Typeform and returns distribution + midpoint average

const FORM_ID = "hAbo7Jdh";
const AGE_FIELD_TITLE = "Age Range";

const MIDPOINTS = {
  "Under 18": 16,
  "18–24": 21, "18-24": 21,
  "25–34": 29, "25-34": 29,
  "35–44": 39, "35-44": 39,
  "45–54": 49, "45-54": 49,
  "55–64": 59, "55-64": 59,
  "65+": 68,
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) return res.status(200).json({ error: "No TYPEFORM_TOKEN", avg: null, distribution: {} });

  try {
    // Fetch form definition to find Age Range field ID
    const formRes = await fetch(`https://api.typeform.com/forms/${FORM_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const form = await formRes.json();

    // Find age field ID — could be nested in a group
    const allFields = (form.fields || []).flatMap(f =>
      f.properties?.fields ? f.properties.fields : [f]
    );
    const ageField = allFields.find(f =>
      f.title?.toLowerCase().includes("age range") || f.title?.toLowerCase() === "age"
    );

    // Fetch all responses
    const respRes = await fetch(
      `https://api.typeform.com/forms/${FORM_ID}/responses?page_size=1000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await respRes.json();
    const responses = data.items || [];

    // Aggregate age ranges
    const distribution = {};
    let totalMidpoint = 0;
    let count = 0;

    for (const r of responses) {
      for (const ans of r.answers || []) {
        const isAgeField = ageField
          ? ans.field?.id === ageField.id
          : (ans.field?.type === "dropdown" && ans.type === "text");

        if (isAgeField && ans.text) {
          const label = ans.text.trim();
          distribution[label] = (distribution[label] || 0) + 1;
          const mid = MIDPOINTS[label];
          if (mid) { totalMidpoint += mid; count++; }
        }
      }
    }

    const avg = count > 0 ? Math.round((totalMidpoint / count) * 10) / 10 : null;

    return res.status(200).json({
      avg,
      count,
      distribution,
      total: responses.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, avg: null });
  }
}
