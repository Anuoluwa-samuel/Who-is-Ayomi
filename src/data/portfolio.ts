// All editable copy is managed from the built-in admin at /admin (see ADMIN.md).
// src/content/*.json are only the built-in defaults; live edits are stored by the server.
// This file only reshapes that content for the components.

import siteDefault from "@/content/site.json"
import homeDefault from "@/content/home.json"
import aboutDefault from "@/content/about.json"
import skillsDefault from "@/content/skills.json"
import projectsDefault from "@/content/projects.json"
import contactDefault from "@/content/contact.json"
import caseStudyDefault from "@/content/casestudy.json"

// main.tsx fetches /api/content before loading the app and stores it here.
// If there is no server (static hosting) the bundled defaults above are used.
const remote = ((globalThis as { __CONTENT__?: Record<string, unknown> }).__CONTENT__ ?? {}) as Record<string, unknown>
const merge = <T extends object>(base: T, key: string): T => ({ ...base, ...((remote[key] as Partial<T>) ?? {}) })

const siteJson = merge(siteDefault, "site")
const homeJson = merge(homeDefault, "home")
const aboutJson = merge(aboutDefault, "about")
const skillsJson = merge(skillsDefault, "skills")
const projectsJson = merge(projectsDefault, "projects")
const contactJson = merge(contactDefault, "contact")
const caseStudyJson = merge(caseStudyDefault, "casestudy")

const iconUrl = (slug: string) =>
  `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-original.svg`

/** Devicon slug ("react", "nodejs"…) or an uploaded/absolute image path. */
export const resolveIcon = (icon: string) =>
  icon.startsWith("/") || icon.startsWith("http") ? icon : iconUrl(icon)

export const profile = {
  name: siteJson.name,
  fullName: siteJson.name,
  initials: siteJson.initials,
  title: siteJson.title,
  description: siteJson.description,
  email: siteJson.email,
  phone: siteJson.phone,
  phoneHref: `tel:${siteJson.phone.replace(/[^+\d]/g, "")}`,
  photo: siteJson.photo,
  cv: siteJson.cv,
  intro: {
    first: siteJson.introFirstLine,
    second: siteJson.introSecondLine,
    tagline: siteJson.introTagline,
  },
}

export const navLinks = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "case-study", label: "Case study" },
  { id: "contact", label: "Contact" },
] as const

export const home = {
  ...homeJson,
  techIcons: homeJson.techIcons.map((t) => ({ name: t.name, src: resolveIcon(t.icon) })),
}

export const about = aboutJson

export const skillsSection = {
  tag: skillsJson.tag,
  heading: skillsJson.heading,
}
export const skills = skillsJson.items.map((s) => ({ name: s.name, level: s.level, src: resolveIcon(s.icon) }))

export const projectsSection = {
  tag: projectsJson.tag,
  heading: projectsJson.heading,
  linkLabel: projectsJson.linkLabel,
}
export type ProjectArt = "bloom" | "ripple" | "aurora"
export const projects = projectsJson.items.map((p, i) => {
  const arts: ProjectArt[] = ["bloom", "ripple", "aurora"]
  const item = p as { title: string; blurb: string; link?: string; image?: string; art?: string }
  return {
    title: item.title,
    blurb: item.blurb,
    href: item.link || "#",
    image: item.image || "",
    art: (arts.includes(item.art as ProjectArt) ? item.art : arts[i % arts.length]) as ProjectArt,
  }
})

export const contact = contactJson
export const testimonial = {
  quote: contactJson.quote.text,
  author: contactJson.quote.author,
  role: contactJson.quote.role,
  initials: contactJson.quote.author
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join(""),
}
export const socials = contactJson.socials

export const caseStudy = caseStudyJson
