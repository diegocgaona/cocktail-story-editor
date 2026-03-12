import { useState, useCallback, useRef } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const SLOT_LABELS = ["top", "middle", "bottom"];
const CONTENT_TYPES = ["text", "media", "mixed", "spacer"];
const MEDIA_TYPES = ["image", "video"];
const CONTENT_SCALES = ["crop_fullscreen", "fit_width", "fit_height", "fit"];
const V_ALIGNMENTS = ["start", "center", "end"];
const TEXT_BLOCK_TYPES = ["heading", "paragraph", "bullet_list"];
const H_ALIGNMENTS = ["left", "center", "right"];
const FONT_FAMILIES = [
  "Bebas Neue",
  "Saira Extra Condensed",
  "Alex Brush",
  "Cookie",
  "Gabarito",
  "Italianno",
  "Playball",
  "Poiretone",
  "Romanesco",
  "Im Fell Pica",
  "Poly",
  "Playfair Display",
  "Cinzel",
  "Montserrat",
];
const BLEND_MODES = [
  "normal",
  "multiply",
  "screen",
  "overlay",
  "darken",
  "lighten",
  "color-dodge",
  "color-burn",
  "hard-light",
  "soft-light",
  "difference",
  "exclusion",
];

// ─── Colors ───────────────────────────────────────────────────────────────────
const c = {
  bg: "#080808",
  surface: "#111",
  s2: "#181818",
  s3: "#222",
  border: "#252525",
  border2: "#303030",
  border3: "#3a3a3a",
  gold: "#d4aa50",
  goldFaint: "#160f00",
  goldDim: "#7a6020",
  text: "#e8e8e8",
  dim: "#aaa",
  muted: "#777",
  faint: "#555",
  mediaC: "#5aaddf",
  mediaB: "#0d1e2a",
  textC: "#6ecf88",
  textB: "#0d1e12",
  spacerC: "#888",
  spacerB: "#131313",
  mixedC: "#e08fcf",
  mixedB: "#1e0d1a",
  label: "#bbb",
  sectionTitle: "#ccc",
};

function typeColor(t) {
  return (
    { media: c.mediaC, text: c.textC, spacer: c.spacerC, mixed: c.mixedC }[t] ||
    c.dim
  );
}
function typeBg(t) {
  return (
    { media: c.mediaB, text: c.textB, spacer: c.spacerB, mixed: c.mixedB }[t] ||
    c.s2
  );
}

// ─── Helpers & Migration ──────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).substr(2, 8);
}
function getOccupied(layout) {
  const occ = new Set();
  for (const b of layout)
    for (let s = b.startSlot; s <= b.endSlot; s++) occ.add(s);
  return occ;
}
function getFreeRanges(layout) {
  const occ = getOccupied(layout);
  const free = [1, 2, 3].filter((s) => !occ.has(s));
  const ranges = [];
  let i = 0;
  while (i < free.length) {
    let start = free[i],
      end = free[i];
    while (i + 1 < free.length && free[i + 1] === end + 1) {
      i++;
      end = free[i];
    }
    ranges.push({ startSlot: start, endSlot: end });
    i++;
  }
  return ranges;
}
function newBlock(start, end) {
  return {
    blockId: uid(),
    startSlot: start,
    endSlot: end,
    verticalAlignment: "center",
    zIndex: 0,
    offset: { x: 0, y: 0 },
    content: { type: "spacer" },
  };
}

const newSpan = () => ({
  text: { en: "New span" }, // Changed to object
  isBold: false,
  isItalic: false,
  link: null,
  opacity: 1,
});
const newTextBlock = () => ({
  type: "paragraph",
  fontFamily: "Saira Extra Condensed",
  fontSize: 16,
  letterSpacing: 0.5,
  horizontalAlignment: "center",
  opacity: 1,
  blendMode: "normal",
  spans: [newSpan()],
});
function newSlide() {
  return {
    slideId: "slide_" + uid().substr(0, 5),
    backgroundColor: "#0d0d0d",
    durationMs: 6000,
    layout: [
      {
        blockId: uid(),
        startSlot: 1,
        endSlot: 3,
        verticalAlignment: "center",
        zIndex: 0,
        offset: { x: 0, y: 0 },
        content: {
          type: "text",
          textBlocks: [
            {
              type: "heading",
              fontFamily: "Bebas Neue",
              fontSize: 30,
              letterSpacing: 1.2,
              horizontalAlignment: "center",
              opacity: 1,
              blendMode: "normal",
              spans: [
                {
                  text: { en: "New Slide" },
                  isBold: true,
                  isItalic: false,
                  link: null,
                },
              ],
            },
          ],
        },
      },
    ],
  };
}

