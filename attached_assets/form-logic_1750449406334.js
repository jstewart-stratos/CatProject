(() => {
  const MODE      = window.MODE      || 'new';   // "new" | "edit"
  const INIT_ACCT = window.INIT_ACCT || {};      // row-dict when editing
  
  let navData = [], formData = [], listsData = {};

  // Map human-readable “section names” (as used in nav-logic.json) → section IDs
  const sectionMap = {
    'ACH Information':                 'achInfo',
    'Additional Account Holders':      'additionalHolders',
    'Account Options':                 'accountOptions',
    'Beneficiaries':                   'beneficiaries',
    'Trading Authority':               'tradingAuthority',
    'Trading Options':                 'tradingOptions',
    'Direct/Outside Business':         'directOutsideBusiness',
    '529 Plan Disclosure Checklist':   'planDisclosureChecklist',
    'Trust Account Information':       'trustAccountInfo',
    'Power of Attorney':               'powerOfAttorney'
  };
    // ─── UTILITY: wipe out every hidden section on the page ───────────────────────
  function clearAllHiddenSections() {
    Object.values(sectionMap).forEach(secId => {
      const sec = document.getElementById(secId);
      if (sec && sec.classList.contains('hidden')) {
        clearFields(sec);
      }
    });
  }
  // ─── UTILITY: clear all inputs/selects/textareas & unset required ────────────
  function clearFields(container) {
    if (!container) return;
    container.querySelectorAll('input, select, textarea').forEach(f => {
      if (f.type === 'checkbox' || f.type === 'radio') {
        f.checked = false;
      } else {
        f.value = '';
        if (f.tagName.toLowerCase() === 'select') {
          f.selectedIndex = 0;
        }
      }
      f.required = false;
    });
  }
  // ─── Prefill every input / select / checkbox from INIT_ACCT ─────────────
  function prefillFromRow() {
    const status = INIT_ACCT['Additional Holder - Employment Status'];
    for (const [k, v] of Object.entries(INIT_ACCT)) {
      const els = document.querySelectorAll(`[name="${CSS.escape(k)}"]`);
      if (!els.length) console.warn('No element for', k, v);
      els.forEach(el => {
        if (el.type === 'checkbox' || el.type === 'radio') {
          el.checked = (el.value === v);
        } else {
          let value = v;
          if (
            k === 'Additional Holder - Industry' &&
            !v &&
            ['Minor', 'Retired', 'Student', 'Homemaker'].includes(status)
          ) {
            value = status;
          }
          el.value = value;
        }
      });
    }
  }

// ─── Re-run the various Yes/No toggle helpers so the UI matches values ───
function syncAllToggles() {
  // add/remove any you use:
  if (typeof toggleAch        === 'function') toggleAch(        document.getElementById('achChoice')?.value        === 'Yes');
  if (typeof toggleMargin     === 'function') toggleMargin(     document.getElementById('marginChoice')?.value     === 'Yes');
  if (typeof toggleStructured === 'function') toggleStructured( document.getElementById('spChoice')?.value         === 'Yes');
  if (typeof toggleOptions    === 'function') toggleOptions(    document.getElementById('optionsChoice')?.value    === 'Yes');
  if (typeof toggleFDT        === 'function') toggleFDT(        document.getElementById('fdtChoice')?.value        === 'Yes');
  if (typeof toggleTOD        === 'function') toggleTOD(        document.getElementById('todChoice')?.value        === 'Yes');
  // …repeat for any other toggleXYZ you have
}
  // ─── MAIN INIT ───────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Load nav-logic.json, form-logic.json, and /lists (for dropdown values)
    Promise.all([
      fetch('/static/nav-logic.json').then(r => r.json()),
      fetch('/static/form-logic.json').then(r => r.json()),
      fetch('/lists').then(r => r.json())
    ])
    .then(([navJson, formJson, lists]) => {
      navData   = navJson;
      formData  = formJson;
      listsData = lists;
      window.formData  = formData;  // for debugging if needed
      window.listsData = listsData;

      populateAllDropdowns();
      initLogic();
      
      if (window.MODE === 'edit') {
        prefillFromRow();
        statusSelect.dispatchEvent(new Event('change'));
        industrySelect.dispatchEvent(new Event('change'));
        const savedAff = INIT_ACCT['Additional Holder - Affiliation Type'];
        if (savedAff) {
       // make sure the picklist is set
       affiliationSelect.value = savedAff;
       // show the wrapper
       toggle(affiliationDiv, true);
       // enforce required
       markRequiredIfVisible(affiliationSelect);
        }
        console.log('Running prefillFromRow', window.INIT_ACCT);
        syncAllToggles();
        updateRegistrationType();
        updateInvestmentObjective();
        updateInvestmentTimeHorizon();
        updateFundsNeededIn();
        updateFields();
        updateNav();
        applyBeneficiaryOverride();
        initNonPersonLogic();

      }

      // After initial population of selects, seed dependent dropdowns
      updateRegistrationType();
      updateInvestmentObjective();
      updateInvestmentTimeHorizon();
      updateFundsNeededIn();
      clearAllHiddenSections();
      
      if (window.MODE === 'edit' && typeof prefillFromRow === 'function') {
        setTimeout(() => prefillFromRow(), 0);
      }
    })
    .catch(console.error);
  });
  // ─── POPULATE “static” DROPDOWNS FROM /lists ─────────────────────────────────
  function populateAllDropdowns() {
    document.querySelectorAll('select[data-list-key]').forEach(select => {
      const key     = select.dataset.listKey;
      const options = listsData[key] || [];
      select.innerHTML = '<option value="" hidden>Select</option>';
      options.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.text  = item;
        select.appendChild(opt);
      });
      // If there’s an initial value stored via data-initial, restore it:
      const initial = select.dataset.initial;
      if (initial && initial !== '' && select.querySelector(`option[value="${initial}"]`)) {
        select.value = initial;
      }
    });
  }

  // ─── SETUP EVENT HANDLERS + INITIAL-RUN ──────────────────────────────────────
  function initLogic() {
    // If CLIENT_TYPE === 'Entity', enforce entity-only rules
    const clientType = (window.CLIENT_TYPE || '').trim().toLowerCase();
    if (clientType === 'entity') enforceEntity();

    // Wire up “change” listeners on the 3 key dropdowns
    const acctSel = document.getElementById('account_type');
    const progSel = document.getElementById('program_type');
    const regSel  = document.getElementById('registration_type');

    if (acctSel) {
      acctSel.addEventListener('change', () => {
        updateNav();
        updateFields();
        updateRegistrationType();
        clearAllHiddenSections();
        applyBeneficiaryOverride();
        
      });
    }
    if (progSel) {
      progSel.addEventListener('change', () => {
        updateNav();
        updateFields();
        updateRegistrationType();
        updateInvestmentObjective();
        updateInvestmentTimeHorizon();
        updateFundsNeededIn();
        clearAllHiddenSections();
        applyBeneficiaryOverride();
      });
    }
    if (regSel) {
      regSel.addEventListener('change', () => {
        updateNav();
        updateFields();
        clearAllHiddenSections();
        applyBeneficiaryOverride();
      });
    }

    // Run once on load to set initial state
    updateNav();
    updateFields();
    updateRegistrationType();
    updateInvestmentObjective();
    updateInvestmentTimeHorizon();
    updateFundsNeededIn();
    clearAllHiddenSections();
    applyBeneficiaryOverride();
  }

  // ─── NAV LOGIC: Show/hide nav Buttons + Clear “required” on hidden sections ──
  function updateNav() {
    const acct = document.getElementById('account_type')?.value || '';
    const prog = document.getElementById('program_type')?.value || '';
    const reg  = document.getElementById('registration_type')?.value || '';

    // Find the matching nav-logic row (or {} if not found)
    const rec = navData.find(r =>
      r['Account Type'] === acct &&
      r['Program Type'] === prog &&
      r['Registration Type'] === reg
    ) || {};

    // Hide all nav buttons except “Account Information”
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.section !== 'accountInfo') {
        btn.classList.add('hidden');
      }
    });

    // Unhide any nav buttons flagged true in JSON
    Object.keys(rec).forEach(key => {
      if (key.startsWith('Unhide ') && rec[key] === true) {
        const sectionName = key.replace('Unhide ', '');
        const secId       = sectionMap[sectionName];
        const btn         = document.querySelector(`.nav-btn[data-section="${secId}"]`);
        if (btn) btn.classList.remove('hidden');
      }
    });

    // Whenever a nav button is hidden, clear required on all fields inside its section
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const secId       = btn.dataset.section;
      const sectionElem = document.getElementById(secId);
      if (btn.classList.contains('hidden') && sectionElem) {
        sectionElem.querySelectorAll('[data-field-key]').forEach(fieldContainer => {
          fieldContainer.querySelectorAll('input, select, textarea').forEach(f => {
            f.required = false;
          });
        });
      }
    });
  }

  // ─── FIELD LOGIC: Show/hide individual fields & toggle required ───────────────
  function updateFields() {
    const acct = document.getElementById('account_type')?.value || '';
    const prog = document.getElementById('program_type')?.value || '';
    const reg  = document.getElementById('registration_type')?.value || '';
    const rec  = formData.find(r =>
      r['Account Type']      === acct &&
      r['Program Type']      === prog &&
      r['Registration Type'] === reg
    ) || {};
console.log('logic record for', acct, prog, reg, rec);
    // Hide ALL [data-field-key] containers, then unhide per JSON
    document.querySelectorAll('[data-field-key]').forEach(container => {
      const key         = container.dataset.fieldKey;
      const unhideProp  = 'Unhide '  + key;
      const requireProp = 'Require ' + key;

      if (rec[unhideProp] === true) {
        container.classList.remove('hidden');
        const shouldRequire = rec[requireProp] === true;
        container.querySelectorAll('input, select, textarea').forEach(f => {
          f.required = shouldRequire;
        });
      } else {
        container.classList.add('hidden');
        clearFields(container);
        container.querySelectorAll('input, select, textarea').forEach(f => {
          f.required = false;
        });
      }
    });

    // Special‐case EDT (“Transfer On Death”) block: run toggleTOD to sync UI
    const todField = document.querySelector('[data-field-key="Transfer On Death"]');
    if (todField && !todField.classList.contains('hidden')) {
      const todInput = document.getElementById('todChoice');
      if (typeof toggleTOD === 'function' && todInput) {
        const todValue = todInput.value === 'Yes';
        toggleTOD(todValue);
      }
    }

    // If any “Decedent Name”, “Date Of Death”, or “Distribution Types” is unhidden,
    // unhide #beneficiaryIraDetails; otherwise hide & clear it
    const benContainer = document.getElementById('beneficiaryIraDetails');
    if (benContainer) {
      const showBen =
        rec['Unhide Decedent Name']       === true ||
        rec['Unhide Date Of Death']       === true ||
        rec['Unhide Distribution Types']  === true;
      benContainer.classList.toggle('hidden', !showBen);
      if (!showBen) {
        clearFields(benContainer);
        benContainer.querySelectorAll('input, select, textarea').forEach(f => {
          f.required = false;
        });
      }
    }

    // Similar block for “Advisory Program Account Information”
    const advContainer = document.getElementById('advisoryProgramAccountInfo');
    if (advContainer) {
      const showAdv =
        rec['Unhide Advisor Fee']            === true ||
        rec['Unhide Advisory Billing Cycle'] === true;
      advContainer.classList.toggle('hidden', !showAdv);
      if (!showAdv) {
        clearFields(advContainer);
        advContainer.querySelectorAll('input, select, textarea').forEach(f => {
          f.required = false;
        });
      }
    }
  }

  // ─── ENTITY CLIENT‐TYPE LOGIC (force certain selects/values) ──────────────────
  function enforceEntity() {
    const acctSel = document.getElementById('account_type');
    if (!acctSel) return;

    // Force “Account Type” → only be “Entity”
    acctSel.innerHTML = '';
    acctSel.add(new Option('Entity', 'Entity'));
    acctSel.value = 'Entity';

    const etype   = (window.ENTITY_TYPE || '').trim().toLowerCase();
    const regSel  = document.getElementById('registration_type');
    if (!regSel) return;

    let options = [];
    if (etype === 'estate') {
      options = ['Estate'];
    } else if (etype === 'trust') {
      options = ['Trust'];
    } else if (etype === 'company') {
      options = [
        'Corporation',
        'Investment Club',
        'Limited Liability Company',
        'Non-Profit',
        'Partnership',
        'Sole Proprietorship/DBA'
      ];
    }

    regSel.innerHTML = '';
    options.forEach(o => regSel.add(new Option(o, o)));
    if (options.length) regSel.value = options[0];
  }

  // ─── POPULATE DEPENDENT DROPDOWNS ──────────────────────────────────────────────

  // Registration Type depends on Account Type + Program Type
  function updateRegistrationType() {
    const accountType = document.getElementById('account_type')?.value || '';
    const programType = document.getElementById('program_type')?.value || '';
    const regSel      = document.getElementById('registration_type');
    if (!regSel || !formData) return;

    // Gather distinct Registration Types from formData matching (acct,prog)
    const registrationTypes = formData
      .filter(r =>
        r['Account Type'] === accountType &&
        r['Program Type'] === programType
      )
      .map(r => r['Registration Type'])
      .filter((v,i,a) => v && a.indexOf(v) === i);

    // If CLIENT_TYPE is “Entity”, we already forced the <select> → don’t overwrite
    if (window.CLIENT_TYPE && window.CLIENT_TYPE.toLowerCase() === 'entity') {
      return;
    }

    // Rebuild <option> list
    regSel.innerHTML = '<option value="" hidden>Select</option>';
    registrationTypes.forEach(type => {
      const opt = document.createElement('option');
      opt.value = type;
      opt.text  = type;
      regSel.appendChild(opt);
    });

    // Restore “data-initial” if present
    const initial = regSel.dataset.initial;
    if (initial && initial !== '' && regSel.querySelector(`option[value="${initial}"]`)) {
      regSel.value = initial;
    }
  }

  // Investment Objective from listsData
  function updateInvestmentObjective() {
    const sel = document.getElementById('investment_obj');
    if (!sel) return;
    const options = listsData['Investment Objective'] || [];
    sel.innerHTML = '<option value="" hidden>Select</option>';
    options.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.text  = val;
      sel.appendChild(opt);
    });
    const initial = sel.dataset.initial;
    if (initial && initial !== '' && sel.querySelector(`option[value="${initial}"]`)) {
      sel.value = initial;
    }
  }

  // Investment Time Horizon
  function updateInvestmentTimeHorizon() {
    const sel = document.getElementById('horizon');
    if (!sel) return;
    const options = listsData['Investment Time Horizon'] || [];
    sel.innerHTML = '<option value="" hidden>Select</option>';
    options.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.text  = val;
      sel.appendChild(opt);
    });
    const initial = sel.dataset.initial;
    if (initial && initial !== '' && sel.querySelector(`option[value="${initial}"]`)) {
      sel.value = initial;
    }
  }

  // Funds Needed In / Liquidity Needs Timeframe
  function updateFundsNeededIn() {
    const sel = document.getElementById('funds_needed');
    if (!sel) return;
    const options = listsData['Liquidity Needs Timeframe'] || [];
    sel.innerHTML = '<option value="" hidden>Select</option>';
    options.forEach(val => {
      const opt = document.createElement('option');
      opt.value = val;
      opt.text  = val;
      sel.appendChild(opt);
    });
    const initial = sel.dataset.initial;
    if (initial && initial !== '' && sel.querySelector(`option[value="${initial}"]`)) {
      sel.value = initial;
    }
  }

  // ─── UTILITY: clear all inputs/selects/textareas in a container ──────────────
  function clearFields(container) {
    if (!container) return;
    container.querySelectorAll('input, select, textarea').forEach(f => {
      if (f.type === 'checkbox' || f.type === 'radio') {
        f.checked = false;
      } else {
        f.value = '';
        if (f.tagName.toLowerCase() === 'select') {
          f.selectedIndex = 0;
        }
      }
      f.required = false;
    });
  }

  // ─── ADDITIONAL ACCOUNT HOLDER SECTION ─────────────────────────────────────────
  const holderSection = document.getElementById('additionalHolders');
  const formElem = document.querySelector('form');

  // A) DECIDE IF ADDITIONAL HOLDER IS FORCED
  function additionalHolderIsRequired() {
    const acctType = document.getElementById('account_type')?.value || '';
    const regType  = document.getElementById('registration_type')?.value || '';

    // 1) Any accountType containing “Joint”
    if (acctType.toLowerCase().includes('joint')) {
      return true;
    }

    // 2) Registration Types: Guardianship, Conservatorship, Education Savings, Minor Custodial, 529 Plan
    const reqRegTypes = [
      'Guardianship',
      'Conservatorship',
      'Education Savings',
      'Minor Custodial',
      '529 Plan'
    ];
    if (reqRegTypes.includes(regType)) {
      return true;
    }

    // 3) “Guardian IRA” and “Guardian Roth IRA”
    if (regType === 'Guardian IRA' || regType === 'Guardian Roth IRA') {
      return true;
    }

    return false;
  }

  // B) ENFORCE ADDITIONAL HOLDER SECTION
  function isVisible(el) {
    while (el) {
      if (el.classList && el.classList.contains('hidden')) return false;
      el = el.parentElement;
    }
    return true;
  }

  function enforceAdditionalHolderSection() {
    if (!holderSection) return;

    const fields = Array.from(holderSection.querySelectorAll('input, select, textarea'));
    let sectionActive = additionalHolderIsRequired();

    // If not forced, check if user has typed/selected anything
    if (!sectionActive) {
      for (const f of fields) {
        if (!isVisible(f)) continue;
        const name = (f.getAttribute('name') || '').toLowerCase();
        const tag  = f.tagName.toLowerCase();

        // Skip the “Use Same Address As Primary” and “Exclude Employer Address” checkboxes
        if (
          name.includes('use same address') ||
          name.includes('exclude employer address')
        ) {
          continue;
        }
        if (tag === 'select' && f.value) {
          sectionActive = true;
          break;
        }
        if ((tag === 'input' || tag === 'textarea') && f.type !== 'checkbox') {
          if (f.value.trim() !== '') {
            sectionActive = true;
            break;
          }
        }
      }
    }

    if (sectionActive) {
      // Require all visible fields except middle name, alias, useSame, excludeEmployer, phone fields
      fields.forEach(f => {
        const name = (f.getAttribute('name') || '').toLowerCase();

        if (
          name.includes('middle name') ||
          name.includes('email') ||
          name.includes('legal address line 2') ||
          name.includes('alias') ||
          name.includes('use same address') ||
          name.includes('exclude employer address')
        ) {
          f.required = false;
          return;
        }
        if (
          name.includes('home phone') ||
          name.includes('mobile phone') ||
          name.includes('business phone')
        ) {
          f.required = false;
          return;
        }
        // Otherwise, set required if visible, else false
        if (isVisible(f)) {
          f.required = true;
        } else {
          f.required = false;
        }
      });
    } else {
      // No enforcement: clear required on all
      fields.forEach(f => {
        f.required = false;
      });
    }
  }

  // Validate on submit: if section active, require at least one phone
  function validateAdditionalHolderOnSubmit(evt) {
    if (!holderSection) return true;

    const fields = Array.from(holderSection.querySelectorAll('input, select, textarea'));
    let sectionActive = additionalHolderIsRequired();
 
    if (!sectionActive) {
      for (const f of fields) {
        if (!isVisible(f)) continue;
        const name = (f.getAttribute('name') || '').toLowerCase();
        const tag  = f.tagName.toLowerCase();
        if (
          name.includes('use same address') ||
          name.includes('exclude employer address')
        ) continue;
        if (tag === 'select' && f.value) {
          sectionActive = true;
          break;
        }
        if ((tag === 'input' || tag === 'textarea') && f.type !== 'checkbox') {
          if (f.value.trim() !== '') {
            sectionActive = true;
            break;
          }
        }
      }
    }

    if (!sectionActive) {
      return true;
    }

    const homePhone     = holderSection.querySelector('input[name="Additional Holder - Home Phone"]');
    const mobilePhone   = holderSection.querySelector('input[name="Additional Holder - Mobile Phone"]');
    const businessPhone = holderSection.querySelector('input[name="Additional Holder - Business Phone"]');
    const homeVal     = homePhone     ? homePhone.value.trim()     : '';
    const mobileVal   = mobilePhone   ? mobilePhone.value.trim()   : '';
    const businessVal = businessPhone ? businessPhone.value.trim() : '';

    if (!homeVal && !mobileVal && !businessVal) {
      evt.preventDefault();
      console.error('Blocking submit: at least one phone required in Additional Account Holders.');
      // focus the first available phone field
      if (homePhone)     homePhone.focus();
      else if (mobilePhone) mobilePhone.focus();
      else if (businessPhone) businessPhone.focus();
      return false;
    }

    return true;
  }
  // Wire events on all fields inside additionalHolders
  function wireAdditionalHolderSection() {
    if (!holderSection) return;
    const fields = Array.from(holderSection.querySelectorAll('input, select, textarea'));
    fields.forEach(f => {
      f.addEventListener('input', enforceAdditionalHolderSection);
      f.addEventListener('change', enforceAdditionalHolderSection);
    });
    enforceAdditionalHolderSection();
    if (formElem) {
      formElem.addEventListener('submit', validateAdditionalHolderOnSubmit);
    }
  }

