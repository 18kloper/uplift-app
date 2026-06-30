// GET /api/admin/pending-sessions
// Returns all rows from SessionReview where status = "Pending"
import { getSheetsClient } from "../../../lib/sheets-helper";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const hasSheets =
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY;
  if (!hasSheets) return res.status(200).json({ sessions: [] });

  try {
    const sheets = getSheetsClient();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "SessionReview!A:I",
    });
    const [, ...rows] = result.data.values || [];
    // Cols: A(0)=Approved, B(1)=Slug, C(2)=MenteeName, D(3)=Date,
    //       E(4)=60+Min, F(5)=HasTranscript, G(6)=KeyTakeaways, H(7)=SessionID, I(8)=SubmittedAt
    const sessions = rows
      .filter(r => {
        const status = r[0]?.trim();
        return !status || status === "Pending";
      })
      .map(r => ({
        slug:        r[1]?.trim() || "",
        menteeName:  r[2]?.trim() || "",
        date:        r[3]?.trim() || "",
        sixtyMin:    r[4]?.trim() === "Yes",
        takeaways:   r[6]?.trim() || "",
        sessionId:   r[7]?.trim() || "",
        submittedAt: r[8]?.trim() || "",
      }))
      .filter(r => r.sessionId);

    return res.status(200).json({ sessions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