// Automatically formats old string properties to new Translation objects
function migrateStory(story) {
  return {
    ...story,
    title:
      typeof story.title === "string"
        ? { en: story.title }
        : story.title || { en: "" },
    slides: (story.slides || []).map(migrateSlide),
  };
}
function migrateSlide(sl) {
  return { ...sl, layout: (sl.layout || []).map(migrateBlock) };
}
function migrateBlock(b) {
  return {
    zIndex: 0,
    offset: { x: 0, y: 0 },
    ...b,
    content: migrateContent(b.content),
  };
}
function migrateContent(content) {
  if (!content) return content;
  const c2 = { opacity: 1, blendMode: "normal", ...content };
  if (c2.textBlocks)
    c2.textBlocks = c2.textBlocks.map((tb) => ({
      opacity: 1,
      blendMode: "normal",
      ...tb,
      ...(tb.spans
        ? {
            spans: tb.spans.map((sp) => ({
              opacity: 1,
              ...sp,
              text:
                typeof sp.text === "string"
                  ? { en: sp.text }
                  : sp.text || { en: "" },
            })),
          }
        : {}),
      ...(tb.items
        ? {
            items: tb.items.map((item) => {
              if (typeof item === "string")
                return { text: { en: item }, link: null };
              return {
                ...item,
                text:
                  typeof item.text === "string"
                    ? { en: item.text }
                    : item.text || { en: "" },
              };
            }),
          }
        : {}),
    }));
  return c2;
}

const INITIAL = {
  storyId: "martini-story",
  title: "The Art of the Martini", // Will be auto-migrated
  slides: [],
};

// ─── Primitives ───────────────────────────────────────────────────────────────
function Lbl({ children, accent }) {
  return (
    <div
      style={{
        fontSize: 9,
        color: accent || c.label,
        marginBottom: 3,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontFamily: "monospace",
      }}
    >
      {children}
    </div>
  );
}
function Inp({
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  style: s = {},
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={(e) =>
        onChange(
          type === "number" ? parseFloat(e.target.value) || 0 : e.target.value
        )
      }
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: c.s3,
        border: `1px solid ${c.border2}`,
        borderRadius: 4,
        padding: "5px 8px",
        color: c.text,
        fontSize: 12,
        fontFamily: "monospace",
        outline: "none",
        ...s,
      }}
    />
  );
}

// ─── NEW: Translation Input Component ─────────────────────────────────────────
function TransInp({ value, onChange, placeholder }) {
  const [expanded, setExpanded] = useState(false);
  const val = typeof value === "string" ? { en: value } : value || { en: "" };
  const update = (lang, t) => onChange({ ...val, [lang]: t });

  const inpS = {
    flex: 1,
    background: c.s3,
    border: `1px solid ${c.border2}`,
    borderRadius: 4,
    padding: "4px 8px",
    color: c.text,
    fontSize: 12,
    fontFamily: "monospace",
    minWidth: 0,
  };
  const subInpS = {
    flex: 1,
    background: c.s2,
    border: `1px dashed ${c.border2}`,
    borderRadius: 4,
    padding: "4px 8px",
    color: c.dim,
    fontSize: 11,
    fontFamily: "monospace",
    minWidth: 0,
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", gap: 4 }}>
        <div
          style={{
            width: 16,
            fontSize: 8,
            color: c.dim,
            display: "flex",
            alignItems: "center",
            fontFamily: "monospace",
          }}
        >
          TXT
        </div>
        <input
          value={val.txt || ""}
          onChange={(e) => update("txt", e.target.value)}
          placeholder={placeholder}
          style={inpS}
        />
        <button
          onClick={() => setExpanded(!expanded)}
          title="Translations"
          style={{
            background: expanded ? c.gold : c.s3,
            border: `1px solid ${expanded ? c.goldDim : c.border2}`,
            color: expanded ? "#000" : c.dim,
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 12,
            padding: "0 6px",
            display: "flex",
            alignItems: "center",
          }}
        >
          🌐
        </button>
      </div>
      {expanded && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            paddingLeft: 20,
          }}
        >
          {["en", "pt", "es"].map((lang) => (
            <div key={lang} style={{ display: "flex", gap: 4 }}>
              <div
                style={{
                  width: 14,
                  fontSize: 8,
                  color: c.gold,
                  display: "flex",
                  alignItems: "center",
                  fontFamily: "monospace",
                }}
              >
                {lang.toUpperCase()}
              </div>
              <input
                value={val[lang] || ""}
                onChange={(e) => update(lang, e.target.value)}
                placeholder={`${lang} translation`}
                style={subInpS}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sel({ value, options, onChange }) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        boxSizing: "border-box",
        background: c.s3,
        border: `1px solid ${c.border2}`,
        borderRadius: 4,
        padding: "5px 8px",
        color: c.text,
        fontSize: 12,
        fontFamily: "monospace",
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.v ?? o} value={o.v ?? o}>
          {o.l ?? o}
        </option>
      ))}
    </select>
  );
}
function Tog({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 28,
          height: 15,
          borderRadius: 8,
          background: value ? c.gold : c.s3,
          position: "relative",
          transition: "background .2s",
          flexShrink: 0,
          border: `1px solid ${value ? c.gold : c.border3}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 1,
            left: value ? 13 : 1,
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: "#fff",
            transition: "left .2s",
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: 11, color: c.dim, fontFamily: "monospace" }}>
          {label}
        </span>
      )}
    </label>
  );
}
function IconBtn({ children, onClick, color, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "rgba(0,0,0,.5)",
        border: `1px solid ${c.border3}`,
        color: color || c.dim,
        borderRadius: 3,
        width: 18,
        height: 18,
        cursor: "pointer",
        fontSize: 11,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
function Divider({ label }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        margin: "12px 0",
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 9,
            color: c.sectionTitle,
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            flexShrink: 0,
          }}
        >
          {label}
        </span>
      )}
      <div style={{ height: 1, flex: 1, background: c.border2 }} />
    </div>
  );
}
function Row({ children, cols }) {
  const count = cols || children.filter(Boolean).length;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${count}, 1fr)`,
        gap: "0 10px",
      }}
    >
      {children}
    </div>
  );
}
function Field({ label, accent, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <Lbl accent={accent}>{label}</Lbl>
      {children}
    </div>
  );
}