// ─── EMPLOYMENT / INDUSTRY / OCCUPATION / EMPLOYER / AFFILIATION ────────────
const statusSelect       = document.getElementById('add_employment_status');
const industrySelect     = document.getElementById('add_industry');
const industryOtherLabel = document.getElementById('add_industry_other_label');
const industryOtherInput = document.getElementById('add_industry_other');
const occupationDiv      = document.getElementById('add_occupation_container');
const occupationInput    = document.getElementById('add_occupation');
const employerDiv        = document.getElementById('add_employer_name_wrapper');
const employerInput      = document.getElementById('employer_name');
const affiliationDiv     = document.getElementById('add_affiliation_wrapper');
const affiliationSelect  = document.getElementById('add_affiliation_type');
const excludeCheckbox    = document.getElementById('exclude_employer_address');
const employerFields     = document.getElementById('employer_address_fields');

const forcedStatuses       = ['Minor', 'Retired', 'Student', 'Homemaker'];
const placeholderOptionHTML = '<option value="" disabled selected hidden>Select</option>';

function toggle(el, show) {
  if (!el) return;
  el.classList.toggle('hidden', !show);
}

function clearSectionFields(container) {
  if (!container) return;
  container.querySelectorAll('input, select, textarea').forEach(f => {
    if (f.type === 'checkbox' || f.type === 'radio') f.checked = false;
    else {
      f.value = '';
      if (f.tagName.toLowerCase() === 'select') f.selectedIndex = 0;
    }
    f.required = false;
  });
}

