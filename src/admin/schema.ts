// Describes what can be edited in /admin. The forms are generated from this — add a field here
// (and use it in the site) and it appears in the editor.

export type Option = { label: string; value: string }

export type Field =
  | { kind: "string" | "text"; name: string; label: string; hint?: string }
  | { kind: "number"; name: string; label: string; hint?: string; min?: number; max?: number }
  | { kind: "select"; name: string; label: string; options: Option[]; hint?: string }
  | { kind: "image" | "file"; name: string; label: string; hint?: string }
  | { kind: "strings"; name: string; label: string; hint?: string; addLabel?: string }
  | { kind: "object"; name: string; label: string; fields: Field[]; hint?: string }
  | {
      kind: "list"
      name: string
      label: string
      fields: Field[]
      /** collapsed row title */
      title: (item: Record<string, unknown>, index: number) => string
      addLabel?: string
      min?: number
      max?: number
      hint?: string
    }

export type Section = { id: string; label: string; blurb: string; fields: Field[] }

const str = (v: unknown) => (typeof v === "string" ? v : "")

export const sections: Section[] = [
  {
    id: "site",
    label: "General & loading screen",
    blurb: "Your name, contact details, photo and the big loading screen.",
    fields: [
      { kind: "string", name: "name", label: "Full name", hint: "Shown in the nav bar, hero headline, code card and footer." },
      { kind: "string", name: "initials", label: "Initials", hint: "Shown instead of the name on very small screens." },
      { kind: "string", name: "title", label: "Browser tab title" },
      { kind: "text", name: "description", label: "Search-engine description" },
      { kind: "string", name: "email", label: "Email" },
      { kind: "string", name: "phone", label: "Phone" },
      { kind: "image", name: "photo", label: "Your photo", hint: "Used on the loading screen and in the hero. Portrait photos work best." },
      { kind: "file", name: "cv", label: "CV (PDF)", hint: "Powers the Download CV button." },
      { kind: "string", name: "introFirstLine", label: "Loading screen — first big line", hint: "Capitals look best, e.g. OGUNYEMI." },
      { kind: "string", name: "introSecondLine", label: "Loading screen — second big line" },
      { kind: "string", name: "introTagline", label: "Loading screen — tagline" },
    ],
  },
  {
    id: "home",
    label: "Home / hero",
    blurb: "The first screen visitors see after the loading screen.",
    fields: [
      { kind: "string", name: "badge", label: "Small badge" },
      { kind: "string", name: "greeting", label: "Greeting", hint: "Your name is added after this, e.g. “Hi, I'm …”." },
      { kind: "string", name: "headline", label: "Headline" },
      { kind: "text", name: "lead", label: "Intro paragraph" },
      { kind: "string", name: "primaryButton", label: "Main button text" },
      { kind: "string", name: "primaryLink", label: "Main button link", hint: "#projects, #contact… or a full web address." },
      { kind: "string", name: "secondaryButton", label: "Second button text" },
      { kind: "string", name: "techLabel", label: "Technologies heading" },
      {
        kind: "list",
        name: "techIcons",
        label: "Technology icons",
        title: (i) => str(i.name) || "New icon",
        addLabel: "Add icon",
        fields: [
          { kind: "string", name: "name", label: "Name" },
          { kind: "string", name: "icon", label: "Icon", hint: "A devicon name such as react, nodejs, python, figma (devicon.dev), or an uploaded image path." },
        ],
      },
      { kind: "string", name: "availability", label: "Availability badge", hint: "Leave empty to hide the floating badge." },
      { kind: "strings", name: "codeSkills", label: "Code card — skills", addLabel: "Add skill" },
      { kind: "string", name: "codePassion", label: "Code card — passion" },
    ],
  },
  {
    id: "about",
    label: "About",
    blurb: "Your story and the headline numbers.",
    fields: [
      { kind: "string", name: "tag", label: "Small label" },
      { kind: "string", name: "heading", label: "Heading", hint: "Put *stars* around words to make them the italic accent, e.g. I'm passionate about *creating* digital solutions." },
      { kind: "text", name: "text", label: "Paragraph" },
      { kind: "string", name: "button", label: "Button text" },
      {
        kind: "list",
        name: "stats",
        label: "Numbers",
        min: 2,
        max: 6,
        addLabel: "Add number",
        title: (i) => `${i.value ?? ""}${str(i.suffix)} ${str(i.label)}`.trim() || "New number",
        fields: [
          { kind: "number", name: "value", label: "Number", min: 0 },
          { kind: "string", name: "suffix", label: "Suffix", hint: "+ or %" },
          { kind: "string", name: "label", label: "Label" },
        ],
      },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    blurb: "The skill bars.",
    fields: [
      { kind: "string", name: "tag", label: "Small label" },
      { kind: "string", name: "heading", label: "Heading", hint: "Use *stars* around the accent word." },
      {
        kind: "list",
        name: "items",
        label: "Skills",
        addLabel: "Add skill",
        title: (i) => `${str(i.name) || "New skill"} — ${i.level ?? 0}%`,
        fields: [
          { kind: "string", name: "name", label: "Name" },
          { kind: "number", name: "level", label: "Level (0–100)", min: 0, max: 100 },
          { kind: "string", name: "icon", label: "Icon", hint: "A devicon name (react, python, figma…) or an uploaded image path." },
        ],
      },
    ],
  },
  {
    id: "projects",
    label: "Projects",
    blurb: "Your featured work. On phones these become a swipe carousel.",
    fields: [
      { kind: "string", name: "tag", label: "Small label" },
      { kind: "string", name: "heading", label: "Heading", hint: "Use *stars* around the accent words." },
      { kind: "string", name: "linkLabel", label: "Link text" },
      {
        kind: "list",
        name: "items",
        label: "Projects",
        addLabel: "Add project",
        title: (i) => str(i.title) || "New project",
        fields: [
          { kind: "string", name: "title", label: "Title" },
          { kind: "text", name: "blurb", label: "Description" },
          { kind: "string", name: "link", label: "Link", hint: "Live site or repository address." },
          { kind: "image", name: "image", label: "Screenshot", hint: "Leave empty to use the painted artwork below." },
          {
            kind: "select",
            name: "art",
            label: "Artwork (used when there is no screenshot)",
            options: [
              { label: "Bloom (glass sphere)", value: "bloom" },
              { label: "Ripple (rings)", value: "ripple" },
              { label: "Aurora (dark waves)", value: "aurora" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact & testimonial",
    blurb: "The get-in-touch area, a testimonial and your social links.",
    fields: [
      { kind: "string", name: "tag", label: "Small label" },
      { kind: "string", name: "heading", label: "Heading", hint: "Use *stars* around the accent words." },
      { kind: "text", name: "text", label: "Paragraph" },
      { kind: "string", name: "button", label: "Button text" },
      { kind: "string", name: "followLabel", label: "Social links heading" },
      {
        kind: "object",
        name: "quote",
        label: "Testimonial",
        fields: [
          { kind: "text", name: "text", label: "Quote" },
          { kind: "string", name: "author", label: "Author" },
          { kind: "string", name: "role", label: "Role / company" },
        ],
      },
      {
        kind: "list",
        name: "socials",
        label: "Social links",
        addLabel: "Add link",
        title: (i) => str(i.network) || "New link",
        fields: [
          {
            kind: "select",
            name: "network",
            label: "Network",
            options: [
              { label: "GitHub", value: "github" },
              { label: "LinkedIn", value: "linkedin" },
              { label: "X (Twitter)", value: "x" },
              { label: "Instagram", value: "instagram" },
              { label: "YouTube", value: "youtube" },
              { label: "Website", value: "website" },
              { label: "Email", value: "email" },
            ],
          },
          { kind: "string", name: "url", label: "Link", hint: "Full profile address (for Email, just the address)." },
        ],
      },
    ],
  },
]

/** A blank value for a field (used when adding list items). */
export function blank(field: Field): unknown {
  switch (field.kind) {
    case "number": return field.min ?? 0
    case "select": return field.options[0]?.value ?? ""
    case "strings": return []
    case "list": return []
    case "object": return Object.fromEntries(field.fields.map((f) => [f.name, blank(f)]))
    default: return ""
  }
}
