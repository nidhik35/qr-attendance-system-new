// Reusable page layout wrapper for consistent UI across routes.
import Link from "next/link";

export default function PageShell({
  title,
  subtitle,
  badge,
  badgeClass = "",
  wide = false,
  children,
  footer
}) {
  return (
    <div className="page-wrap">
      <main className={`container ${wide ? "container-wide" : ""}`}>
        <header className="page-header">
          {badge && <span className={`badge ${badgeClass}`}>{badge}</span>}
          <h1>{title}</h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </header>
        {children}
        {footer && <div className="footer-actions stack">{footer}</div>}
      </main>
    </div>
  );
}

export function FooterLink({ href, children, className = "btn btn-secondary" }) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
