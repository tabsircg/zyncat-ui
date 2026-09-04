# @zyncat/ui component index

Generated from @zyncat/ui v0.15.0 by `pnpm sync skill` - do not edit by hand.
If node_modules/@zyncat/ui/package.json shows a DIFFERENT version, this index is stale:
trust the get_component MCP tool and re-run `npx zyncat-ui init` to refresh the skill.

This is an index, not the API - prop lists here are incomplete by design.
Call get_component (it accepts a list) before writing any JSX.

== Primitives ==
Button - @zyncat/ui/button - One control for every click; exactly one primary per view.
Collapse - @zyncat/ui/collapse - Layout-transition primitive; eases height open/closed, never teleports.
Badge - @zyncat/ui/badge - Glass or outline chip for ambient status - toned, dotted, live or pill.
StatusBadge - @zyncat/ui/status-badge - Canonical post status - tone + one-word label.
CountBadge - @zyncat/ui/count-badge - Mono tabular count; `roll` animates digits like an odometer.
Glide / GlidePill - @zyncat/ui/glide - A persistent background pill that glides smoothly between hovered/active elements.

== Forms ==
Every form field takes label, helper/error/warning/success, size sm|md|lg, disabled.
TextField - @zyncat/ui/text-field - Base text input; states disclose via Collapse.
NumberField - @zyncat/ui/number-field - Tabular figures, caret steppers, unit suffix, clamp to [min,max].
OtpField - @zyncat/ui/otp-field - Segmented one-time code; auto-advance, paste-to-fill.
Textarea - @zyncat/ui/textarea - Auto-grow, char meter (max), ⌘/Ctrl+↵ submit (onSubmit).
Checkbox - @zyncat/ui/checkbox - Stages a choice the form commits later - pick Toggle when the effect is immediate.
Toggle - @zyncat/ui/toggle - Actuates a setting on the spot - pick Checkbox when the form commits the choice later.
RadioGroup - @zyncat/ui/radio-group - Pick exactly one from options that stay visible - rows or cards; pick Select for long lists.
Select - @zyncat/ui/select - Single-select listbox in a popover, searchable; holds value: string | null.
MultiSelect - @zyncat/ui/multi-select - Many-of listbox; stays open while toggling, trigger summarises as first +N.

== Data display ==
Avatar - @zyncat/ui/avatar - Identity mark: image, initials, or silhouette.
AvatarGroup - @zyncat/ui/avatar-group - Overlapping avatars with +N overflow.
Tag / TagGroup - @zyncat/ui/tag - User-owned label (a control, not a status).
ToggleTag - @zyncat/ui/toggle-tag - Many-of-many filter chip.
Table - @zyncat/ui/table - Declare columns + rows; owns sort, selection, stickiness, overflow.
Pagination - @zyncat/ui/pagination - Cursor strip: mono range readout + prev/next pair.

== Date, time & tabs ==
The date and time fields share: value is a string, onChange(value | null), timezone, min/max, disabled.
DateField - @zyncat/ui/date-field - Month calendar in a popover; value 'YYYY-MM-DD'.
DateTimeField - @zyncat/ui/datetime-field - Calendar + segmented HH:MM; value 'YYYY-MM-DDTHH:mm'.
DateRangeField - @zyncat/ui/date-range-field - Two-tap auto-ordering window; value DateRange { start, end } | null; commits when both ends exist.
TimeField - @zyncat/ui/time-field - Standalone segmented time; value 'HH:mm'; bounds saturate.
Tabs / TabPanel - @zyncat/ui/tabs - Underline tabs or a segmented pill; the ink reaches then releases; panels enter from the side you moved toward.

