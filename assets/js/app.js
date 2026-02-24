/**
 * Invoice App - Main Application
 * Integrates PEPPOL BIS Billing 3.0 modules with Figma UI
 */

(function() {
  'use strict';

  console.log('hello');

  // Application state
  let draft = null;

  // Check if all required modules are loaded
  function checkModules() {
    const modules = {
      'InvioState': window.InvioState,
      'InvioCalc': window.InvioCalc,
      'InvioValidation': window.InvioValidation,
      'InvioXML': window.InvioXML
    };

    const missing = [];
    for (const [name, module] of Object.entries(modules)) {
      if (!module) {
        missing.push(name);
      }
    }

    if (missing.length > 0) {
      console.error('Missing required modules:', missing);
      return false;
    }

    console.log('✓ All PEPPOL modules loaded successfully');
    return true;
  }

  // Initialize form with default values
  function initializeForm() {
    draft = window.InvioState.createDefaultDraft();
    
    // Set default values in form
    const today = new Date().toISOString().slice(0, 10);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    
    document.getElementById('invoice-number').value = draft.header.invoiceNumber;
    document.getElementById('issue-date').value = today;
    document.getElementById('due-date').value = dueDate.toISOString().slice(0, 10);
    
    console.log('Form initialized with default draft:', draft);
  }

  // Handle tab switching
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        tabs.forEach(t => t.classList.remove('tab-active'));
        this.classList.add('tab-active');
        console.log('Switched to tab:', this.dataset.tab);
      });
    });
  }

  // Handle form inputs
  function setupFormHandlers() {
    // Invoice number
    document.getElementById('invoice-number').addEventListener('input', function(e) {
      draft.header.invoiceNumber = e.target.value;
      console.log('Invoice number updated:', e.target.value);
    });

    // Payment reference
    document.getElementById('payment-reference').addEventListener('input', function(e) {
      draft.header.buyerReference = e.target.value;
      console.log('Payment reference updated:', e.target.value);
    });

    // Issue date
    document.getElementById('issue-date').addEventListener('change', function(e) {
      draft.header.issueDate = e.target.value;
      console.log('Issue date updated:', e.target.value);
    });

    // Due date
    document.getElementById('due-date').addEventListener('change', function(e) {
      draft.header.dueDate = e.target.value;
      console.log('Due date updated:', e.target.value);
    });
  }

  // Handle create invoice button
  function setupCreateInvoice() {
    const createBtn = document.querySelector('.cta-section .btn-primary');
    if (createBtn) {
      createBtn.addEventListener('click', function() {
        console.log('Creating invoice...');
        
        // Validate draft
        const validation = window.InvioValidation.validateForExport(draft);
        
        if (!validation.valid) {
          console.error('Validation errors:', validation.errors);
          alert('Please fill in all required fields:\n\n' + validation.errors.join('\n'));
          return;
        }

        // Generate XML
        const result = window.InvioXML.generateAndDownloadXML(draft);
        
        if (result.ok) {
          console.log('✓ Invoice generated successfully');
          alert('Invoice generated successfully!');
        } else {
          console.error('Failed to generate invoice:', result.errors);
          alert('Failed to generate invoice:\n\n' + result.errors.join('\n'));
        }
      });
    }
  }

  // Initialize application
  function init() {
    console.log('Invoice App initializing...');
    
    if (!checkModules()) {
      alert('Error: Required modules not loaded. Please check console.');
      return;
    }

    initializeForm();
    setupTabs();
    setupFormHandlers();
    setupCreateInvoice();

    console.log('✓ Invoice App initialized successfully');
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