function markRequiredIfVisible(field) {
  if (!field) return;
  let el = field;
  while (el) {
    if (el.classList && el.classList.contains('hidden')) {
      field.required = false;
      return;
    }
    el = el.parentElement;
  }
  field.required = true;
}

function populateFromPicklist(selectElem) {
  if (!selectElem) return;
  const key = selectElem.dataset.listKey;
  if (!key) return;
  selectElem.innerHTML = placeholderOptionHTML;
  (window.picklists?.[key] || []).forEach(val => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = val;
    selectElem.appendChild(o);
  });
}

function appendOther(selectElem) {
  if (!selectElem.querySelector('option[value="Other"]')) {
    const o = document.createElement('option');
    o.value = 'Other';
    o.textContent = 'Other';
    selectElem.appendChild(o);
  }
}

function resetEmploymentFields() {
  // Industry
  populateFromPicklist(industrySelect);
  industrySelect.value = '';
  industrySelect.disabled = true;
  industrySelect.classList.add('bg-gray-100');
  industrySelect.required = false;
  toggle(industryOtherLabel, false);
  toggle(industryOtherInput, false);
  // note: do NOT clear industryOtherInput.value here, so edit-mode text is preserved
  industryOtherInput.required = false;

  // Occupation
  toggle(occupationDiv, true);
  occupationInput.value = '';
  occupationInput.disabled = true;
  occupationInput.readOnly = false;
  occupationInput.classList.add('bg-gray-100');
  occupationInput.required = false;

  // Employer
  toggle(employerDiv, false);
  employerInput.value = '';
  employerInput.required = false;

  // Affiliation
  toggle(affiliationDiv, false);
  affiliationSelect.value = '';
  affiliationSelect.required = false;
}