== Overlays & feedback ==
Dropdown - @zyncat/ui/dropdown - Menu button - a list of ACTIONS the trigger commits, with submenus.
Popover - @zyncat/ui/popover - Headless anchored panel, non-modal.
Sheet - @zyncat/ui/sheet - Edge-docked modal panel, drag-to-dismiss.
Dialog - @zyncat/ui/dialog - DEFAULT CHOICE for modals - the styled surface: header (icon/title/description/close), scrolling body, footer actions, on top of scrim + focus trap + scroll lock.
Modal - @zyncat/ui/modal - The SAME modality as Dialog (scrim, focus trap, scroll lock, inert, Esc, motion) with ZERO paint - no header, no body padding, no width cap, no border/radius/shadow.
Tooltip - @zyncat/ui/tooltip - Transient hint on hover/focus; wraps any child (no ref wiring needed).
Alert - @zyncat/ui/alert - Persistent, in-flow status.
Toast - @zyncat/ui/toast - Imperative transient notifications: mount <Toaster /> once at the app root, then call toast() from anywhere.
toast-store - @zyncat/ui/toast-store - The headless store behind Toast: subscribe to the toast queue and drive it without rendering <Toaster />.
EmojiPickerPanel - @zyncat/ui/emoji-picker - Searchable emoji panel - grid, scrollspy category rail, recents in localStorage - living in a Popover, becoming a bottom Sheet on narrow viewports.

== Expressive ==
Creative motion components. Each publishes scoped --<component>-* custom properties as its theming surface.
Odometer - @zyncat/ui/odometer - Rolling number display for display-size figures - each digit column springs on its own.
TypingLines - @zyncat/ui/typing-lines - A single line that types itself, holds, deletes, then moves to the next one and repeats.
Lens - @zyncat/ui/lens - An optical loupe that magnifies whatever you wrap.
Confetti - @zyncat/ui/confetti - A canvas particle burst you fire yourself: paper flakes, curls, ribbons and foil sequins tumbling on real drag, lift and flip, across three depth layers.
FlowField - @zyncat/ui/flow-field - A canvas field of needles that breathe on a noise loop, then swing away from the pointer with per-cell lag - a decorative backdrop for a hero or a card.
MorphingText - @zyncat/ui/morphing-text - A headline that cycles a word list, morphing each word into the next.
WeightField - @zyncat/ui/weight-field - A display headline where hovering one letter ramps its variable-font wght to the peak and its two neighbours either side part-way, so weight spills outward from the cursor.

== Compound ==
Whole assembled patterns on the expressive contract - scoped --support-rail-* properties, no tone/corner/density enums. Actions are a SupportAction[]: id, label, icon, meta, description, onSelect.
SupportRail - @zyncat/ui/support-rail - An edge tab that grows a support panel out of its own measured box.

== Replicas ==
Each reproduces an external platform surface; fidelity is the contract. Platform metrics are pinned constants - only --font-body, --focus-ring and the duration tokens are read, so your theme cannot move them. None ever fetches media or autoplays: media and avatar take a URL string or your own node, with CSS-only placeholders.
FacebookFeed - @zyncat/ui/facebook-feed - Replica of Facebook's three post surfaces, pinned to the platform's real metrics: the feed card, the reels stage and the story stage.
InstagramFeed - @zyncat/ui/instagram-feed - A replica of one Instagram feed post, pixel-pinned to the platform and immune to your theme.
TikTok - @zyncat/ui/tiktok - A replica of TikTok's post surface: pick surface="desktop" for the 1584x912 web player with the photo carousel, or surface="mobile" for the 452x822 mobile-web viewport.
YouTube - @zyncat/ui/youtube - Replica of three YouTube surfaces, picked with surface: a feed grid card (video), a Shorts player with its action rail (short), or a community post (post).

== Dev tools ==
motion-tokens - @zyncat/ui/motion-tokens - TypeScript readers for the motion token vocabulary - duration/ease/distance/scale token names resolved to the live CSS values.
MotionDevtools - @zyncat/ui/motion-devtools - Dev-only floating panel that slows or freezes EVERY animation at once (CSS and WAAPI) for motion debugging.
Theme - @zyncat/ui/theme - Typed theming - defineTheme is the shape of a theme, not a list of every token; ZyncatTheme renders the set as unlayered CSS with no build step.

== Types-only modules (documented by their .d.ts alone) ==
@zyncat/ui/next - get_component("next")
