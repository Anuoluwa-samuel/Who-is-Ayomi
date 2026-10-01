import { profile } from "@/data/portfolio"

export function Footer() {
  return (
    <footer className="footer">
      <div className="page footer__inner">
        <span suppressHydrationWarning>© {new Date().getFullYear()} {profile.fullName}. All rights reserved.</span>
      </div>
    </footer>
  )
}
