(() => {
  'use strict';

  const range = document.getElementById('monthly-instalment');
  const presets = document.querySelectorAll('[data-amount]');
  const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  });
  const format = amount => currency.format(amount);
  const dialog = document.getElementById('plan-dialog');

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

  document.getElementById('explore-plan').addEventListener('click', () => range.focus({ preventScroll: true }));
  document.getElementById('about-start-plan').addEventListener('click', () => range.focus({ preventScroll: true }));

  function showExplanation(title, copy) {
    document.getElementById('dialog-heading').textContent = title;
    document.getElementById('dialog-copy').textContent = copy;
    dialog.showModal();
  }

  document.getElementById('how-it-works').addEventListener('click', () => {
    showExplanation('How your plan works', "Choose your monthly instalment and save for 11 months. The preview adds Mia's bonus contribution, equal to one monthly instalment, in month 12 to show your total jewellery value.");
  });

  document.getElementById('start-plan').addEventListener('click', () => {
    const amount = Number(range.value);
    // Host integration can handle this event and prevent the preview dialog.
    const event = new CustomEvent('ghs:enrol', {
      bubbles: true, cancelable: true,
      detail: { monthlyInstalment: amount, savings: amount * 11, bonus: amount, total: amount * 12 }
    });
    if (document.getElementById('savings-preview').dispatchEvent(event)) {
      showExplanation('Your selected plan', `Your monthly instalment is ${format(amount)}. Over 11 months, you save ${format(amount * 11)}. With Mia's ${format(amount)} bonus in month 12, your preview jewellery value is ${format(amount * 12)}.`);
    }
  });

  const contactForm = document.getElementById('contact-form');
  ['journey-enrol', 'closing-enrol'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('start-plan').click();
    });
  });
  document.getElementById('closing-calculate').addEventListener('click', () => range.focus({ preventScroll: true }));
  const contactStatus = document.getElementById('contact-status');
  ['contact-name', 'contact-city'].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      input.setCustomValidity(input.value.trim() ? '' : 'Please complete this field.');
    });
  });
  contactForm.addEventListener('submit', event => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    const request = new CustomEvent('ghs:contact', {
      bubbles: true, cancelable: true,
      detail: {
        name: document.getElementById('contact-name').value.trim(),
        phone: document.getElementById('contact-phone').value.trim(),
        city: document.getElementById('contact-city').value.trim()
      }
    });
    contactStatus.hidden = true;
    if (contactForm.dispatchEvent(request)) {
      contactStatus.textContent = 'Callback requests are currently unavailable.';
      contactStatus.hidden = false;
    }
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
})();
