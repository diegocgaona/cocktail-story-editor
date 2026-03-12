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
  "Playfair Display",
  "Cinzel",
  "Montserrat",
  "Lato",
  "Georgia",
  "Courier Prime",
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
  "hue",
  "saturation",
  "color",
  "luminosity",
];

// ─── Colors — improved contrast ───────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
              fontFamily: "Playfair Display",
              fontSize: 30,
              letterSpacing: 1.2,
              horizontalAlignment: "center",
              opacity: 1,
              blendMode: "normal",
              spans: [
                {
                  text: "New Slide",
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
        ? { spans: tb.spans.map((sp) => ({ opacity: 1, ...sp })) }
        : {}),
      ...(tb.items && !Array.isArray(tb.items[0])
        ? {
            items: tb.items.map((item) =>
              typeof item === "string" ? { text: item, link: null } : item
            ),
          }
        : {}),
    }));
  return c2;
}
function migrateSlide(sl) {
  return { ...sl, layout: (sl.layout || []).map(migrateBlock) };
}

const newSpan = () => ({
  text: "New span",
  isBold: false,
  isItalic: false,
  link: null,
  opacity: 1,
});
const newTextBlock = () => ({
  type: "paragraph",
  fontFamily: "Montserrat",
  fontSize: 16,
  letterSpacing: 0.5,
  horizontalAlignment: "center",
  opacity: 1,
  blendMode: "normal",
  spans: [newSpan()],
});