// ─── Opacity + Blend Row ──────────────────────────────────────────────────────
function OpacityBlendRow({
  opacity = 1,
  blendMode = "normal",
  onChange,
  compact,
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-end",
        marginBottom: 8,
      }}
    >
      <div style={{ flex: compact ? 1 : 2 }}>
        <Lbl>Opacity</Lbl>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={opacity}
            onChange={(e) =>
              onChange({ opacity: parseFloat(e.target.value), blendMode })
            }
            style={{ flex: 1, accentColor: c.gold, height: 14 }}
          />
          <span
            style={{
              fontSize: 11,
              color: c.dim,
              fontFamily: "monospace",
              width: 30,
              textAlign: "right",
            }}
          >
            {Math.round(opacity * 100)}%
          </span>
        </div>
      </div>
      <div style={{ flex: compact ? 1 : 2 }}>
        <Lbl>Blend Mode</Lbl>
        <Sel
          value={blendMode}
          options={BLEND_MODES}
          onChange={(v) => onChange({ opacity, blendMode: v })}
        />
      </div>
    </div>
  );
}

// ─── Slot Grid ────────────────────────────────────────────────────────────────
const SLOT_H = 88;

function SlotGrid({ slide, selectedId, onSelect, onUpdate, previewLang }) {
  const { layout } = slide;
  const freeRanges = getFreeRanges(layout);
  const setLayout = (l) => onUpdate({ ...slide, layout: l });
  const updBlock = (b) =>
    setLayout(layout.map((x) => (x.blockId === b.blockId ? b : x)));
  const delBlock = (id) => {
    setLayout(layout.filter((x) => x.blockId !== id));
    if (selectedId === id) onSelect(null);
  };
  const addBlock = (s, e) => {
    const nb = newBlock(s, e);
    setLayout([...layout, nb]);
    onSelect(nb.blockId);
  };

  return (
    <div style={{ display: "flex", gap: 0 }}>
      <div style={{ width: 48, flexShrink: 0 }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              height: SLOT_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: 8,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: c.muted,
                fontFamily: "monospace",
                textTransform: "uppercase",
              }}
            >
              {SLOT_LABELS[s - 1]}
            </span>
          </div>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          position: "relative",
          height: SLOT_H * 3,
          border: `1px solid ${c.border2}`,
          borderRadius: 8,
          overflow: "hidden",
          background: c.surface,
        }}
      >
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: i * SLOT_H,
              left: 0,
              right: 0,
              height: 1,
              background: c.border,
            }}
          />
        ))}
        {[...layout]
          .sort((a, b) => a.startSlot - b.startSlot)
          .map((block) => {
            const top = (block.startSlot - 1) * SLOT_H,
              height = (block.endSlot - block.startSlot + 1) * SLOT_H;
            const isSel = block.blockId === selectedId;
            const ac = typeColor(block.content.type),
              bg = typeBg(block.content.type);
            return (
              <div
                key={block.blockId}
                onClick={() => onSelect(isSel ? null : block.blockId)}
                style={{
                  position: "absolute",
                  top: top + 2,
                  left: 2,
                  right: 2,
                  height: height - 4,
                  background: bg,
                  border: `2px solid ${isSel ? ac : c.border2}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent:
                    { start: "flex-start", center: "center", end: "flex-end" }[
                      block.verticalAlignment
                    ] || "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: "4px 7px",
                    background: "rgba(0,0,0,.7)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: ac,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: ac,
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      flex: 1,
                    }}
                  >
                    {block.content.type}
                  </span>
                  <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
                    <IconBtn
                      onClick={(e) => {
                        e.stopPropagation();
                        delBlock(block.blockId);
                      }}
                      color="#e06060"
                      title="Remove"
                    >
                      ×
                    </IconBtn>
                  </div>
                </div>
                <div
                  style={{
                    padding: "26px 8px 22px",
                    overflow: "hidden",
                    flex: 1,
                  }}
                >
                  <GridBlockPreview block={block} previewLang={previewLang} />
                </div>
              </div>
            );
          })}
        {freeRanges.map((r) => (
          <div
            key={`f${r.startSlot}`}
            style={{
              position: "absolute",
              top: (r.startSlot - 1) * SLOT_H + 2,
              left: 2,
              right: 2,
              height: (r.endSlot - r.startSlot + 1) * SLOT_H - 4,
              border: `1px dashed ${c.border2}`,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <button
              onClick={() => addBlock(r.startSlot, r.endSlot)}
              style={{
                background: "none",
                border: `1px solid ${c.border3}`,
                color: c.dim,
                borderRadius: 4,
                padding: "4px 14px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              + block
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GridBlockPreview({ block, previewLang }) {
  const { content } = block;
  if (content.type === "spacer")
    return (
      <div
        style={{
          color: c.spacerC,
          fontSize: 10,
          fontFamily: "monospace",
          opacity: 0.5,
          textAlign: "center",
        }}
      >
        ↕
      </div>
    );
  if (content.type === "media" || content.type === "mixed") {
    const isVid = content.mediaType === "video";
    return (
      <div
        style={{
          color: typeColor(content.type),
          fontSize: 10,
          fontFamily: "monospace",
          opacity: 0.8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {content.type === "mixed" ? "⊞" : isVid ? "▶" : "⬛"}{" "}
        {(content.url || "—").split("/").pop()?.substr(0, 26)}
      </div>
    );
  }
  if (content.type === "text") {
    const firstTb = content.textBlocks?.[0];
    const pObj = firstTb?.spans?.[0]?.text || firstTb?.items?.[0]?.text || {};
    const p = pObj[previewLang] || pObj.txt || "";
    return (
      <div
        style={{
          color: c.textC,
          fontSize: 10,
          fontFamily: "monospace",
          opacity: 0.8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        "{p}"
      </div>
    );
  }
  return null;
}

// ─── Block Editor ─────────────────────────────────────────────────────────────
function BlockEditor({ block, onUpdate }) {
  const set = (f) => onUpdate({ ...block, ...f });
  const setContent = (content) => onUpdate({ ...block, content });

  return (
    <div>
      <Row cols={2}>
        <Field label="Content Type">
          <Sel
            value={block.content.type}
            options={CONTENT_TYPES}
            onChange={(v) =>
              setContent({ type: v, opacity: 1, blendMode: "normal" })
            }
          />
        </Field>
        <Field label="V-Alignment">
          <Sel
            value={block.verticalAlignment}
            options={V_ALIGNMENTS}
            onChange={(v) => set({ verticalAlignment: v })}
          />
        </Field>
      </Row>
      <Divider label="Content" />
      {block.content.type === "media" && (
        <MediaEditor content={block.content} onChange={setContent} />
      )}
      {block.content.type === "text" && (
        <TextEditor content={block.content} onChange={setContent} />
      )}
      {block.content.type === "mixed" && (
        <MixedEditor content={block.content} onChange={setContent} />
      )}
      {block.content.type === "spacer" && (
        <div
          style={{
            textAlign: "center",
            color: c.dim,
            fontSize: 12,
            fontFamily: "monospace",
            padding: 16,
            border: `1px dashed ${c.border2}`,
            borderRadius: 6,
          }}
        >
          ↕ Empty space block
        </div>
      )}
    </div>
  );
}

function MediaEditor({ content, onChange }) {
  return (
    <>
      <Row cols={2}>
        <Field label="Media Type">
          <Sel
            value={content.mediaType || "image"}
            options={MEDIA_TYPES}
            onChange={(v) => onChange({ ...content, mediaType: v })}
          />
        </Field>
        <Field label="Scale">
          <Sel
            value={content.contentScale || "crop_fullscreen"}
            options={CONTENT_SCALES}
            onChange={(v) => onChange({ ...content, contentScale: v })}
          />
        </Field>
      </Row>
      <Field label="URL">
        <Inp
          value={content.url}
          onChange={(v) => onChange({ ...content, url: v })}
          placeholder="https://..."
        />
      </Field>
      <Divider label="Appearance" />
      <OpacityBlendRow
        opacity={content.opacity ?? 1}
        blendMode={content.blendMode || "normal"}
        onChange={({ opacity, blendMode }) =>
          onChange({ ...content, opacity, blendMode })
        }
      />
    </>
  );
}

function MixedEditor({ content, onChange }) {
  return (
    <>
      <Row cols={2}>
        <Field label="Media Type">
          <Sel
            value={content.mediaType || "image"}
            options={MEDIA_TYPES}
            onChange={(v) => onChange({ ...content, mediaType: v })}
          />
        </Field>
        <Field label="Scale">
          <Sel
            value={content.contentScale || "crop_fullscreen"}
            options={CONTENT_SCALES}
            onChange={(v) => onChange({ ...content, contentScale: v })}
          />
        </Field>
      </Row>
      <Field label="URL">
        <Inp
          value={content.url}
          onChange={(v) => onChange({ ...content, url: v })}
          placeholder="https://..."
        />
      </Field>
      <Divider label="Media Appearance" />
      <OpacityBlendRow
        opacity={content.opacity ?? 1}
        blendMode={content.blendMode || "normal"}
        onChange={({ opacity, blendMode }) =>
          onChange({ ...content, opacity, blendMode })
        }
      />
      <Field label="Overlay Darkness">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={content.overlayOpacity ?? 0.4}
            onChange={(e) =>
              onChange({
                ...content,
                overlayOpacity: parseFloat(e.target.value),
              })
            }
            style={{ flex: 1, accentColor: c.mixedC }}
          />
          <span
            style={{
              fontSize: 11,
              color: c.dim,
              fontFamily: "monospace",
              width: 30,
            }}
          >
            {((content.overlayOpacity ?? 0.4) * 100).toFixed(0)}%
          </span>
        </div>
      </Field>
      <Divider label="Overlay Text" />
      <TextEditor
        content={{
          textBlocks: content.textBlocks || [],
          opacity: 1,
          blendMode: "normal",
        }}
        onChange={(tc) => onChange({ ...content, textBlocks: tc.textBlocks })}
      />
    </>
  );
}

function TextEditor({ content, onChange }) {
  const blocks = content.textBlocks || [];
  const add = () =>
    onChange({ ...content, textBlocks: [...blocks, newTextBlock()] });
  const upd = (i, b) => {
    const tb = [...blocks];
    tb[i] = b;
    onChange({ ...content, textBlocks: tb });
  };
  const del = (i) =>
    onChange({ ...content, textBlocks: blocks.filter((_, j) => j !== i) });

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          marginTop: 4,
        }}
      >
        <Lbl accent={c.textC}>Text Blocks · {blocks.length}</Lbl>
        <button
          onClick={add}
          style={{
            background: c.textB,
            border: `1px solid ${c.textC}`,
            color: c.textC,
            borderRadius: 3,
            padding: "2px 10px",
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "monospace",
          }}
        >
          + block
        </button>
      </div>
      {blocks.map((b, i) => (
        <TextBlockItem
          key={i}
          block={b}
          onChange={(v) => upd(i, v)}
          onRemove={() => del(i)}
        />
      ))}
    </>
  );
}

function TextBlockItem({ block, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const isBullet = block.type === "bullet_list";
  return (
    <div
      style={{
        background: c.s2,
        border: `1px solid ${c.border2}`,
        borderRadius: 6,
        marginBottom: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          cursor: "pointer",
          background: c.surface,
        }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontSize: 9,
              color: c.textC,
              fontFamily: "monospace",
              textTransform: "uppercase",
            }}
          >
            {block.type}
          </span>
          <span
            style={{ fontSize: 9, color: c.muted, fontFamily: "monospace" }}
          >
            {block.fontFamily} {block.fontSize}px
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: c.muted, fontSize: 10 }}>
            {open ? "▲" : "▼"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              background: "none",
              border: "none",
              color: "#e06060",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>
      {open && (
        <div style={{ padding: 10 }}>
          <Row cols={3}>
            <Field label="Type">
              <Sel
                value={block.type}
                options={TEXT_BLOCK_TYPES}
                onChange={(v) => onChange({ ...block, type: v })}
              />
            </Field>
            <Field label="Font">
              <Sel
                value={block.fontFamily}
                options={FONT_FAMILIES}
                onChange={(v) => onChange({ ...block, fontFamily: v })}
              />
            </Field>
            <Field label="Size">
              <Inp
                value={block.fontSize}
                onChange={(v) => onChange({ ...block, fontSize: v })}
                type="number"
              />
            </Field>
          </Row>
          <Row cols={2}>
            <Field label="Letter Spacing">
              <Inp
                value={block.letterSpacing}
                onChange={(v) => onChange({ ...block, letterSpacing: v })}
                type="number"
              />
            </Field>
            <Field label="H-Align">
              <Sel
                value={block.horizontalAlignment}
                options={H_ALIGNMENTS}
                onChange={(v) => onChange({ ...block, horizontalAlignment: v })}
              />
            </Field>
          </Row>

          {isBullet ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Lbl>Bullet Items</Lbl>
                <button
                  onClick={() =>
                    onChange({
                      ...block,
                      items: [
                        ...(block.items || []),
                        { text: { en: "New item" }, link: null },
                      ],
                    })
                  }
                  style={{
                    background: "none",
                    border: `1px solid ${c.border3}`,
                    color: c.dim,
                    borderRadius: 3,
                    padding: "1px 7px",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  + item
                </button>
              </div>
              {(block.items || []).map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: c.surface,
                    border: `1px solid ${c.border}`,
                    borderRadius: 5,
                    padding: "7px 8px",
                    marginBottom: 5,
                  }}
                >
                  <div style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                    <TransInp
                      value={item.text}
                      onChange={(v) => {
                        const it = [...block.items];
                        it[i] = { ...item, text: v };
                        onChange({ ...block, items: it });
                      }}
                      placeholder="Item text..."
                    />
                    <button
                      onClick={() =>
                        onChange({
                          ...block,
                          items: block.items.filter((_, j) => j !== i),
                        })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#e06060",
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5,
                }}
              >
                <Lbl>Spans</Lbl>
                <button
                  onClick={() =>
                    onChange({
                      ...block,
                      spans: [...(block.spans || []), newSpan()],
                    })
                  }
                  style={{
                    background: "none",
                    border: `1px solid ${c.border3}`,
                    color: c.dim,
                    borderRadius: 3,
                    padding: "1px 7px",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  + span
                </button>
              </div>
              {(block.spans || []).map((span, i) => (
                <SpanEditor
                  key={i}
                  span={span}
                  onChange={(v) => {
                    const sp = [...block.spans];
                    sp[i] = v;
                    onChange({ ...block, spans: sp });
                  }}
                  onRemove={() =>
                    onChange({
                      ...block,
                      spans: block.spans.filter((_, j) => j !== i),
                    })
                  }
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SpanEditor({ span, onChange, onRemove }) {
  return (
    <div
      style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: 5,
        padding: "7px 8px",
        marginBottom: 5,
      }}
    >
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        <TransInp
          value={span.text}
          onChange={(v) => onChange({ ...span, text: v })}
          placeholder="Span text..."
        />
        <button
          onClick={onRemove}
          style={{
            background: "none",
            border: "none",
            color: "#e06060",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ×
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <Tog
          label="Bold"
          value={span.isBold}
          onChange={(v) => onChange({ ...span, isBold: v })}
        />
        <Tog
          label="Italic"
          value={span.isItalic}
          onChange={(v) => onChange({ ...span, isItalic: v })}
        />
        <input
          value={span.link || ""}
          onChange={(e) => onChange({ ...span, link: e.target.value || null })}
          placeholder="link url (optional)"
          style={{
            flex: 1,
            minWidth: 90,
            background: c.s3,
            border: `1px solid ${c.border2}`,
            borderRadius: 4,
            padding: "3px 7px",
            color: c.text,
            fontSize: 11,
            fontFamily: "monospace",
          }}
        />
      </div>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function SlidePreview({ slide, previewLang }) {
  if (!slide) return null;
  const sorted = [...(slide.layout || [])].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0)
  );
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: slide.backgroundColor || "#000",
        display: "grid",
        gridTemplateRows: "1fr 1fr 1fr",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {sorted.map((block) => (
        <div
          key={block.blockId}
          style={{
            gridRow: `${block.startSlot} / ${block.endSlot + 1}`,
            display: "flex",
            flexDirection: "column",
            justifyContent:
              { start: "flex-start", center: "center", end: "flex-end" }[
                block.verticalAlignment
              ] || "center",
            position: "relative",
            overflow: "visible",
            zIndex: block.zIndex || 0,
          }}
        >
          <PreviewContent block={block} previewLang={previewLang} />
        </div>
      ))}
    </div>
  );
}

function PreviewContent({ block, previewLang }) {
  const { content } = block;
  if (content.type === "spacer") return null;
  const blockOpacity = content.opacity ?? 1,
    blockBlend = content.blendMode || "normal";

  if (content.type === "media") {
    return (
      <img
        src={content.url}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: content.contentScale?.includes("crop")
            ? "cover"
            : "contain",
          display: "block",
          opacity: blockOpacity,
          mixBlendMode: blockBlend,
        }}
        onError={(e) => (e.target.style.opacity = 0)}
      />
    );
  }
  if (content.type === "mixed") {
    return (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {content.url && (
          <img
            src={content.url}
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: content.contentScale?.includes("crop")
                ? "cover"
                : "contain",
              opacity: blockOpacity,
              mixBlendMode: blockBlend,
            }}
            onError={(e) => (e.target.style.opacity = 0)}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${content.overlayOpacity ?? 0.4})`,
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "4px 10px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {(content.textBlocks || []).map((tb, i) => (
            <PreviewTextBlock key={i} tb={tb} previewLang={previewLang} />
          ))}
        </div>
      </div>
    );
  }
  if (content.type === "text") {
    return (
      <div
        style={{
          padding: "4px 10px",
          width: "100%",
          boxSizing: "border-box",
          opacity: blockOpacity,
          mixBlendMode: blockBlend,
        }}
      >
        {(content.textBlocks || []).map((tb, i) => (
          <PreviewTextBlock key={i} tb={tb} previewLang={previewLang} />
        ))}
      </div>
    );
  }
  return null;
}