function handleIndustryChange() {
  const status     = statusSelect.value;
  const isEmpUnemp = (status === 'Employed' || status === 'Unemployed');
  const savedOther = industryOtherInput.value.trim();

  // only resurrect "Other" when status is Employed/Unemployed
  if (isEmpUnemp && savedOther) {
    appendOther(industrySelect);
    industrySelect.disabled = false;
    industrySelect.classList.remove('bg-gray-100');
    industrySelect.value = 'Other';
  }

  const industry = industrySelect.value.trim();
  const isOther  = (industry === 'Other');

  // 1) Other‐Industry textbox
  toggle(industryOtherLabel, isOther);
  toggle(industryOtherInput, isOther);
  industryOtherInput.required = isOther;

  // 2) Occupation: always visible & required for Employed/Unemployed
  if (isEmpUnemp) {
    toggle(occupationDiv, true);
    occupationInput.disabled = false;
    occupationInput.readOnly = false;
    occupationInput.classList.remove('bg-gray-100');
    markRequiredIfVisible(occupationInput);
  }
  // (forced statuses already set occupation in handleStatusChange)

  // 3) Employer Name: show for Employed OR (Unemployed + Other)
  if (status === 'Employed' || (status === 'Unemployed' && isOther)) {
    toggle(employerDiv, true);
    markRequiredIfVisible(employerInput);
  } else {
    toggle(employerDiv, false);
    employerInput.required = false;
  }

  // 4) Affiliation: show whenever Industry non-empty
  if (industry) {
    toggle(affiliationDiv, true);
    markRequiredIfVisible(affiliationSelect);
  } else {
    toggle(affiliationDiv, false);
    affiliationSelect.required = false;
  }
}

