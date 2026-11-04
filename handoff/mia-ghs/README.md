# Mia GHS integration handoff

## Package contents

- mia-ghs.html: body fragment to insert into the host content slot. No html/head/body, site header, main landmark, or footer.
- mia-ghs.css: module-scoped CSS, including responsive rules.
- mia-ghs.js: module-scoped interactions. Load once with defer after the fragment is present.
- assets/: locally referenced image files, copied without alteration.
- head-snippet.html: approved metadata and dependencies to merge into the host head.
- preview.html: standalone review page only; do not paste this full document into a content module.
- SFMC-REQUIREMENTS.md: unimplemented integrations and launch requirements.
- manifest.json: source checksums, ID mapping and asset inventory.

## Installation

1. Publish mia-ghs.html inside the host's existing main/content slot, below its header and above its footer. Include the fragment once per page.
2. Publish CSS, JavaScript and assets. Paths currently assume this package's files and assets/ directory are served relative to the page; update src, href and CSS url paths to the platform/CDN paths if necessary.
3. Merge head-snippet.html into the host head. Use the approved font policy. Ensure charset UTF-8 and a device-width viewport in the host document. Avoid duplicate title, description and canonical tags.
4. Configure the actual route: https://www.miabytanishq.com/en_IN/golden-harvest-scheme . A canonical tag alone does not publish that route.
5. If the platform inserts the content asynchronously, load the module script after insertion. Initialization is guarded against duplicate execution. No external JavaScript libraries are required.

## Isolation

All existing module classes use ghs-. All IDs in the fragment use mia-ghs-. CSS variables and ordinary selectors are scoped to #mia-ghs-landing; no global body, universal, :root, font or margin reset is shipped. DOM queries target this wrapper. Labels, internal links and ARIA references use the remapped IDs. Field names and event names remain stable for integration.

The only deliberate document-level behavior is temporary background scroll locking while the modal is open. It saves and restores the host body's affected inline styles, root overflow and scroll position. Test on the integrated site, including its fixed header, consent layer and other overlays.

## Form state: NOT connected

Both demo-success flags are false in this package. Both Connect Now buttons are disabled pending SFMC/CRM integration; the popup and its plan summary still open. No real lead collection or enrolment endpoint is supplied. Do not enable a preview flag to make a live form work: preview flags simulate success and transmit nothing.

The calculator Start this Plan includes a visible snapshot and hidden monthlyInstalment, savings, bonus, total, instalments and currency fields. Generic enrolment CTAs clear and disable these plan fields. Inline Connect Now does not carry a plan. Form field names are name, phone and city. Source tracking has not yet been added.

The existing ghs:contact event on #mia-ghs-contact-form carries name, phone, city, onSuccess and onError. An integration listener should preventDefault(), send the data to the approved service, then call onSuccess() only after server confirmation or onError() on failure. The button must only be enabled after the handler/service is configured. The enrolment preview handler needs replacing with an equivalent real submission integration; ghs:enrol is a calculator CTA event, not a form-submit or successful-enrolment event.

## Validation and review

Client-side validation is provided for required name/city text and Indian mobile numbers (optional +91, spaces and hyphens). It does not verify number ownership; repeat validation on the server. Hidden plan values are untrusted client input and must be checked/recalculated by the receiving service.

Local code and package checks cannot establish host CSS compatibility or backend behavior. Before launch, test the embedded page at 320/375/768/1024/1440px, keyboard navigation, popup close/Escape and scroll restoration, plan clearing, tabs/arrows, FAQ animation, marquee/reduced motion, QR scanning and all external links. Do an actual end-to-end lead test with SFMC and confirm a received record.

The source index.html, styles.css and script.js remain unchanged by this export. Rebuild with node prepare-handoff.cjs after subsequent source changes, then recreate the ZIP. Existing generated assets may remain after later source deletions; use manifest.json as the authoritative current inventory.
