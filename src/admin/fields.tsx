import { useRef, useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp, FileText, ImagePlus, Plus, Trash2, Upload, X } from "lucide-react"
import { api } from "./api"
import { prepareUpload, UPLOAD_LIMIT } from "./image"
import { blank, type Field } from "./schema"

type Obj = Record<string, unknown>

const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[15px] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-[#00008B] focus:ring-4 focus:ring-[#00008B]/10"
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"

function Counter({ value, range }: { value: string; range: [number, number] }) {
  const n = value.length
  const ok = n >= range[0] && n <= range[1]
  return (
    <span className={`ml-2 text-xs font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>
      {n} characters · aim for {range[0]}–{range[1]}
    </span>
  )
}

function Label({ field, value, children }: { field: Field; value?: unknown; children: ReactNode }) {
  const range = "recommend" in field ? field.recommend : undefined
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-neutral-800">
        {field.label}
        {range && <Counter value={typeof value === "string" ? value : ""} range={range} />}
      </span>
      {children}
      {"hint" in field && field.hint ? <span className="mt-1.5 block text-[13px] leading-snug text-neutral-500">{field.hint}</span> : null}
    </label>
  )
}

/** Uploads to the server and reports the public URL. */
function UploadButton({ accept, label, onUploaded }: { accept: string; label: string; onUploaded: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    setError("")
    try {
      const ready = await prepareUpload(file)
      if (ready.size > UPLOAD_LIMIT) throw new Error("That file is over 4 MB — please use a smaller one.")
      onUploaded((await api.upload(ready)).url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ""
    }
  }

  return (
    <>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <button type="button" className={btnGhost} disabled={busy} onClick={() => ref.current?.click()}>
        <Upload className="size-4" /> {busy ? "Uploading…" : label}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </>
  )
}

function MediaField({ field, value, onChange }: { field: Extract<Field, { kind: "image" | "file" }>; value: string; onChange: (v: string) => void }) {
  const isImage = field.kind === "image"
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-800">{field.label}</span>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-300 bg-white p-3">
        {isImage ? (
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-md bg-neutral-100 text-neutral-400">
            {value ? <img src={value} alt="" className="size-full object-cover" /> : <ImagePlus className="size-6" />}
          </div>
        ) : (
          <div className="grid size-12 shrink-0 place-items-center rounded-md bg-neutral-100 text-neutral-500"><FileText className="size-5" /></div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <UploadButton accept={isImage ? "image/*" : "application/pdf"} label={value ? "Replace" : "Upload"} onUploaded={onChange} />
            {value && (
              <button type="button" className={btnGhost} onClick={() => onChange("")}>
                <X className="size-4" /> Remove
              </button>
            )}
          </div>
          <input className={`${inputCls} !py-1.5 !text-[13px] text-neutral-500`} value={value} placeholder="…or paste a link / path" onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
      {field.hint && <span className="mt-1.5 block text-[13px] leading-snug text-neutral-500">{field.hint}</span>}
    </div>
  )
}

function StringsField({ field, value, onChange }: { field: Extract<Field, { kind: "strings" }>; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-800">{field.label}</span>
      <div className="space-y-2">
        {value.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input className={inputCls} value={item} onChange={(e) => onChange(value.map((v, j) => (j === i ? e.target.value : v)))} />
            <button type="button" className={btnGhost} aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button type="button" className={btnGhost} onClick={() => onChange([...value, ""])}>
          <Plus className="size-4" /> {field.addLabel ?? "Add"}
        </button>
      </div>
      {field.hint && <span className="mt-1.5 block text-[13px] text-neutral-500">{field.hint}</span>}
    </div>
  )
}

function ListField({ field, value, onChange }: { field: Extract<Field, { kind: "list" }>; value: Obj[]; onChange: (v: Obj[]) => void }) {
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggle = (i: number) => setOpen((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })
  const move = (i: number, d: -1 | 1) => {
    const j = i + d
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
    setOpen(new Set())
  }
  const canAdd = field.max === undefined || value.length < field.max
  const canRemove = field.min === undefined || value.length > field.min

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold text-neutral-800">
        {field.label} <span className="font-normal text-neutral-400">· {value.length}</span>
      </span>
      <div className="space-y-2">
        {value.map((item, i) => {
          const isOpen = open.has(i)
          return (
            <div key={i} className="overflow-hidden rounded-xl border border-neutral-300 bg-white">
              <div className="flex items-center gap-1 bg-neutral-50 px-2 py-1.5">
                <button type="button" onClick={() => toggle(i)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-100">
                  <ChevronDown className={`size-4 shrink-0 text-neutral-500 transition ${isOpen ? "" : "-rotate-90"}`} />
                  <span className="truncate">{field.title(item, i)}</span>
                </button>
                <button type="button" aria-label="Move up" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp className="size-4" /></button>
                <button type="button" aria-label="Move down" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30" disabled={i === value.length - 1} onClick={() => move(i, 1)}><ChevronDown className="size-4" /></button>
                <button type="button" aria-label="Delete" disabled={!canRemove} className="rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30" onClick={() => { onChange(value.filter((_, j) => j !== i)); setOpen(new Set()) }}><Trash2 className="size-4" /></button>
              </div>
              {isOpen && (
                <div className="space-y-4 border-t border-neutral-200 p-4">
                  <Fields fields={field.fields} value={item} onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))} />
                </div>
              )}
            </div>
          )
        })}
        <button
          type="button"
          className={btnGhost}
          disabled={!canAdd}
          onClick={() => {
            onChange([...value, Object.fromEntries(field.fields.map((f) => [f.name, blank(f)]))])
            setOpen(new Set([value.length]))
          }}
        >
          <Plus className="size-4" /> {field.addLabel ?? "Add"}
        </button>
      </div>
      {field.hint && <span className="mt-1.5 block text-[13px] text-neutral-500">{field.hint}</span>}
    </div>
  )
}

export function FieldView({ field, value, onChange }: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.kind) {
    case "string":
      return <Label field={field} value={value}><input className={inputCls} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} /></Label>
    case "text":
      return <Label field={field} value={value}><textarea className={`${inputCls} min-h-[96px] resize-y leading-relaxed`} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} /></Label>
    case "number":
      return (
        <Label field={field}>
          <input
            type="number"
            className={inputCls}
            min={field.min}
            max={field.max}
            value={value === undefined || value === "" ? "" : String(value)}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </Label>
      )
    case "select":
      return (
        <Label field={field}>
          <select className={inputCls} value={(value as string) || field.options[0]?.value} onChange={(e) => onChange(e.target.value)}>
            {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Label>
      )
    case "image":
    case "file":
      return <MediaField field={field} value={(value as string) ?? ""} onChange={onChange} />
    case "strings":
      return <StringsField field={field} value={(value as string[]) ?? []} onChange={onChange} />
    case "list":
      return <ListField field={field} value={(value as Obj[]) ?? []} onChange={onChange} />
    case "object":
      return (
        <fieldset className="rounded-xl border border-neutral-300 bg-white p-4">
          <legend className="px-2 text-sm font-semibold text-neutral-800">{field.label}</legend>
          <div className="space-y-4">
            <Fields fields={field.fields} value={(value as Obj) ?? {}} onChange={onChange} />
          </div>
        </fieldset>
      )
  }
}

export function Fields({ fields, value, onChange }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void }) {
  return (
    <>
      {fields.map((f) => (
        <FieldView key={f.name} field={f} value={value[f.name]} onChange={(v) => onChange({ ...value, [f.name]: v })} />
      ))}
    </>
  )
}