function handleStatusChange() {
  const status = statusSelect.value;
  resetEmploymentFields();
  
  // 2)clear_ any stale “Other Industry” text whenever status changes
  industryOtherInput.value = '';

  if (status === 'Employed' || status === 'Unemployed') {
    populateFromPicklist(industrySelect);
    appendOther(industrySelect);
    industrySelect.disabled = false;
    industrySelect.classList.remove('bg-gray-100');
    markRequiredIfVisible(industrySelect);

    toggle(occupationDiv, true);
    occupationInput.disabled = false;
    occupationInput.readOnly = false;
    occupationInput.classList.remove('bg-gray-100');
    markRequiredIfVisible(occupationInput);

    if (status === 'Employed') {
      toggle(employerDiv, true);
      markRequiredIfVisible(employerInput);
    }
  }
  else if (forcedStatuses.includes(status)) {
    industrySelect.innerHTML = placeholderOptionHTML +
      `<option value="${status}" selected>${status}</option>`;
    industrySelect.disabled = false;
    industrySelect.classList.remove('bg-gray-100');
    markRequiredIfVisible(industrySelect);

    occupationInput.value = status;
    occupationInput.disabled = false;
    occupationInput.readOnly = true;
    occupationInput.classList.remove('bg-gray-100');
    markRequiredIfVisible(occupationInput);

    toggle(employerDiv, false);
  }

  // apply Other/Employer/Affiliation logic
  handleIndustryChange();
}

