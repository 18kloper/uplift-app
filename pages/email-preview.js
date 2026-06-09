import fs from "fs";
import path from "path";

export async function getServerSideProps() {
  const filePath = path.join(process.cwd(), "emails", "mentor-portal-launch.html");
  const html = fs.readFileSync(filePath, "utf8");
  return { props: { html } };
}

export default function EmailPreview({ html }) {
  return (
    <div>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#1a1733", color: "#fff", padding: "8px 20px",
        fontSize: 12, display: "flex", alignItems: "center", gap: 12,
        fontFamily: "monospace"
      }}>
        <span style={{ background: "#9B59B6", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
          EMAIL PREVIEW
        </span>
        <span style={{ color: "#aaa" }}>mentor-portal-launch.html</span>
        <span style={{ marginLeft: "auto", color: "#aaa" }}>600px max-width · desktop view</span>
      </div>
      <div style={{ paddingTop: 36 }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
