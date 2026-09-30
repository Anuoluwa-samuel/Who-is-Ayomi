import { profile } from "@/data/portfolio"

export function Footer() {
  return (
    <footer className="footer">
      <div className="page footer__inner">
        <span>© {new Date().getFullYear()} {profile.fullName}. All rights reserved.</span>
        <span>Made with <b className="heart">❤</b> by {profile.name}</span>
      </div>
    </footer>
  )
}