// Exclude Employer Address toggle
if (excludeCheckbox) {
  toggle(employerFields, !excludeCheckbox.checked);
  excludeCheckbox.addEventListener('change', () => {
    const hide = excludeCheckbox.checked;
    toggle(employerFields, !hide);
    if (hide) clearSectionFields(employerFields);
  });
}

// Fetch picklists, then initialize
if (statusSelect) {
  fetch('/lists')
    .then(res => res.json())
    .then(data => {
      window.picklists = data;

      populateFromPicklist(statusSelect);
      populateFromPicklist(affiliationSelect);
      resetEmploymentFields();

      // 1) Prefill Status
      const initStatus = statusSelect.dataset.initial || '';
      if (initStatus) statusSelect.value = initStatus;
      handleStatusChange();

      // 2) Prefill Industry / Other
      const initIndustry = industrySelect.dataset.initial || '';
      const savedOther   = industryOtherInput.value.trim();
      if (!savedOther && initIndustry) {
        populateFromPicklist(industrySelect);
        appendOther(industrySelect);
        industrySelect.disabled = false;
        industrySelect.classList.remove('bg-gray-100');
        industrySelect.value = data['Industry'].includes(initIndustry)
                              ? initIndustry
                              : (appendOther(industrySelect), 'Other');
        if (industrySelect.value === 'Other') {
          toggle(industryOtherLabel, true);
          toggle(industryOtherInput, true);
          industryOtherInput.value    = initIndustry;
          industryOtherInput.required = true;
        }
      }

      handleIndustryChange();

      // 3) Wire listeners once
      statusSelect.addEventListener('change', handleStatusChange);
      industrySelect.addEventListener('change', handleIndustryChange);
    })
    .catch(console.error);
}
// “Clear Additional Holder” BUTTON HANDLER
const clearHolderBtn = document.getElementById('clearAdditionalHolderBtn');
if (clearHolderBtn) {
  clearHolderBtn.addEventListener('click', () => {
    const holderSection = document.getElementById('additionalHolders');
    if (!holderSection) return;

    // 1) Wipe every field in the Additional Holders section
    clearFields(holderSection);

    // 2) Re-run your enforcement logic so all required flags reset
    enforceAdditionalHolderSection();
  });
}


