# Pending Integration Work - SFMC

The page development has been approved. The following integration work remains:

## 1. Form submission destination

Connect the enrolment popup and the inline Connect Now lead form to the approved SFMC/CRM/API destination. Both collect name, phone number and city. They can use the same destination if supported by the receiving service.

When the popup opens through 'Start this Plan'button click, also submit the selected monthly instalment, total customer contribution, bonus, total jewellery value, instalment count and currency. Other enrolment buttons and the inline form do not include plan details.

## 2. Live submission handling

The handoff has submission buttons disabled and no destination connected. Integrate real submission handling, then enable the buttons. Display the existing success message only after the service confirms success, and show an error if submission fails. Do not enable the demo-success flags for the live page.

Existing validation and success designs are included. Technical integration notes and the inline form's callback hooks are documented in README.md.

