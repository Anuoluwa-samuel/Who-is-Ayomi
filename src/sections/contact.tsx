import { ArrowUpRight, Mail, Phone } from "lucide-react"
import { contact, profile, socials, testimonial } from "@/data/portfolio"
import { Rich } from "@/components/site/rich"
import { SOCIAL_LABELS, SocialIcon } from "@/components/site/social-icon"
import { Reveal } from "@/components/site/reveal"

export function Contact() {
  return (
    <section className="contact" id="contact">
      <div className="page contact__inner">
        <Reveal className="contact__cta">
          <span className="tag glass">{contact.tag}</span>
          <h2><Rich text={contact.heading} /></h2>
          <p>{contact.text}</p>
          <a href={`mailto:${profile.email}`} className="btn btn--primary magnetic">
            {contact.button} <ArrowUpRight className="ico" />
          </a>
        </Reveal>

        <Reveal as="figure" className="quote glass glass--liquid">
          <svg className="quote__mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 18v-5c0-4 2-7 6-8l1 2c-2 .8-3 2.3-3 4h3v7zm10 0v-5c0-4 2-7 6-8l1 2c-2 .8-3 2.3-3 4h3v7z" />
          </svg>
          <blockquote>{testimonial.quote}</blockquote>
          <figcaption>
            <span className="avatar" aria-hidden="true">{testimonial.initials}</span>
            <span><strong>{testimonial.author}</strong><small>{testimonial.role}</small></span>
          </figcaption>
        </Reveal>

        <Reveal className="follow">
          <span className="eyebrow">{contact.followLabel}</span>
          <ul className="socials">
            {socials.map((s) => (
              <li key={s.network + s.url}>
                <a className="glass" href={s.network === "email" && !s.url.startsWith("mailto:") ? `mailto:${s.url}` : s.url} aria-label={SOCIAL_LABELS[s.network] ?? s.network}>
                  <SocialIcon network={s.network} />
                </a>
              </li>
            ))}
          </ul>
          <ul className="contact__list">
            <li><Mail /><a href={`mailto:${profile.email}`}>{profile.email}</a></li>
            <li><Phone /><a href={profile.phoneHref}>{profile.phone}</a></li>
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