// 1) List of registration types that also always need beneficiaries:
const regTypesRequireBenef = [
  'Roth IRA',
  'SARSEP',
  'SEP IRA',
  'SIMPLE IRA',
  'Traditional IRA',
  'Beneficiary IRA',
  'Beneficiary Roth IRA',
  'Beneficiary SIMPLE IRA',
  'Guardian IRA',
  'Guardian Roth IRA'
];

// 2) Combined predicate
function needsBeneficiaries() {
  const todValue = document.getElementById('todChoice')?.value;
  const regValue = document.getElementById('registration_type')?.value;
  return todValue === 'Yes' || regTypesRequireBenef.includes(regValue);
}

// 4) Toggle required flags & nav-button
function enforceBeneficiaryFields() {
  const benSection = document.getElementById('beneficiaries');
  if (!benSection) return;

  // List of required field suffixes
  const requiredSuffixes = [
    '[First Name]',
    '[Last Name]',
    '[Percentage]',
    '[Relationship]',
    '[Type]'
  ];

  // if we don’t need them, clear & exit
  if (!needsBeneficiaries()) {
    benSection.querySelectorAll('input, select, textarea')
      .forEach(f => f.required = false);
    return;
  }

  // otherwise, require all specified fields on each row
  Array.from(benSection.querySelectorAll('.beneficiary-entry')).forEach(row => {
    requiredSuffixes.forEach(suf => {
      const inp = row.querySelector(`input[name$="${suf}"], select[name$="${suf}"]`);
      if (inp) inp.required = true;
    });
    // clear the rest
    row.querySelectorAll('select, textarea, input').forEach(f => {
      const n = f.name || '';
      if (!requiredSuffixes.some(suf => n.endsWith(suf))) {
        f.required = false;
      }
    });
  });
}

function applyBeneficiaryOverride() {
  // unhide the nav-button if needed
  const benBtn = document.querySelector('.nav-btn[data-section="beneficiaries"]');
  if (benBtn && needsBeneficiaries()) {
    benBtn.classList.remove('hidden');
  }
  enforceBeneficiaryFields();
}

// 5) Wire it up:
if (formElem) {
  formElem.addEventListener('submit', enforceBeneficiariesOnSubmit);
}
// run on load
document.addEventListener('DOMContentLoaded', () => {
  applyBeneficiaryOverride();
});
// re-run when registration type changes:
document.getElementById('registration_type')?.addEventListener('change', () => {
  updateNav();
  updateFields();
  clearAllHiddenSections();
  applyBeneficiaryOverride();
});
// also on your TOD buttons:
['todNoBtn','todYesBtn'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', () => {
    updateNav();
    updateFields();
    clearAllHiddenSections();
    applyBeneficiaryOverride();
  });
});
// and whenever you add a new row:
document.getElementById('addBeneficiary')?.addEventListener('click', enforceBeneficiaryFields);

