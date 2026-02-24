console.log('hello');

(function () {
  const tabs = document.querySelectorAll('.tab[data-target]');
  const panels = document.querySelectorAll('.panel[data-panel]');

  function setActive(target) {
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.target === target);
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.panel === target;
      panel.hidden = !isActive;
      panel.classList.toggle('active', isActive);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActive(tab.dataset.target);
    });
  });

  setActive('invoice-data');

  // --- Basic details: issue date & due date (ISO 8601, 14-day rule, no past due) ---
  const issueDateInput = document.getElementById('issue-date');
  const dueDateInput = document.getElementById('due-date');

  if (issueDateInput && dueDateInput) {
    function toISO(date) {
      return date.toISOString().slice(0, 10);
    }

    function todayISO() {
      return toISO(new Date());
    }

    function addDays(date, days) {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      return d;
    }

    let dueDateManuallySet = false;

    // Defaults: issue = today, due = today + 14
    function setDefaults() {
      const today = todayISO();
      const dueDefault = toISO(addDays(new Date(), 14));
      issueDateInput.value = today;
      dueDateInput.value = dueDefault;
      updateDueMin();
    }

    function updateDueMin() {
      const today = todayISO();
      const issue = issueDateInput.value || today;
      // Due date cannot be in the past; also should not be before issue date
      const minDue = issue > today ? issue : today;
      dueDateInput.min = minDue;
    }

    const dueDateUpdatingEl = document.getElementById('due-date-updating');

    function setDueFromIssue() {
      if (dueDateManuallySet) return;
      const issue = issueDateInput.value;
      if (!issue) return;
      if (dueDateUpdatingEl) {
        dueDateUpdatingEl.hidden = false;
        dueDateUpdatingEl.textContent = 'Updating…';
      }
      const due = toISO(addDays(new Date(issue + 'T12:00:00'), 14));
      dueDateInput.value = due;
      updateDueMin();
      if (dueDateUpdatingEl) {
        setTimeout(function () {
          dueDateUpdatingEl.hidden = true;
        }, 400);
      }
    }

    setDefaults();
    updateDueMin();

    function onIssueDateChange() {
      updateDueMin();
      setDueFromIssue();
    }

    issueDateInput.addEventListener('input', onIssueDateChange);
    issueDateInput.addEventListener('change', onIssueDateChange);

    dueDateInput.addEventListener('change', function () {
      dueDateManuallySet = true;
    });

  }
})();
