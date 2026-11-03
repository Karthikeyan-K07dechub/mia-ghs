(() => {
  'use strict';

  const range = document.getElementById('monthly-instalment');
  const presets = document.querySelectorAll('[data-amount]');
  const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  });
  const format = amount => currency.format(amount);

  // Preview follows the supplied design: 11 payments + 1 instalment bonus.
  // Confirm production scheme rules and enrolment destination with the client.
  function updatePreview() {
    const amount = Number(range.value);
    const values = {
      'monthly-amount': format(amount),
      'saved-amount': format(amount * 11),
      'redeem-amount': format(amount * 12),
      'gift-amount': `+${format(amount)}`,
      'summary-monthly': format(amount),
      'summary-saved': format(amount * 11),
      'summary-bonus': `+${format(amount)}`,
      'summary-total': format(amount * 12)
    };
    Object.entries(values).forEach(([id, value]) => {
      document.getElementById(id).textContent = value;
    });
    const progress = (amount - Number(range.min)) / (Number(range.max) - Number(range.min)) * 100;
    range.style.setProperty('--range-progress', `${progress}%`);
    range.setAttribute('aria-valuetext', `${format(amount)} per month`);
    presets.forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.amount) === amount));
    });
  }

  range.addEventListener('input', updatePreview);
  presets.forEach(button => button.addEventListener('click', () => {
    range.value = button.dataset.amount;
    updatePreview();
  }));

  document.getElementById('about-start-plan').addEventListener('click', () => range.focus({ preventScroll: true }));


  document.getElementById('start-plan').addEventListener('click', () => {
    const amount = Number(range.value);
    const plan = { monthlyInstalment: amount, savings: amount * 11, bonus: amount, total: amount * 12, instalments: 11, currency: 'INR' };
    // Host integration can handle this event and prevent the enrolment dialog.
    const event = new CustomEvent('ghs:enrol', {
      bubbles: true, cancelable: true,
      detail: { ...plan }
    });
    if (document.getElementById('savings-preview').dispatchEvent(event)) {
      setEnrolPlan(plan);
      openEnrolDialog();
    }
  });

  const contactForm = document.getElementById('contact-form');
  const enrolDialog = document.getElementById('enrol-dialog');
  const enrolForm = document.getElementById('enrol-form');
  let enrolScrollLock = null;
  function lockEnrolBackground() {
    if (enrolScrollLock) return;
    const body = document.body;
    const root = document.documentElement;
    const properties = ['position', 'top', 'left', 'width', 'overflow', 'padding-right'];
    const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
    const paddingRight = parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    enrolScrollLock = {
      x: window.scrollX,
      y: window.scrollY,
      bodyStyles: properties.map(property => [property, body.style.getPropertyValue(property), body.style.getPropertyPriority(property)]),
      rootOverflow: [root.style.getPropertyValue('overflow'), root.style.getPropertyPriority('overflow')]
    };
    root.style.setProperty('overflow', 'hidden');
    body.style.setProperty('position', 'fixed');
    body.style.setProperty('top', `${-enrolScrollLock.y}px`);
    body.style.setProperty('left', `${-enrolScrollLock.x}px`);
    body.style.setProperty('width', '100%');
    body.style.setProperty('overflow', 'hidden');
    body.style.setProperty('padding-right', `${paddingRight + scrollbarWidth}px`);
  }
  function unlockEnrolBackground() {
    if (!enrolScrollLock) return;
    const saved = enrolScrollLock;
    enrolScrollLock = null;
    saved.bodyStyles.forEach(([property, value, priority]) => {
      if (value) document.body.style.setProperty(property, value, priority);
      else document.body.style.removeProperty(property);
    });
    if (saved.rootOverflow[0]) document.documentElement.style.setProperty('overflow', ...saved.rootOverflow);
    else document.documentElement.style.removeProperty('overflow');
    window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
  }
  function openEnrolDialog() {
    if (enrolDialog.open) return;
    lockEnrolBackground();
    try {
      enrolDialog.showModal();
    } catch (error) {
      unlockEnrolBackground();
      throw error;
    }
  }
  const enrolPlanSummary = document.getElementById('enrol-plan-summary');
  const enrolPlanKeys = ['monthlyInstalment', 'savings', 'bonus', 'total', 'instalments', 'currency'];
  function setEnrolPlan(plan) {
    enrolPlanSummary.hidden = !plan;
    enrolPlanKeys.forEach(key => {
      const field = document.getElementById(`enrol-plan-${key}`);
      field.disabled = !plan;
      field.value = plan ? String(plan[key]) : '';
    });
    for (const key of ['monthlyInstalment', 'savings', 'bonus', 'total']) {
      document.getElementById(`enrol-plan-display-${key}`).textContent = plan ? format(plan[key]) : '';
    }
  }
  ['explore-plan', 'how-it-works', 'journey-enrol', 'closing-enrol'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      setEnrolPlan(null);
      openEnrolDialog();
    });
  });
  // Temporary visual preview. Set false to restore disabled submission.
  const enrolSuccessPreview = true;
  const enrolSuccess = document.getElementById('enrol-success');
  const enrolHeader = enrolDialog.querySelector('.ghs-enrol-header');
  const enrolSuccessClose = document.getElementById('enrol-success-close');
  const enrolErrors = document.getElementById('enrol-errors');
  const enrolInputs = ['enrol-name', 'enrol-phone', 'enrol-city'].map(id => document.getElementById(id));
  let enrolValidationStarted = false;

  function getEnrolValidationErrors(values) {
    const errors = {};
    const textPattern = /^[\p{L}\p{M}\s.'’\-]+$/u;
    const hasLetter = /\p{L}/u;
    for (const [key, label] of [['name', 'name'], ['city', 'city']]) {
      const value = values[key].trim();
      if (!value) errors[key] = `Please enter your ${label}.`;
      else if (value.length > 100 || !textPattern.test(value) || !hasLetter.test(value)) {
        errors[key] = `Please enter a valid ${label} using letters, spaces, apostrophes, hyphens or periods.`;
      }
    }
    const phone = values.phone.trim();
    const compactPhone = phone.replace(/[\s-]/g, '');
    const localPhone = compactPhone.replace(/^\+91(?=\d{10}$)/, '');
    if (!phone) errors.phone = 'Please enter your phone number.';
    else if (!/^[+\d\s-]+$/.test(phone) || !/^[6-9]\d{9}$/.test(localPhone)) {
      errors.phone = 'Please enter a valid 10-digit Indian mobile number. You may include +91, spaces or hyphens.';
    }
    return errors;
  }

  function validateLeadFields(inputs, errorContainer, focusFirst = false) {
    const values = Object.fromEntries(inputs.map(input => [input.name, input.value]));
    const errors = getEnrolValidationErrors(values);
    errorContainer.replaceChildren();
    const list = document.createElement('ul');
    let firstInvalid = null;
    inputs.forEach(input => {
      const error = errors[input.name];
      if (error) {
        const item = document.createElement('li');
        item.id = `${input.id}-error`;
        item.textContent = error;
        list.appendChild(item);
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', item.id);
        firstInvalid ||= input;
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    });
    errorContainer.hidden = !firstInvalid;
    if (firstInvalid) errorContainer.appendChild(list);
    if (focusFirst && firstInvalid) firstInvalid.focus();
    return !firstInvalid;
  }

  function validateEnrolForm(focusFirst = false) {
    return validateLeadFields(enrolInputs, enrolErrors, focusFirst);
  }

  enrolInputs.forEach(input => input.addEventListener('input', () => {
    if (enrolValidationStarted) validateEnrolForm();
  }));
  enrolForm.querySelector('button[type="submit"]').disabled = !enrolSuccessPreview;
  enrolForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!enrolSuccessPreview) return;
    enrolValidationStarted = true;
    if (!validateEnrolForm(true)) return;
    enrolForm.hidden = true;
    enrolHeader.hidden = true;
    enrolDialog.setAttribute('aria-labelledby', 'enrol-success-heading');
    enrolSuccess.hidden = false;
    enrolSuccessClose.focus();
  });
  enrolSuccessClose.addEventListener('click', () => enrolDialog.close());
  enrolDialog.addEventListener('close', () => {
    unlockEnrolBackground();
    enrolForm.reset();
    setEnrolPlan(null);
    enrolValidationStarted = false;
    enrolErrors.replaceChildren();
    enrolErrors.hidden = true;
    enrolInputs.forEach(input => {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    });
    enrolForm.hidden = false;
    enrolHeader.hidden = false;
    enrolDialog.setAttribute('aria-labelledby', 'enrol-heading');
    enrolSuccess.hidden = true;
  });
  document.getElementById('closing-calculate').addEventListener('click', () => range.focus({ preventScroll: true }));
  const contactStatus = document.getElementById('contact-status');
  const contactInputs = ['contact-name', 'contact-phone', 'contact-city'].map(id => document.getElementById(id));
  const contactErrors = document.getElementById('contact-errors');
  const contactSuccess = document.getElementById('contact-success');
  const contactSuccessClose = document.getElementById('contact-success-close');
  const contactHeader = document.querySelector('.ghs-contact-header');
  const contactSection = document.querySelector('.ghs-contact');
  const contactButton = contactForm.querySelector('button[type="submit"]');
  let contactValidationStarted = false;
  let contactPending = false;
  // Temporary visual preview only. Set false after reviewing the success state.
  const contactSuccessPreview = true;
  contactInputs.forEach(input => {
    input.addEventListener('input', () => {
      if (contactValidationStarted) validateLeadFields(contactInputs, contactErrors);
    });
  });
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    if (contactPending) return;
    contactValidationStarted = true;
    contactStatus.hidden = true;
    if (!validateLeadFields(contactInputs, contactErrors, true)) return;
    contactPending = true;
    contactButton.disabled = true;
    // The host calls onSuccess only after its server confirms the submission.
    const request = new CustomEvent('ghs:contact', {
      bubbles: true, cancelable: true,
      detail: {
        name: document.getElementById('contact-name').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        city: document.getElementById('contact-city').value.trim(),
        onSuccess: () => {
          if (!contactPending) return;
          contactPending = false;
          contactButton.disabled = false;
          contactForm.hidden = true;
          contactHeader.hidden = true;
          contactStatus.hidden = true;
          contactSection.setAttribute('aria-labelledby', 'contact-success-heading');
          contactSuccess.hidden = false;
          contactSuccessClose.focus();
        },
        onError: () => {
          if (!contactPending) return;
          contactPending = false;
          contactButton.disabled = false;
          contactStatus.textContent = 'We could not submit your enquiry. Please try again.';
          contactStatus.hidden = false;
        }
      }
    });
    if (contactSuccessPreview) {
      request.detail.onSuccess();
      return;
    }
    if (contactForm.dispatchEvent(request)) {
      contactPending = false;
      contactButton.disabled = false;
      contactStatus.textContent = 'Callback requests are currently unavailable.';
      contactStatus.hidden = false;
    }
  });
  contactSuccessClose.addEventListener('click', () => {
    contactForm.reset();
    contactValidationStarted = false;
    contactErrors.replaceChildren();
    contactErrors.hidden = true;
    contactInputs.forEach(input => {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    });
    contactSuccess.hidden = true;
    contactForm.hidden = false;
    contactHeader.hidden = false;
    contactSection.setAttribute('aria-labelledby', 'contact-heading');
    contactInputs[0].focus();
  });

  const benefitTabs = Array.from(document.querySelectorAll('.ghs-benefit-tabs [role="tab"]'));
  const benefitPanels = Array.from(document.querySelectorAll('.ghs-benefit-panels [role="tabpanel"]'));
  const previousBenefit = document.getElementById('benefit-previous');
  const nextBenefit = document.getElementById('benefit-next');
  const benefitCounter = document.getElementById('benefit-counter');
  const benefitTabList = document.querySelector('.ghs-benefit-tabs');
  const mobileBenefits = window.matchMedia('(max-width: 900px)');
  let activeBenefit = 0;

  function selectBenefit(index, focusTab = false) {
    activeBenefit = Math.max(0, Math.min(index, benefitTabs.length - 1));
    benefitTabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === activeBenefit;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      benefitPanels[tabIndex].hidden = !selected;
    });
    previousBenefit.disabled = activeBenefit === 0;
    nextBenefit.disabled = activeBenefit === benefitTabs.length - 1;
    benefitCounter.textContent = `${activeBenefit + 1} / ${benefitTabs.length}`;
    benefitCounter.setAttribute('aria-label', `Benefit ${activeBenefit + 1} of ${benefitTabs.length}`);
    if (focusTab) benefitTabs[activeBenefit].focus({ preventScroll: true });
    if (mobileBenefits.matches) {
      const tab = benefitTabs[activeBenefit];
      benefitTabList.scrollLeft = tab.offsetLeft - benefitTabList.offsetLeft;
    }
    // Retain keyboard focus when an arrow becomes disabled at either end.
    if (document.activeElement === nextBenefit && nextBenefit.disabled) previousBenefit.focus();
    if (document.activeElement === previousBenefit && previousBenefit.disabled) nextBenefit.focus();
  }

  function updateBenefitOrientation() {
    benefitTabList.setAttribute('aria-orientation', mobileBenefits.matches ? 'horizontal' : 'vertical');
  }
  mobileBenefits.addEventListener('change', updateBenefitOrientation);
  updateBenefitOrientation();
  benefitTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectBenefit(index));
    tab.addEventListener('keydown', event => {
      const forward = mobileBenefits.matches ? 'ArrowRight' : 'ArrowDown';
      const backward = mobileBenefits.matches ? 'ArrowLeft' : 'ArrowUp';
      let target;
      if (event.key === forward) target = (index + 1) % benefitTabs.length;
      else if (event.key === backward) target = (index + benefitTabs.length - 1) % benefitTabs.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = benefitTabs.length - 1;
      else return;
      event.preventDefault();
      selectBenefit(target, true);
    });
  });
  previousBenefit.addEventListener('click', () => selectBenefit(activeBenefit - 1));
  nextBenefit.addEventListener('click', () => selectBenefit(activeBenefit + 1));
  selectBenefit(0);

  const faqItems = [...document.querySelectorAll('.ghs-faq-items details')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Control the group ourselves so a closing answer stays visible during animation.
  faqItems.forEach(item => item.removeAttribute('name'));
  const faqControllers = faqItems.map(item => {
    const summary = item.querySelector('summary');
    let targetOpen = item.open;
    let animation = null;

    function setExpanded(expanded) {
      if (targetOpen === expanded) return;
      targetOpen = expanded;
      const startHeight = item.getBoundingClientRect().height;
      if (animation) {
        animation.onfinish = null;
        animation.cancel();
        animation = null;
      }
      if (reducedMotion.matches || typeof item.animate !== 'function') {
        item.open = expanded;
        item.style.overflow = '';
        return;
      }
      // Measure the natural destination, then retain the answer until closing ends.
      item.open = expanded;
      const endHeight = item.getBoundingClientRect().height;
      item.open = true;
      item.style.overflow = 'hidden';
      animation = item.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 300, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
      animation.onfinish = () => {
        item.open = targetOpen;
        item.style.overflow = '';
        animation = null;
      };
    }

    summary.addEventListener('click', event => {
      event.preventDefault();
      const expanded = !targetOpen;
      if (expanded) faqControllers.forEach(controller => controller.close());
      setExpanded(expanded);
    });
    return { close: () => setExpanded(false) };
  });

  updatePreview();
  const benefitsStrip = document.querySelector('.ghs-benefits');
  const benefitsTrack = benefitsStrip.querySelector('.ghs-benefits-track');
  const benefitsCopy = benefitsTrack.querySelector('ul').cloneNode(true);
  benefitsCopy.classList.add('ghs-benefits-copy');
  benefitsCopy.setAttribute('aria-hidden', 'true');
  benefitsTrack.appendChild(benefitsCopy);
  benefitsStrip.classList.add('ghs-benefits-animated');
  benefitsStrip.setAttribute('tabindex', '0');
  function updateBenefitsSpacing() {
    if (reducedMotion.matches) return;
    const items = [...benefitsTrack.querySelector('ul').children];
    const contentWidth = items.reduce((total, item) => total + item.getBoundingClientRect().width, 0);
    // Include the gap from the last item to the next copy in the distribution.
    const gap = Math.max(32, (benefitsStrip.clientWidth - contentWidth) / items.length);
    benefitsTrack.style.setProperty('--benefits-gap', `${gap}px`);
  }
  updateBenefitsSpacing();
  window.addEventListener('resize', updateBenefitsSpacing);
  reducedMotion.addEventListener('change', updateBenefitsSpacing);
  if (document.fonts) document.fonts.ready.then(updateBenefitsSpacing);
})();