// ─── 1) Non-Person toggle ────────────────────────────────────────────────
function applyNonPersonRule(row) {
  const rel = row.querySelector('select[name$="[Relationship]"]')?.value;
  const isNonPerson = rel === 'Non-Person';

  // — 1a) Hide & clear (and disable) First, Middle, Last, DOB
  ['[First Name]','[Middle Name]','[Last Name]','[Date Of Birth]']
    .forEach(suf => {
      const fld = row.querySelector(`[name$="${suf}"]`);
      if (!fld) return;
      const wrap = fld.closest('div');
      if (isNonPerson) {
        wrap.classList.add('hidden');
        fld.value = '';
        fld.required = false;
        fld.disabled = true;
      } else {
        wrap.classList.remove('hidden');
        fld.disabled = false;
        // required-ness will be set by enforceBeneficiaryFields()
      }
    });

  // — 1b) Show & require Entity Name
  const entDiv   = row.querySelector('.entity-name-container');
  const entInput = entDiv?.querySelector('input[name$="[Entity Name]"]');
  if (entDiv && entInput) {
    if (isNonPerson) {
      entDiv.classList.remove('hidden');
      entInput.disabled = false;
      entInput.required = true;
    } else {
      entDiv.classList.add('hidden');
      entInput.value = '';
      entInput.required = false;
      entInput.disabled = true;
    }
  }

  // — 1c) Swap SSN ↔ TIN label & placeholder (optional)
  const ssn = row.querySelector('input[name$="[SSN]"]');
  const lbl = ssn && row.querySelector(`label[for="${ssn.id}"]`);
  if (ssn && lbl) {
    if (isNonPerson) {
      lbl.innerText   = 'TIN';
      ssn.placeholder = 'TIN';
    } else {
      lbl.innerText   = 'SSN';
      ssn.placeholder = '123456789';
    }
  }
}

// ─── 2) Wire it up on every row ─────────────────────────────────────────
function initNonPersonLogic() {
  document.querySelectorAll('.beneficiary-entry').forEach(row => {
    // run immediately on load / after “Add”
    applyNonPersonRule(row);

    // then re-run whenever you change Relationship
    const relSel = row.querySelector('select[name$="[Relationship]"]');
    if (relSel) {
      relSel.addEventListener('change', () => {
        applyNonPersonRule(row);
        enforceBeneficiaryFields();   // reset only the true‐required flags
        showRequiredFieldsSummary();  // update the “what’s still missing” panel
      });
    }
  });
}

// ─── 3) Kick it off on load & after you add a row ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNonPersonLogic();
  enforceBeneficiaryFields();
  showRequiredFieldsSummary();
});
document.getElementById('addBeneficiary')
  ?.addEventListener('click', () => {
    // wait a tick for the new DOM to exist
    setTimeout(() => {
      initNonPersonLogic();
      enforceBeneficiaryFields();
      showRequiredFieldsSummary();
    },0);
  });
// ─── Only-Person vs Non-Person submit check ─────────────────────────────
function enforceBeneficiariesOnSubmit(evt) {
  if (!needsBeneficiaries()) return true;

  const rows = document.querySelectorAll('.beneficiary-entry');
  if (rows.length < 1) {
    evt.preventDefault();
    alert('At least one beneficiary is required.');
    return false;
  }

  for (let row of rows) {
    const rel = row.querySelector('select[name$="[Relationship]"]')?.value;
    const isNonPerson = rel === 'Non-Person';

    // pick which fields to validate per card
    const toCheck = isNonPerson
      ? ['Entity Name','Percentage','Type']
      : ['First Name','Last Name','Percentage','Relationship','Type'];

    for (let label of toCheck) {
      // build the CSS-selector suffix
      const suf = `[${label}]`;
      const fld = row.querySelector(`input[name$="${suf}"], select[name$="${suf}"]`);
      if (!fld || !fld.value.trim()) {
        evt.preventDefault();
        alert(`Each beneficiary must have ${label} filled out.`);
        fld?.focus();
        return false;
      }
    }
  }

  return true;
}

// wire it up (replace your old hookup)
if (formElem) {
  formElem.removeEventListener('submit', enforceBeneficiariesOnSubmit);
  formElem.addEventListener('submit', enforceBeneficiariesOnSubmit);
}

  // ─── WIRE ADDITIONAL HOLDER LOGIC ─────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    wireAdditionalHolderSection();
  });
  window.initNonPersonLogic        = initNonPersonLogic;
  window.enforceBeneficiaryFields  = enforceBeneficiaryFields;

  // ─── UTILITY: wipe out all inputs/selects/textareas in a container ───────────
  function clearFields(container) {
    if (!container) return;
    container.querySelectorAll('input, select, textarea').forEach(function (f) {
      if (f.type === 'checkbox' || f.type === 'radio') {
        f.checked = false;
      } else {
        f.value = '';
        if (f.tagName.toLowerCase() === 'select') {
          f.selectedIndex = 0;
        }
      }
      f.required = false;
    });
  }


  // ─── END OF SCRIPT ────────────────────────────────────────────────────────────
})();
