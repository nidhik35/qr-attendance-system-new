"use client";

import { useEffect } from "react";
import PageShell, { FooterLink } from "../../components/PageShell";

export default function ApiDocsPage() {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
    script.async = true;
    script.onload = () => {
      window.SwaggerUIBundle({
        url: "/api/docs",
        dom_id: "#swagger-ui"
      });
    };
    document.body.appendChild(script);
  }, []);

  return (
    <PageShell
      title="API Documentation"
      subtitle="Interactive Swagger UI for all protected endpoints."
      badge="Developer Tools"
      badgeClass="badge-admin"
      wide
      footer={<FooterLink href="/">Back to home</FooterLink>}
    >
      <div className="card">
        <div id="swagger-ui" />
      </div>
    </PageShell>
  );
}
