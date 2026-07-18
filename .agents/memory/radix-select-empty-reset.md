---
name: Radix Select empty onValueChange after form.reset
description: Radix Select can fire onValueChange("") right after react-hook-form form.reset(), wiping the freshly-set value; guard handlers to ignore empty string.
---
Rule: In controlled Radix/shadcn `<Select>` fields bound to react-hook-form, wrap `onValueChange` with `if (v) field.onChange(v)`.

**Why:** After `form.reset()` populated the category on the draft editor, Radix emitted `onValueChange("")`, clearing the value in form state. Any UI gated on that field (e.g. `form.watch("category") === "case-study"` showing the Case Study panel) silently disappeared, while the underlying data was fine. Radix forbids `SelectItem value=""`, so an empty string is never a legitimate selection and is always safe to ignore.

**How to apply:** Whenever a Radix Select's value is set programmatically (reset, setValue after fetch), add the empty-string guard. Debug tip: log both the reset value and onValueChange sequence — the signature is "reset with X" immediately followed by onValueChange("").