const INITIAL = {
  storyId: "martini-story",
  title: "The Art of the Martini",
  slides: [
    {
      slideId: "slide_01",
      backgroundColor: "#060810",
      durationMs: 9000,
      layout: [
        {
          blockId: "a1",
          startSlot: 1,
          endSlot: 2,
          verticalAlignment: "center",
          zIndex: 0,
          offset: { x: 0, y: 0 },
          content: {
            type: "media",
            mediaType: "image",
            url: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800",
            contentScale: "crop_fullscreen",
            opacity: 1,
            blendMode: "normal",
          },
        },
        {
          blockId: "a2",
          startSlot: 3,
          endSlot: 3,
          verticalAlignment: "end",
          zIndex: 1,
          offset: { x: 0, y: 0 },
          content: {
            type: "text",
            opacity: 1,
            blendMode: "normal",
            textBlocks: [
              {
                type: "heading",
                fontFamily: "Cinzel",
                fontSize: 26,
                letterSpacing: 3,
                horizontalAlignment: "center",
                opacity: 1,
                blendMode: "normal",
                spans: [
                  {
                    text: "Stirred. ",
                    isBold: true,
                    isItalic: false,
                    link: null,
                    opacity: 1,
                  },
                  {
                    text: "Not shaken.",
                    isBold: false,
                    isItalic: true,
                    link: null,
                    opacity: 0.75,
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      slideId: "slide_02",
      backgroundColor: "#06040a",
      durationMs: 10000,
      layout: [
        {
          blockId: "c1",
          startSlot: 1,
          endSlot: 3,
          verticalAlignment: "center",
          zIndex: 0,
          offset: { x: 0, y: 0 },
          content: {
            type: "mixed",
            mediaType: "image",
            url: "https://images.unsplash.com/photo-1470338745628-171cf53de3a8?w=800",
            contentScale: "crop_fullscreen",
            opacity: 1,
            blendMode: "normal",
            overlayOpacity: 0.45,
            textBlocks: [
              {
                type: "heading",
                fontFamily: "Cinzel",
                fontSize: 34,
                letterSpacing: 4,
                horizontalAlignment: "center",
                opacity: 1,
                blendMode: "screen",
                spans: [
                  {
                    text: "Botanical Essence",
                    isBold: true,
                    isItalic: false,
                    link: null,
                    opacity: 1,
                  },
                ],
              },
              {
                type: "paragraph",
                fontFamily: "Montserrat",
                fontSize: 14,
                letterSpacing: 1,
                horizontalAlignment: "center",
                opacity: 0.85,
                blendMode: "normal",
                spans: [
                  {
                    text: "The gin is your canvas.",
                    isBold: false,
                    isItalic: true,
                    link: null,
                    opacity: 1,
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      slideId: "slide_03",
      backgroundColor: "#0a0806",
      durationMs: 8000,
      layout: [
        {
          blockId: "b1",
          startSlot: 1,
          endSlot: 1,
          verticalAlignment: "center",
          zIndex: 0,
          offset: { x: 0, y: 0 },
          content: { type: "spacer" },
        },
        {
          blockId: "b2",
          startSlot: 2,
          endSlot: 2,
          verticalAlignment: "center",
          zIndex: 0,
          offset: { x: 0, y: 0 },
          content: {
            type: "text",
            opacity: 1,
            blendMode: "normal",
            textBlocks: [
              {
                type: "heading",
                fontFamily: "Playfair Display",
                fontSize: 32,
                letterSpacing: 1.5,
                horizontalAlignment: "center",
                opacity: 1,
                blendMode: "normal",
                spans: [
                  {
                    text: "A Timeless Classic",
                    isBold: true,
                    isItalic: false,
                    link: null,
                    opacity: 1,
                  },
                ],
              },
            ],
          },
        },
        {
          blockId: "b3",
          startSlot: 3,
          endSlot: 3,
          verticalAlignment: "end",
          zIndex: 0,
          offset: { x: 0, y: 0 },
          content: {
            type: "text",
            opacity: 1,
            blendMode: "normal",
            textBlocks: [
              {
                type: "bullet_list",
                fontFamily: "Montserrat",
                fontSize: 14,
                letterSpacing: 0.3,
                horizontalAlignment: "left",
                opacity: 1,
                blendMode: "normal",
                items: [
                  { text: "Gin or Vodka", link: "https://example.com/gin" },
                  { text: "Dry Vermouth", link: null },
                  { text: "Olive or Lemon Twist", link: null },
                ],
              },
            ],
          },
        },
      ],
    },
  ],
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
        onClick={() => onChange(!value)}
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

function SlotGrid({ slide, selectedId, onSelect, onUpdate }) {
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
  const canGrowDown = (b) =>
    b.endSlot < 3 && !getOccupied(layout).has(b.endSlot + 1);
  const canShrink = (b) => b.endSlot > b.startSlot;

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
            const spanLabel =
              block.startSlot === block.endSlot
                ? `slot ${block.startSlot}`
                : `slots ${block.startSlot}–${block.endSlot}`;
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
                  transition: "border-color .15s",
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
                  <span
                    style={{
                      fontSize: 8,
                      color: c.dim,
                      fontFamily: "monospace",
                    }}
                  >
                    {spanLabel}
                  </span>
                  {(block.offset?.x !== 0 || block.offset?.y !== 0) && (
                    <span
                      style={{
                        fontSize: 8,
                        color: c.gold,
                        fontFamily: "monospace",
                      }}
                    >
                      ↔
                    </span>
                  )}
                  {block.zIndex !== 0 && (
                    <span
                      style={{
                        fontSize: 8,
                        color: c.gold,
                        fontFamily: "monospace",
                      }}
                    >
                      z{block.zIndex}
                    </span>
                  )}
                  {block.content.blendMode &&
                    block.content.blendMode !== "normal" && (
                      <span
                        style={{
                          fontSize: 8,
                          color: c.mixedC,
                          fontFamily: "monospace",
                        }}
                      >
                        ⊗
                      </span>
                    )}
                  <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
                    {canShrink(block) && (
                      <IconBtn
                        onClick={(e) => {
                          e.stopPropagation();
                          updBlock({ ...block, endSlot: block.endSlot - 1 });
                        }}
                        title="Shrink"
                      >
                        −
                      </IconBtn>
                    )}
                    {canGrowDown(block) && (
                      <IconBtn
                        onClick={(e) => {
                          e.stopPropagation();
                          updBlock({ ...block, endSlot: block.endSlot + 1 });
                        }}
                        title="Expand"
                      >
                        +
                      </IconBtn>
                    )}
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
                    position: "absolute",
                    bottom: 4,
                    left: 7,
                    display: "flex",
                    gap: 3,
                    zIndex: 2,
                  }}
                >
                  {V_ALIGNMENTS.map((va) => (
                    <button
                      key={va}
                      onClick={(e) => {
                        e.stopPropagation();
                        updBlock({ ...block, verticalAlignment: va });
                      }}
                      style={{
                        background:
                          block.verticalAlignment === va
                            ? ac
                            : "rgba(0,0,0,.5)",
                        border: `1px solid ${
                          block.verticalAlignment === va ? ac : c.border3
                        }`,
                        color: block.verticalAlignment === va ? "#000" : c.dim,
                        borderRadius: 3,
                        padding: "1px 5px",
                        fontSize: 8,
                        cursor: "pointer",
                        fontFamily: "monospace",
                      }}
                    >
                      {va === "start" ? "↑" : va === "end" ? "↓" : "·"}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    padding: "26px 8px 22px",
                    overflow: "hidden",
                    flex: 1,
                  }}
                >
                  <GridBlockPreview block={block} />
                </div>
              </div>
            );
          })}
        {freeRanges.map((r) => {
          const top = (r.startSlot - 1) * SLOT_H,
            height = (r.endSlot - r.startSlot + 1) * SLOT_H;
          return (
            <div
              key={`f${r.startSlot}`}
              style={{
                position: "absolute",
                top: top + 2,
                left: 2,
                right: 2,
                height: height - 4,
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
                + block{" "}
                {r.startSlot !== r.endSlot
                  ? `(${r.startSlot}–${r.endSlot})`
                  : `(${r.startSlot})`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridBlockPreview({ block }) {
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
  if (content.type === "media")
    return (
      <div
        style={{
          color: c.mediaC,
          fontSize: 10,
          fontFamily: "monospace",
          opacity: 0.8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {content.mediaType === "video" ? "▶ " : "⬛ "}
        {(content.url || "—").split("/").pop()?.substr(0, 26)}
      </div>
    );
  if (content.type === "mixed")
    return (
      <div
        style={{
          color: c.mixedC,
          fontSize: 10,
          fontFamily: "monospace",
          opacity: 0.8,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        ⊞ {content.mediaType === "video" ? "video" : "img"} +{" "}
        {(content.textBlocks || []).length} text
      </div>
    );
  if (content.type === "text") {
    const p =
      content.textBlocks?.[0]?.spans?.[0]?.text ||
      content.textBlocks?.[0]?.items?.[0]?.text ||
      "";
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
  const offset = block.offset || { x: 0, y: 0 };

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

      <Divider label="Position & Layer" />
      <Row cols={3}>
        <Field label="Offset X">
          <Inp
            value={offset.x}
            onChange={(v) => set({ offset: { ...offset, x: v } })}
            type="number"
            step={1}
          />
        </Field>
        <Field label="Offset Y">
          <Inp
            value={offset.y}
            onChange={(v) => set({ offset: { ...offset, y: v } })}
            type="number"
            step={1}
          />
        </Field>
        <Field label="Z-Index">
          <Inp
            value={block.zIndex || 0}
            onChange={(v) => set({ zIndex: v })}
            type="number"
            step={1}
          />
        </Field>
      </Row>
      {(offset.x !== 0 || offset.y !== 0) && (
        <div
          style={{
            fontSize: 9,
            color: "#d4a84a",
            fontFamily: "monospace",
            marginBottom: 8,
            padding: "4px 8px",
            background: c.goldFaint,
            borderRadius: 4,
            border: `1px solid ${c.goldDim}`,
          }}
        >
          ⚠ Offset active — block may overlap others
        </div>
      )}

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
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: c.mixedC,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: c.mixedC,
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Background Media
        </span>
      </div>
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
      <div
        style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: c.textC,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: c.textC,
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Text Blocks
        </span>
      </div>
      <TextEditor
        content={{
          textBlocks: content.textBlocks || [],
          opacity: 1,
          blendMode: "normal",
        }}
        onChange={(tc) => onChange({ ...content, textBlocks: tc.textBlocks })}
        hideBlockOpacity={false}
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
      <Divider label="Block Appearance" />
      <OpacityBlendRow
        opacity={content.opacity ?? 1}
        blendMode={content.blendMode || "normal"}
        onChange={({ opacity, blendMode }) =>
          onChange({ ...content, opacity, blendMode })
        }
      />
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
          {block.opacity !== undefined && block.opacity < 1 && (
            <span
              style={{ fontSize: 9, color: c.gold, fontFamily: "monospace" }}
            >
              {Math.round((block.opacity ?? 1) * 100)}%
            </span>
          )}
          {block.blendMode && block.blendMode !== "normal" && (
            <span
              style={{ fontSize: 9, color: c.mixedC, fontFamily: "monospace" }}
            >
              {block.blendMode}
            </span>
          )}
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
          <Divider label="Block Appearance" />
          <OpacityBlendRow
            opacity={block.opacity ?? 1}
            blendMode={block.blendMode || "normal"}
            onChange={({ opacity, blendMode }) =>
              onChange({ ...block, opacity, blendMode })
            }
          />

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
                        { text: "New item", link: null },
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
              {(block.items || []).map((item, i) => {
                const text = typeof item === "string" ? item : item.text;
                const link = typeof item === "string" ? null : item.link;
                return (
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
                      <input
                        value={text}
                        onChange={(e) => {
                          const it = [...block.items];
                          it[i] = { text: e.target.value, link };
                          onChange({ ...block, items: it });
                        }}
                        placeholder="Item text..."
                        style={{
                          flex: 1,
                          background: c.s3,
                          border: `1px solid ${c.border2}`,
                          borderRadius: 4,
                          padding: "4px 8px",
                          color: c.text,
                          fontSize: 12,
                          fontFamily: "monospace",
                        }}
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
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          color: c.gold,
                          fontFamily: "monospace",
                          flexShrink: 0,
                        }}
                      >
                        🔗
                      </span>
                      <input
                        value={link || ""}
                        onChange={(e) => {
                          const it = [...block.items];
                          it[i] = { text, link: e.target.value || null };
                          onChange({ ...block, items: it });
                        }}
                        placeholder="Link URL (optional)"
                        style={{
                          flex: 1,
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
              })}
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
        <input
          value={span.text}
          onChange={(e) => onChange({ ...span, text: e.target.value })}
          style={{
            flex: 1,
            background: c.s3,
            border: `1px solid ${c.border2}`,
            borderRadius: 4,
            padding: "4px 8px",
            color: c.text,
            fontSize: 12,
            fontFamily: "monospace",
          }}
          placeholder="text..."
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
          placeholder="link url"
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
      {/* Span opacity */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span
          style={{
            fontSize: 9,
            color: c.label,
            fontFamily: "monospace",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          Opacity
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={span.opacity ?? 1}
          onChange={(e) =>
            onChange({ ...span, opacity: parseFloat(e.target.value) })
          }
          style={{ flex: 1, accentColor: c.gold, height: 12 }}
        />
        <span
          style={{
            fontSize: 10,
            color: c.dim,
            fontFamily: "monospace",
            width: 28,
            textAlign: "right",
          }}
        >
          {Math.round((span.opacity ?? 1) * 100)}%
        </span>
      </div>
    </div>
  );
}

// ─── Preview ──────────────────────────────────────────────────────────────────
function SlidePreview({ slide }) {
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
      {sorted.map((block) => {
        const ox = block.offset?.x || 0,
          oy = block.offset?.y || 0;
        return (
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
              transform:
                ox || oy ? `translate(${ox * 0.5}px, ${oy * 0.5}px)` : "none",
              zIndex: block.zIndex || 0,
            }}
          >
            <PreviewContent block={block} />
          </div>
        );
      })}
    </div>
  );
}

function PreviewContent({ block }) {
  const { content } = block;
  if (content.type === "spacer") return null;

  const blockOpacity = content.opacity ?? 1;
  const blockBlend = content.blendMode || "normal";

  if (content.type === "media") {
    if (!content.url)
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: c.mediaB,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: blockOpacity,
            mixBlendMode: blockBlend,
          }}
        >
          <span style={{ color: c.mediaC, fontSize: 18 }}>⬛</span>
        </div>
      );
    if (content.mediaType === "video")
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#060a10",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: blockOpacity,
            mixBlendMode: blockBlend,
          }}
        >
          <span style={{ fontSize: 22 }}>▶</span>
        </div>
      );
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
        {content.mediaType === "video" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#040608",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: blockOpacity,
              mixBlendMode: blockBlend,
            }}
          >
            <span style={{ fontSize: 20 }}>▶</span>
          </div>
        ) : content.url ? (
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
        ) : (
          <div
            style={{ position: "absolute", inset: 0, background: c.mixedB }}
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
            <PreviewTextBlock key={i} tb={tb} />
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
          <PreviewTextBlock key={i} tb={tb} />
        ))}
      </div>
    );
  }
  return null;
}

function PreviewTextBlock({ tb }) {
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
          const text = typeof item === "string" ? item : item.text;
          const link = typeof item === "string" ? null : item.link;
          return (
            <li
              key={j}
              style={{
                color: link ? "#d4aa50" : "#fff",
                textDecoration: link ? "underline" : "none",
                cursor: link ? "pointer" : "default",
              }}
            >
              {text}
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
      {(tb.spans || []).map((span, j) => (
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
          {span.text}
        </span>
      ))}
    </p>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportModal({ onImport, onClose }) {
  const [val, setVal] = useState(""),
    [err, setErr] = useState(null);
  const fileRef = useRef();
  const tryParse = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed.slides || !Array.isArray(parsed.slides))
        throw new Error("Missing 'slides' array");
      onImport({ ...parsed, slides: parsed.slides.map(migrateSlide) });
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
            Import JSON Template
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
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => fileRef.current.click()}
              style={{
                background: c.surface,
                border: `1px solid ${c.border2}`,
                color: c.sectionTitle,
                borderRadius: 4,
                padding: "6px 14px",
                fontSize: 11,
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              📂 Load file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files[0];
                if (!f) return;
                new FileReader().onload = (ev) => {
                  setVal(ev.target.result);
                  setErr(null);
                };
                new FileReader().readAsText(f);
                const r = new FileReader();
                r.onload = (ev) => {
                  setVal(ev.target.result);
                  setErr(null);
                };
                r.readAsText(f);
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: c.dim,
                fontFamily: "monospace",
                display: "flex",
                alignItems: "center",
              }}
            >
              or paste JSON below
            </span>
          </div>
          <textarea
            value={val}
            onChange={(e) => {
              setVal(e.target.value);
              setErr(null);
            }}
            placeholder={'{\n  "storyId": "my-story",\n  "slides": [...]\n}'}
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
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${c.border2}`,
              color: c.dim,
              borderRadius: 4,
              padding: "6px 16px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            Cancel
          </button>
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
  const [story, setStory] = useState(INITIAL);
  const [slideIdx, setSlideIdx] = useState(0);
  const [selBlock, setSelBlock] = useState(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("edit");
  const [showImport, setShowImport] = useState(false);

  const slide = story.slides[slideIdx];
  const selectedBlock =
    slide?.layout.find((b) => b.blockId === selBlock) || null;

  const updateSlide = useCallback(
    (updated) => {
      setStory((s) => ({
        ...s,
        slides: s.slides.map((sl, i) => (i === slideIdx ? updated : sl)),
      }));
    },
    [slideIdx]
  );

  const updateBlock = (b) =>
    updateSlide({
      ...slide,
      layout: slide.layout.map((x) => (x.blockId === b.blockId ? b : x)),
    });
  const addSlide = () => {
    const ns = newSlide();
    setStory((s) => ({ ...s, slides: [...s.slides, ns] }));
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
    const dup = {
      ...story.slides[i],
      slideId: "slide_" + uid().substr(0, 5),
      layout: story.slides[i].layout.map((b) => ({ ...b, blockId: uid() })),
    };
    const slides = [...story.slides];
    slides.splice(i + 1, 0, dup);
    setStory((s) => ({ ...s, slides }));
    setSlideIdx(i + 1);
    setSelBlock(null);
  };
  const selectSlide = (i) => {
    setSlideIdx(i);
    setSelBlock(null);
  };
  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(story, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const download = () => {
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(
        new Blob([JSON.stringify(story, null, 2)], { type: "application/json" })
      ),
      download: `${story.storyId}.json`,
    });
    a.click();
  };

  const BtnSm = ({ onClick, children, active, accent, title }) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? accent || c.s3 : "none",
        border: `1px solid ${active ? accent || c.border3 : c.border2}`,
        color: active ? (accent ? "#000" : c.text) : c.dim,
        borderRadius: 3,
        padding: "3px 10px",
        fontSize: 10,
        cursor: "pointer",
        fontFamily: "monospace",
        transition: "all .15s",
      }}
    >
      {children}
    </button>
  );

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
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Playfair+Display:ital,wght@0,700;1,400&family=Cinzel:wght@400;700&family=Courier+Prime&display=swap"
        rel="stylesheet"
      />
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

      {/* Slide List */}
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
              onClick={() => selectSlide(i)}
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
                  height: 68,
                  background: sl.backgroundColor || "#000",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {sl.layout.map((b) =>
                  (b.content.type === "media" || b.content.type === "mixed") &&
                  b.content.url &&
                  b.content.mediaType !== "video" ? (
                    <img
                      key={b.blockId}
                      src={b.content.url}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        opacity: 0.6,
                      }}
                      onError={() => {}}
                    />
                  ) : null
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(transparent 40%, rgba(0,0,0,.7))",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    right: 4,
                    top: 4,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {[1, 2, 3].map((s) => {
                    const blk = sl.layout.find(
                      (b) => b.startSlot <= s && b.endSlot >= s
                    );
                    return (
                      <div
                        key={s}
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 1,
                          background: blk
                            ? typeColor(blk.content.type)
                            : c.border2,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              <div
                style={{
                  padding: "4px 7px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: c.dim,
                    fontFamily: "monospace",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {i + 1}. {sl.slideId}
                </span>
                <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSlide(i);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: c.dim,
                      cursor: "pointer",
                      fontSize: 11,
                    }}
                    title="Duplicate"
                  >
                    ⧉
                  </button>
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

      {/* Center */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "9px 14px",
            borderBottom: `1px solid ${c.border}`,
            background: "#050505",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
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
            <input
              value={story.title}
              onChange={(e) =>
                setStory((s) => ({ ...s, title: e.target.value }))
              }
              style={{
                background: c.s3,
                border: `1px solid ${c.border2}`,
                borderRadius: 3,
                padding: "3px 7px",
                color: c.text,
                fontSize: 11,
                fontFamily: "monospace",
                flex: 1,
                minWidth: 0,
                maxWidth: 200,
              }}
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
            {slide && (
              <>
                <span
                  style={{
                    fontSize: 9,
                    color: c.label,
                    fontFamily: "monospace",
                  }}
                >
                  BG
                </span>
                <input
                  type="color"
                  value={slide.backgroundColor || "#000000"}
                  onChange={(e) =>
                    updateSlide({ ...slide, backgroundColor: e.target.value })
                  }
                  style={{
                    width: 28,
                    height: 22,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    borderRadius: 3,
                  }}
                />
                <input
                  type="number"
                  value={slide.durationMs}
                  onChange={(e) =>
                    updateSlide({
                      ...slide,
                      durationMs: parseFloat(e.target.value) || 0,
                    })
                  }
                  style={{
                    background: c.s3,
                    border: `1px solid ${c.border2}`,
                    borderRadius: 3,
                    padding: "2px 6px",
                    color: c.text,
                    fontSize: 11,
                    fontFamily: "monospace",
                    width: 65,
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    color: c.label,
                    fontFamily: "monospace",
                  }}
                >
                  ms
                </span>
              </>
            )}
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
            <BtnSm
              onClick={copy}
              active={copied}
              accent={copied ? "#3a8a5a" : undefined}
            >
              {copied ? "✓ copied" : "copy"}
            </BtnSm>
            <button
              onClick={download}
              style={{
                background: c.gold,
                border: "none",
                color: "#000",
                borderRadius: 3,
                padding: "4px 12px",
                fontSize: 10,
                cursor: "pointer",
                fontFamily: "monospace",
                fontWeight: "bold",
              }}
            >
              ↓ save
            </button>
          </div>
        </div>

        {/* Body */}
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
              {JSON.stringify(story, null, 2)}
            </pre>
          ) : slide ? (
            <>
              <div
                style={{
                  fontSize: 9,
                  color: c.sectionTitle,
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 8,
                }}
              >
                Layout Grid — click to select · ± resize · ↑↓ v-align
              </div>
              <SlotGrid
                slide={slide}
                selectedId={selBlock}
                onSelect={setSelBlock}
                onUpdate={updateSlide}
              />
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  marginTop: 8,
                  marginBottom: 14,
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["media", c.mediaC],
                  ["text", c.textC],
                  ["mixed", c.mixedC],
                  ["spacer", c.spacerC],
                ].map(([type, clr]) => (
                  <div
                    key={type}
                    style={{ display: "flex", gap: 4, alignItems: "center" }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 2,
                        background: clr,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        color: c.sectionTitle,
                        fontFamily: "monospace",
                      }}
                    >
                      {type}
                    </span>
                  </div>
                ))}
                <span
                  style={{
                    fontSize: 9,
                    color: c.dim,
                    fontFamily: "monospace",
                    marginLeft: "auto",
                  }}
                >
                  ⊗ = blend mode active · ↔ = offset active
                </span>
              </div>
              {selectedBlock ? (
                <div
                  style={{
                    background: c.s2,
                    border: `1px solid ${c.border2}`,
                    borderRadius: 8,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: typeColor(selectedBlock.content.type),
                      }}
                    />
                    <span
                      style={{
                        fontSize: 10,
                        color: c.sectionTitle,
                        fontFamily: "monospace",
                        textTransform: "uppercase",
                      }}
                    >
                      Editing — slots {selectedBlock.startSlot}
                      {selectedBlock.endSlot !== selectedBlock.startSlot
                        ? `–${selectedBlock.endSlot}`
                        : ""}
                    </span>
                  </div>
                  <BlockEditor block={selectedBlock} onUpdate={updateBlock} />
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: c.dim,
                    fontSize: 11,
                    fontFamily: "monospace",
                    padding: 24,
                    border: `1px dashed ${c.border}`,
                    borderRadius: 8,
                  }}
                >
                  ↑ click a block in the layout grid to edit it
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Preview */}
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
        <div
          style={{
            fontSize: 9,
            color: c.label,
            fontFamily: "monospace",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            marginBottom: 14,
          }}
        >
          Live Preview
        </div>
        <div
          style={{
            width: 186,
            height: 330,
            borderRadius: 20,
            border: `2px solid #222`,
            overflow: "hidden",
            boxShadow: `0 0 0 1px #111, 0 24px 60px rgba(0,0,0,.95), 0 0 50px rgba(201,168,76,.04)`,
            position: "relative",
          }}
        >
          {slide && <SlidePreview slide={slide} />}
        </div>
        <div
          style={{
            display: "flex",
            gap: 5,
            marginTop: 12,
            alignItems: "center",
          }}
        >
          {story.slides.map((_, i) => (
            <div
              key={i}
              onClick={() => selectSlide(i)}
              style={{
                width: i === slideIdx ? 14 : 5,
                height: 5,
                borderRadius: 3,
                background: i === slideIdx ? c.gold : c.border2,
                cursor: "pointer",
                transition: "width .2s, background .2s",
              }}
            />
          ))}
        </div>
        {slide && (
          <div style={{ marginTop: 12, width: "100%" }}>
            <div
              style={{
                fontSize: 9,
                color: c.label,
                fontFamily: "monospace",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {(slide.durationMs / 1000).toFixed(1)}s · {slide.layout.length}{" "}
              block{slide.layout.length !== 1 ? "s" : ""}
            </div>
            <div
              style={{
                background: c.surface,
                border: `1px solid ${c.border}`,
                borderRadius: 6,
                overflow: "hidden",
              }}
            >
              {[1, 2, 3].map((s) => {
                const blk = slide.layout.find(
                  (b) => b.startSlot <= s && b.endSlot >= s
                );
                return (
                  <div
                    key={s}
                    onClick={() => blk && setSelBlock(blk.blockId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 8px",
                      borderBottom: s < 3 ? `1px solid ${c.border}` : "none",
                      cursor: blk ? "pointer" : "default",
                      background:
                        blk?.blockId === selBlock ? c.goldFaint : "transparent",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        color: c.label,
                        fontFamily: "monospace",
                        width: 36,
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      {SLOT_LABELS[s - 1]}
                    </span>
                    {blk ? (
                      <>
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: typeColor(blk.content.type),
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 9,
                            color: typeColor(blk.content.type),
                            fontFamily: "monospace",
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {blk.content.type}
                        </span>
                        {blk.startSlot !== s && (
                          <span
                            style={{
                              fontSize: 8,
                              color: c.muted,
                              fontFamily: "monospace",
                              flexShrink: 0,
                            }}
                          >
                            ↑
                          </span>
                        )}
                        {(blk.offset?.x !== 0 || blk.offset?.y !== 0) && (
                          <span
                            style={{
                              fontSize: 8,
                              color: c.gold,
                              fontFamily: "monospace",
                            }}
                          >
                            ↔
                          </span>
                        )}
                        {blk.zIndex !== 0 && (
                          <span
                            style={{
                              fontSize: 8,
                              color: c.gold,
                              fontFamily: "monospace",
                            }}
                          >
                            z{blk.zIndex}
                          </span>
                        )}
                        {blk.content.blendMode &&
                          blk.content.blendMode !== "normal" && (
                            <span
                              style={{
                                fontSize: 8,
                                color: c.mixedC,
                                fontFamily: "monospace",
                              }}
                            >
                              ⊗
                            </span>
                          )}
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: 9,
                          color: c.muted,
                          fontFamily: "monospace",
                        }}
                      >
                        —
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