function PreviewTextBlock({ tb, previewLang }) {
  const blockStyle = {
    opacity: tb.opacity ?? 1,
    mixBlendMode: tb.blendMode || "normal",
  };
  if (tb.type === "bullet_list")
    return (
      <ul
        style={{
          margin: "2px 0",
          paddingLeft: 12,
          textAlign: tb.horizontalAlignment,
          fontFamily: tb.fontFamily || "sans-serif",
          fontSize: (tb.fontSize || 14) * 0.46 + "px",
          color: "#fff",
          lineHeight: 1.4,
          letterSpacing: (tb.letterSpacing || 0) + "px",
          ...blockStyle,
        }}
      >
        {(tb.items || []).map((item, j) => {
          const link = typeof item === "string" ? null : item.link;
          const tObj = item.text || {};
          const displayTxt = tObj[previewLang] || tObj.txt || "";
          return (
            <li
              key={j}
              style={{
                color: link ? "#d4aa50" : "#fff",
                textDecoration: link ? "underline" : "none",
              }}
            >
              {displayTxt}
            </li>
          );
        })}
      </ul>
    );
  return (
    <p
      style={{
        margin: "2px 0",
        textAlign: tb.horizontalAlignment,
        fontFamily: tb.fontFamily || "sans-serif",
        fontSize: (tb.fontSize || 14) * 0.46 + "px",
        letterSpacing: (tb.letterSpacing || 0) + "px",
        color: "#fff",
        lineHeight: 1.35,
        fontWeight: tb.type === "heading" ? "bold" : "normal",
        ...blockStyle,
      }}
    >
      {(tb.spans || []).map((span, j) => {
        const tObj = span.text || {};
        const displayTxt = tObj[previewLang] || tObj.txt || "";
        return (
          <span
            key={j}
            style={{
              fontWeight: span.isBold ? "bold" : "inherit",
              fontStyle: span.isItalic ? "italic" : "inherit",
              textDecoration: span.link ? "underline" : "none",
              color: span.link ? c.gold : "inherit",
              opacity: span.opacity ?? 1,
            }}
          >
            {displayTxt}
          </span>
        );
      })}
    </p>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onImport, onClose }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(null);
  const fileRef = useRef();

  const tryParse = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        // If they imported an array (like the one we just made), grab the first story
        if (!parsed[0].slides)
          throw new Error("First object is missing 'slides' array");
        onImport(migrateStory(parsed[0]));
      } else {
        if (!parsed.slides) throw new Error("Missing 'slides' array");
        onImport(migrateStory(parsed));
      }
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.88)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: c.s2,
          border: `1px solid ${c.border2}`,
          borderRadius: 10,
          width: 560,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${c.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: c.gold,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Import JSON
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: c.dim,
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: 16, flex: 1, overflowY: "auto" }}>
          <textarea
            value={val}
            onChange={(e) => {
              setVal(e.target.value);
              setErr(null);
            }}
            style={{
              width: "100%",
              boxSizing: "border-box",
              height: 240,
              background: c.s3,
              border: `1px solid ${err ? "#e06060" : c.border2}`,
              borderRadius: 6,
              padding: 10,
              color: c.text,
              fontSize: 11,
              fontFamily: "monospace",
              resize: "vertical",
              outline: "none",
            }}
          />
          {err && (
            <div
              style={{
                fontSize: 11,
                color: "#f89898",
                fontFamily: "monospace",
                marginTop: 6,
                padding: "5px 8px",
                background: "#1a0808",
                borderRadius: 4,
              }}
            >
              ⚠ {err}
            </div>
          )}
        </div>
        <div
          style={{
            padding: "10px 16px",
            borderTop: `1px solid ${c.border}`,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => tryParse(val)}
            disabled={!val.trim()}
            style={{
              background: c.gold,
              border: "none",
              color: "#000",
              borderRadius: 4,
              padding: "6px 18px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "monospace",
              fontWeight: "bold",
              opacity: val.trim() ? 1 : 0.4,
            }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function StoryEditor() {
  const [story, setStory] = useState(() => migrateStory(INITIAL));
  const [slideIdx, setSlideIdx] = useState(0);
  const [selBlock, setSelBlock] = useState(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("edit");
  const [showImport, setShowImport] = useState(false);
  const [previewLang, setPreviewLang] = useState("txt"); // NEW: Global Preview Language

  const slide = story.slides[slideIdx];
  const selectedBlock =
    slide?.layout.find((b) => b.blockId === selBlock) || null;

  const updateSlide = useCallback(
    (updated) =>
      setStory((s) => ({
        ...s,
        slides: s.slides.map((sl, i) => (i === slideIdx ? updated : sl)),
      })),
    [slideIdx]
  );
  const updateBlock = (b) =>
    updateSlide({
      ...slide,
      layout: slide.layout.map((x) => (x.blockId === b.blockId ? b : x)),
    });
  const addSlide = () => {
    setStory((s) => ({ ...s, slides: [...s.slides, newSlide()] }));
    setSlideIdx(story.slides.length);
    setSelBlock(null);
  };
  const removeSlide = (i) => {
    if (story.slides.length <= 1) return;
    setStory((s) => ({ ...s, slides: s.slides.filter((_, j) => j !== i) }));
    setSlideIdx((p) => Math.max(0, p >= i ? p - 1 : p));
    setSelBlock(null);
  };
  const duplicateSlide = (i) => {
    const slides = [...story.slides];
    slides.splice(i + 1, 0, {
      ...story.slides[i],
      slideId: "slide_" + uid().substr(0, 5),
      layout: story.slides[i].layout.map((b) => ({ ...b, blockId: uid() })),
    });
    setStory((s) => ({ ...s, slides }));
    setSlideIdx(i + 1);
    setSelBlock(null);
  };
  const copy = () =>
    navigator.clipboard.writeText(JSON.stringify([story], null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: c.bg,
        fontFamily: "Montserrat, sans-serif",
        color: c.text,
        overflow: "hidden",
      }}
    >
      {showImport && (
        <ImportModal
          onImport={(p) => {
            setStory(p);
            setSlideIdx(0);
            setSelBlock(null);
            setShowImport(false);
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      <div
        style={{
          width: 158,
          background: "#050505",
          borderRight: `1px solid ${c.border}`,
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Sidebar content remains mostly same, simplified for brevity */}
        <div
          style={{
            padding: "10px 10px 8px",
            borderBottom: `1px solid ${c.border}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: c.gold,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontFamily: "monospace",
            }}
          >
            Slides · {story.slides.length}
          </div>
          <button
            onClick={() => setShowImport(true)}
            style={{
              background: "none",
              border: `1px solid ${c.border3}`,
              color: c.sectionTitle,
              borderRadius: 3,
              padding: "2px 7px",
              fontSize: 9,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            import
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px" }}>
          {story.slides.map((sl, i) => (
            <div
              key={sl.slideId}
              onClick={() => {
                setSlideIdx(i);
                setSelBlock(null);
              }}
              style={{
                borderRadius: 6,
                border: `1px solid ${slideIdx === i ? c.gold : c.border}`,
                background: slideIdx === i ? c.goldFaint : c.surface,
                marginBottom: 4,
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "4px 7px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{ fontSize: 8, color: c.dim, fontFamily: "monospace" }}
                >
                  {i + 1}. {sl.slideId}
                </span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSlide(i);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: c.dim,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 7, borderTop: `1px solid ${c.border}` }}>
          <button
            onClick={addSlide}
            style={{
              width: "100%",
              background: c.goldFaint,
              border: `1px solid ${c.goldDim}`,
              color: c.gold,
              borderRadius: 4,
              padding: "6px 0",
              fontSize: 10,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            + Add Slide
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div
          style={{
            padding: "9px 14px",
            borderBottom: `1px solid ${c.border}`,
            background: "#050505",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flex: 1,
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: c.label,
                fontFamily: "monospace",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              Story
            </span>
            <input
              value={story.storyId}
              onChange={(e) =>
                setStory((s) => ({ ...s, storyId: e.target.value }))
              }
              style={{
                background: c.s3,
                border: `1px solid ${c.border2}`,
                borderRadius: 3,
                padding: "3px 7px",
                color: c.text,
                fontSize: 11,
                fontFamily: "monospace",
                width: 110,
              }}
            />
            {/* Translated Title! */}
            <TransInp
              value={story.title}
              onChange={(v) => setStory((s) => ({ ...s, title: v }))}
              placeholder="Story title"
            />
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                borderRadius: 4,
                overflow: "hidden",
                border: `1px solid ${c.border2}`,
              }}
            >
              {["edit", "json"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: tab === t ? c.s3 : "none",
                    border: "none",
                    color: tab === t ? c.gold : c.dim,
                    padding: "3px 10px",
                    fontSize: 10,
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              style={{
                background: "none",
                border: `1px solid ${copied ? "#3a8a5a" : c.border2}`,
                color: copied ? "#3a8a5a" : c.text,
                borderRadius: 3,
                padding: "3px 10px",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              {copied ? "✓ copied" : "copy"}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {tab === "json" ? (
            <pre
              style={{
                margin: 0,
                fontFamily: "monospace",
                fontSize: 11,
                color: c.gold,
                background: c.surface,
                padding: 16,
                borderRadius: 8,
                border: `1px solid ${c.border}`,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify([story], null, 2)}
            </pre>
          ) : slide ? (
            <>
              <SlotGrid
                slide={slide}
                selectedId={selBlock}
                onSelect={setSelBlock}
                onUpdate={updateSlide}
                previewLang={previewLang}
              />
              {selectedBlock && (
                <div
                  style={{
                    background: c.s2,
                    border: `1px solid ${c.border2}`,
                    borderRadius: 8,
                    padding: 14,
                    marginTop: 14,
                  }}
                >
                  <BlockEditor block={selectedBlock} onUpdate={updateBlock} />
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      <div
        style={{
          width: 232,
          borderLeft: `1px solid ${c.border}`,
          background: "#050505",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px 12px",
          flexShrink: 0,
        }}
      >
        {/* Live Preview Lang Toggle */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: c.label,
              fontFamily: "monospace",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            Preview
          </span>
          <select
            value={previewLang}
            onChange={(e) => setPreviewLang(e.target.value)}
            style={{
              background: c.s3,
              color: c.gold,
              border: `1px solid ${c.border2}`,
              borderRadius: 4,
              fontSize: 9,
              padding: "2px 4px",
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            <option value="txt">Base (TXT)</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
            <option value="es">Español</option>
          </select>
        </div>
        <div
          style={{
            width: 186,
            height: 330,
            borderRadius: 20,
            border: `2px solid #222`,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {slide && <SlidePreview slide={slide} previewLang={previewLang} />}
        </div>
      </div>
    </div>
  );
}
