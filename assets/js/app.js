/**
 * Invoice App - Main Application
 * Integrates PEPPOL BIS Billing 3.0 modules
 */

(function() {
  'use strict';

  console.log('hello');

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

  // Initialize application
  function init() {
    console.log('Invoice App initializing...');
    
    if (!checkModules()) {
      document.getElementById('app').innerHTML = 
        '<p style="color: #ef4444;">Error: Required modules not loaded. Please check console.</p>';
      return;
    }

    // Create default draft
    const draft = window.InvioState.createDefaultDraft();
    console.log('Default invoice draft created:', draft);

    // Display application ready message
    document.getElementById('app').innerHTML = `
      <div style="padding: 1rem;">
        <h3 style="color: #10b981; margin-bottom: 1rem;">✓ Application Ready</h3>
        <p style="margin-bottom: 0.5rem;"><strong>Loaded Modules:</strong></p>
        <ul style="margin-left: 1.5rem; color: #475569;">
          <li>State Management (InvioState)</li>
          <li>Calculation Engine (InvioCalc)</li>
          <li>Validation (InvioValidation)</li>
          <li>XML Export (InvioXML)</li>
        </ul>
        <p style="margin-top: 1rem; color: #64748b;">
          Invoice form UI coming soon...
        </p>
      </div>
    `;
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
