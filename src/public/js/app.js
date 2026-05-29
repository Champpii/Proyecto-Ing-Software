/**
   SISTEMA DE CONTROL DE ACCESO VEHICULAR UNIVERSITARIO
   FRONTEND CLIENT SPA CONTROLLER (Vanilla JS)
 */

// STATE MANAGEMENT
let appState = {
  currentTab: 'dashboard',
  user: null,
  activeTheme: 'light',
  // Wizard payment data
  paymentData: {
    nombre: '',
    cui: '',
    email: '',
    telefono: '',
    rol: '',
    placa: '',
    tipo_placa: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    tipo_marbete: '',
    plan: 'mensual' // default
  },
  // Drawers toggle
  drawers: {
    emails: false,
    webhooks: false
  }
};

// INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  // Check auth session
  const storedUser = localStorage.getItem('mrb_user');
  const storedTheme = localStorage.getItem('mrb_theme') || 'light';
  
  // Set theme
  if (storedTheme === 'dark') {
    document.body.classList.add('dark-theme');
    appState.activeTheme = 'dark';
    document.getElementById('theme-icon').className = 'ti ti-moon';
  } else {
    document.body.classList.remove('dark-theme');
    appState.activeTheme = 'light';
    document.getElementById('theme-icon').className = 'ti ti-sun';
  }

  // Live clock
  setInterval(updateClock, 1000);
  updateClock();

  if (storedUser) {
    appState.user = JSON.parse(storedUser);
    showAppLayout();
    showToast('success', 'Sesión Restaurada', `Bienvenido de nuevo, ${appState.user.name}`);
  } else {
    showLoginLayout();
  }

  // Load debugger counts initially
  if (appState.user) {
    refreshAllData();
  }
});

// CLOCK
function updateClock() {
  const clockEl = document.getElementById('current-time');
  if (clockEl) {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString('es-GT');
  }
}

// ----------------------------------
//   AUTHENTICATION & LAYOUT SWITCHES
// ----------------------------------
function showLoginLayout() {
  document.getElementById('page-login').classList.remove('hidden');
  document.getElementById('app-layout').classList.add('hidden');
}

function showAppLayout() {
  document.getElementById('page-login').classList.add('hidden');
  document.getElementById('app-layout').classList.remove('hidden');
  document.getElementById('display-username').innerText = appState.user.name;
  
  switchTab(appState.currentTab);
  refreshAllData();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  showGlobalLoader('Autenticando...');

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const data = await res.json();
    
    hideGlobalLoader();

    if (data.success) {
      appState.user = data.user;
      localStorage.setItem('mrb_user', JSON.stringify(data.user));
      showAppLayout();
      showToast('success', 'Ingreso Exitoso', `Acceso concedido como ${data.user.role}`);
    } else {
      showToast('danger', 'Error de Credenciales', data.message);
    }
  } catch (err) {
    hideGlobalLoader();
    showToast('danger', 'Error de Conexión', 'No se pudo conectar con el servidor.');
  }
}

function handleLogout() {
  localStorage.removeItem('mrb_user');
  appState.user = null;
  showToast('info', 'Sesión Cerrada', 'Ha salido del sistema de marbetes.');
  showLoginLayout();
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-theme');
  appState.activeTheme = isDark ? 'dark' : 'light';
  localStorage.setItem('mrb_theme', appState.activeTheme);
  
  const icon = document.getElementById('theme-icon');
  icon.className = isDark ? 'ti ti-moon' : 'ti ti-sun';
  
  showToast('info', 'Tema Modificado', `Activado el modo ${isDark ? 'oscuro' : 'claro'}`);
}

// ----------------------------------
//   TAB MANAGEMENT
// ----------------------------------
function switchTab(tabId) {
  appState.currentTab = tabId;
  
  // Update sidebar active buttons
  document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-target') === tabId);
  });

  // Show active page
  document.querySelectorAll('.main-content .app-page').forEach(page => {
    page.classList.toggle('active', page.getAttribute('id') === `page-${tabId}`);
  });

  // Set header titles
  const titles = {
    dashboard: { t: 'Panel de Control', s: 'Gestión e historial de accesos universitarios' },
    pago: { t: 'Pago de Marbete', s: 'Registro y adquisición de derecho vehicular digital' },
    consulta: { t: 'Consulta de Vehículo', s: 'Consulte vigencia, pagos e historial de garita por placa' },
    reimpresion: { t: 'Reimpresión de Factura', s: 'Generador de comprobante fiscal con QR para impresión' }
  };

  if (titles[tabId]) {
    document.getElementById('section-title').innerText = titles[tabId].t;
    document.getElementById('section-subtitle').innerText = titles[tabId].s;
  }

  // Specialized triggers when switching tabs
  if (tabId === 'dashboard') {
    refreshDashboardStats();
  }
  
  // Close drawers when navigating to clear visual focus
  closeDrawer('emails');
  closeDrawer('webhooks');
}

// ----------------------------------
//   TOASTS & LOADERS
// ----------------------------------
function showToast(type, title, message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'ti ti-circle-check',
    danger: 'ti ti-circle-x',
    info: 'ti ti-info-circle'
  };

  toast.innerHTML = `
    <div class="toast-icon"><i class="${icons[type]}"></i></div>
    <div class="toast-body">
      <h4>${title}</h4>
      <p>${message}</p>
    </div>
  `;

  container.appendChild(toast);

  // Animate slide out and remove
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function showGlobalLoader(text) {
  const el = document.getElementById('global-loader');
  document.getElementById('global-loader-text').innerText = text || 'Procesando...';
  el.classList.remove('hidden');
}

function hideGlobalLoader() {
  document.getElementById('global-loader').classList.add('hidden');
}

// ----------------------------------
//   DATA POLLING & REFRESHES
// ----------------------------------
function refreshAllData() {
  refreshDashboardStats();
  refreshDrawerEmails();
  refreshDrawerWebhooks();
}

async function refreshDashboardStats() {
  try {
    // We can query our database records via direct searches to count states
    const res = await fetch('/api/marbetes/consulta/P-001ABC'); // Carlos
    const res2 = await fetch('/api/marbetes/consulta/C-002DEF'); // Ana
    const res3 = await fetch('/api/marbetes/consulta/M-003GHI'); // Roberto

    const list = [];
    if (res.ok) list.push((await res.json()).marbete);
    if (res2.ok) list.push((await res2.json()).marbete);
    if (res3.ok) list.push((await res3.json()).marbete);

    // Let's pull some general counts dynamically
    let vigentes = 0;
    let porVencer = 0;
    let vencidos = 0;
    let totalRevenue = 1325; // Base default seeders payments count

    list.forEach(m => {
      if (!m) return;
      if (m.estado === 'Vigente') vigentes++;
      else if (m.estado === 'Por vencer') porVencer++;
      else vencidos++;
    });

    // Display counts
    document.getElementById('stat-vigentes').innerText = vigentes + 142; // Add mockup baseline offset
    document.getElementById('stat-por-vencer').innerText = porVencer + 17;
    document.getElementById('stat-vencidos').innerText = vencidos + 5;
    document.getElementById('stat-recaudacion').innerText = `Q${totalRevenue + 4850}`; // offset

    // Also populate recent access logs dynamically for audit panel
    const logsRes = await fetch('/api/marbetes/consulta/P-001ABC');
    if (logsRes.ok) {
      const logData = await logsRes.json();
      const logs = logData.accessLogs || [];
      const parent = document.getElementById('recent-audit-logs');
      parent.innerHTML = '';
      
      if (logs.length === 0) {
        parent.innerHTML = `<div class="empty-state"><i class="ti ti-history"></i><p>No se registran accesos recientes.</p></div>`;
        return;
      }

      logs.slice(0, 5).forEach(l => {
        const isAuth = l.estado_acceso === 'Autorizado';
        const indicatorClass = isAuth ? 'tl-auth' : 'tl-denied';
        const icon = isAuth ? 'ti ti-shield-check' : 'ti ti-shield-x';
        
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <div class="timeline-indicator ${indicatorClass}"><i class="${icon}"></i></div>
          <div class="timeline-body">
            <h4>${l.placa} <span class="time">${new Date(l.fecha_acceso).toLocaleTimeString('es-GT')}</span></h4>
            <p>${l.detalle} - ${l.garita}</p>
            <span class="detail-sub">${new Date(l.fecha_acceso).toLocaleDateString('es-GT')}</span>
          </div>
        `;
        parent.appendChild(item);
      });
    }

  } catch (e) {
    console.error('Error refreshing stats:', e);
  }
}

// ----------------------------------
//   WIZARD FLOW: PAGO DE MARBETE
// ----------------------------------
function handleRoleChange() {
  const role = document.getElementById('p-rol').value;
  // Trigger immediate price recalculation preview
  const prices = {
    Estudiante: { m: 50, a: 500 },
    Docente: { m: 75, a: 750 },
    Administrativo: { m: 75, a: 750 }
  };
  
  if (prices[role]) {
    document.getElementById('pricing-badge-rol').innerText = role;
    document.getElementById('val-price-mensual').innerText = prices[role].m;
    document.getElementById('val-price-anual').innerText = prices[role].a;
  }
}

function goToPaymentStep2(e) {
  if (e) e.preventDefault();
  
  // Collect fields
  const nombre = document.getElementById('p-nombre').value;
  const cui = document.getElementById('p-cui').value;
  const email = document.getElementById('p-email').value;
  const telefono = document.getElementById('p-telefono').value;
  const rol = document.getElementById('p-rol').value;
  const placa = document.getElementById('p-placa').value.trim().toUpperCase();
  const tipo_placa = document.getElementById('p-tipo-placa').value;
  const marca = document.getElementById('p-marca').value;
  const modelo = document.getElementById('p-modelo').value;
  const anio = document.getElementById('p-anio').value;
  const color = document.getElementById('p-color').value;

  if (!nombre || !cui || !email || !rol || !placa || !tipo_placa || !marca || !modelo) {
    showToast('danger', 'Campos Incompletos', 'Por favor complete todos los datos marcados con asterisco (*).');
    return;
  }

  // Populate state
  appState.paymentData = {
    ...appState.paymentData,
    nombre, cui, email, telefono, rol,
    placa, tipo_placa, marca, modelo, anio, color,
    tipo_marbete: rol // role sets category
  };

  // UI setups
  document.getElementById('sum-placa').innerText = placa;
  document.getElementById('sum-tipo-mrb').innerText = `Marbete ${rol}`;
  
  // Calculate projected date bounds
  const today = new Date();
  const expiry = new Date(today);
  if (appState.paymentData.plan === 'anual') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }

  document.getElementById('sum-vigencia').innerText = `${formatDate(today)} al ${formatDate(expiry)}`;
  
  // Update pricing visual elements
  handleRoleChange();
  selectPlanOption(appState.paymentData.plan);

  // Transition Wizard screens
  switchWizardPanel(2);
}

function goToPaymentStep1() {
  switchWizardPanel(1);
}

function selectPlanOption(plan) {
  appState.paymentData.plan = plan;
  
  const mCard = document.getElementById('pcard-mensual');
  const aCard = document.getElementById('pcard-anual');
  
  if (plan === 'anual') {
    aCard.classList.add('selected');
    mCard.classList.remove('selected');
  } else {
    mCard.classList.add('selected');
    aCard.classList.remove('selected');
  }

  // Update dates summary
  const today = new Date();
  const expiry = new Date(today);
  if (plan === 'anual') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  } else {
    expiry.setMonth(expiry.getMonth() + 1);
  }
  document.getElementById('sum-vigencia').innerText = `${formatDate(today)} al ${formatDate(expiry)}`;

  // Recalculate totals
  const role = appState.paymentData.rol;
  const prices = {
    Estudiante: { m: 50, a: 500 },
    Docente: { m: 75, a: 750 },
    Administrativo: { m: 75, a: 750 }
  };
  const price = plan === 'anual' ? prices[role].a : prices[role].m;
  
  document.getElementById('sum-total').innerText = `Q${price}.00`;
  document.getElementById('gateway-total-to-pay').innerText = `Q${price}.00`;
}

function goToPaymentStep3() {
  switchWizardPanel(3);
}

function goToPaymentStep2Back() {
  switchWizardPanel(2);
}

async function processTransaction(e) {
  e.preventDefault();
  
  const cardNum = document.getElementById('card-number').value;
  const holder = document.getElementById('card-holder').value;
  const expiry = document.getElementById('card-expiry').value;
  const cvv = document.getElementById('card-cvv').value;

  if (cardNum.length < 15 || holder.length < 4 || expiry.length < 5 || cvv.length < 3) {
    showToast('danger', 'Datos de Pago Inválidos', 'Verifique los datos de su tarjeta simulada.');
    return;
  }

  showGlobalLoader('Procesando cobro en pasarela...');

  try {
    // Send transaction packet to backend API
    const res = await fetch('/api/marbetes/pago', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...appState.paymentData,
        tarjeta_numero: cardNum
      })
    });
    
    const data = await res.json();
    hideGlobalLoader();

    if (data.success) {
      showToast('success', 'Pago Autorizado', 'Comprobante y QR generados.');
      
      // Load receipt sheet details
      document.getElementById('r-code').innerText = data.marbete.codigo;
      document.getElementById('r-date').innerText = new Date(data.marbete.desde).toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      document.getElementById('r-owner-name').innerText = data.owner.nombre;
      document.getElementById('r-owner-email').innerText = data.owner.email;
      document.getElementById('r-owner-cui').innerText = `DPI: ${data.owner.cui}`;
      document.getElementById('r-veh-desc').innerText = `${data.vehicle.marca} ${data.vehicle.modelo} (${data.vehicle.anio})`;
      document.getElementById('r-veh-placa').innerText = data.vehicle.placa;
      document.getElementById('r-veh-color').innerText = data.vehicle.color;
      document.getElementById('r-item-type').innerText = data.marbete.tipo;
      document.getElementById('r-item-validity').innerText = `${data.marbete.desde} al ${data.marbete.hasta}`;
      document.getElementById('r-item-plan').innerText = data.marbete.plan;
      document.getElementById('r-item-cost').innerText = `Q${data.monto}.00`;
      document.getElementById('r-txn-id').innerText = data.transactionId;
      
      // Load QR Code SVG into elements
      const qrHolder = document.getElementById('r-qr-svg');
      qrHolder.innerHTML = `<img src="${data.marbete.qrCode}" alt="QR code" />`;

      // Refresh stats, emails, webhooks immediately
      refreshAllData();

      // Show Step 4 screen
      switchWizardPanel(4);
    } else {
      showToast('danger', 'Transacción Denegada', data.message);
    }
  } catch (err) {
    hideGlobalLoader();
    showToast('danger', 'Error Transaccional', 'Ocurrió un error en el servidor al tramitar su pago.');
  }
}

function printReceipt() {
  window.print();
}

function resetWizard() {
  // Clear forms
  document.getElementById('form-pago-step1').reset();
  document.getElementById('form-gateway-payment').reset();
  
  // Reset paymentData state
  appState.paymentData = {
    nombre: '', cui: '', email: '', telefono: '', rol: '',
    placa: '', tipo_placa: '', marca: '', modelo: '', anio: '', color: '',
    tipo_marbete: '', plan: 'mensual'
  };

  switchWizardPanel(1);
}

function switchWizardPanel(stepNum) {
  // Hide all screens
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`pago-panel-${i}`).classList.add('hidden');
    
    const stepEl = document.getElementById(`wstep-${i}`);
    stepEl.classList.remove('active', 'done');
    
    if (i < stepNum) {
      stepEl.classList.add('done');
    } else if (i === stepNum) {
      stepEl.classList.add('active');
    }
  }
  
  // Show active screen
  document.getElementById(`pago-panel-${stepNum}`).classList.remove('hidden');
}

// ----------------------------------
//   MÓDULO: CONSULTA DE PLACA
// ----------------------------------
function fillAndSearch(placa) {
  document.getElementById('q-plate-number').value = placa;
  executePlateQuery();
}

async function executePlateQuery() {
  const tipo = document.getElementById('q-plate-type').value;
  const placa = document.getElementById('q-plate-number').value.trim().toUpperCase();

  if (!placa) {
    showToast('danger', 'Búsqueda Invalida', 'Debe ingresar un número de placa.');
    return;
  }

  showGlobalLoader('Buscando registro vehicular...');

  try {
    const res = await fetch(`/api/marbetes/consulta/${placa}`);
    const data = await res.json();
    
    hideGlobalLoader();

    if (!data.success) {
      showToast('danger', 'No Encontrado', data.message);
      document.getElementById('query-results-panel').classList.add('hidden');
      document.getElementById('query-empty-panel').classList.remove('hidden');
      return;
    }

    // Plate found, show details
    document.getElementById('query-empty-panel').classList.add('hidden');
    document.getElementById('query-results-panel').classList.remove('hidden');

    // Headers
    document.getElementById('res-tipo-placa').innerText = data.vehicle.tipo_placa;
    document.getElementById('res-placa').innerText = data.vehicle.placa;
    
    // Status badge style
    const badge = document.getElementById('res-status-badge');
    badge.innerText = data.marbete ? data.marbete.estado : 'SIN CONTRATO';
    badge.className = 'badge';
    
    if (data.marbete) {
      if (data.marbete.estado === 'Vigente') badge.classList.add('badge-success');
      else if (data.marbete.estado === 'Por vencer') badge.classList.add('badge-warning');
      else badge.classList.add('badge-danger');
    } else {
      badge.classList.add('badge-danger');
    }

    // Fields
    document.getElementById('res-nombre').innerText = data.owner ? data.owner.nombre : 'No asignado';
    document.getElementById('res-rol').innerText = data.owner ? data.owner.rol : 'N/A';
    document.getElementById('res-cui').innerText = data.owner ? data.owner.cui : 'N/A';
    document.getElementById('res-email').innerText = data.owner ? data.owner.email : 'N/A';
    document.getElementById('res-vehiculo').innerText = `${data.vehicle.marca} ${data.vehicle.modelo} (${data.vehicle.anio})`;
    document.getElementById('res-color').innerText = data.vehicle.color || 'N/A';
    
    document.getElementById('res-codigo-mrb').innerText = data.marbete ? data.marbete.codigo_marbete : 'SIN MARBETE ACTIVO';
    document.getElementById('res-plan').innerText = data.marbete ? data.marbete.plan : 'N/A';
    document.getElementById('res-desde').innerText = data.marbete ? data.marbete.fecha_emision : 'N/A';
    document.getElementById('res-hasta').innerText = data.marbete ? data.marbete.fecha_caducidad : 'N/A';

    // Projected photo description
    const photoBox = document.getElementById('vehicle-photo-box');
    photoBox.innerHTML = `
      <i class="ti ti-car"></i>
      <span style="font-family: var(--font-title); font-size: 16px; font-weight: 700; margin-top: 8px;">${data.vehicle.marca} ${data.vehicle.modelo}</span>
      <span style="font-size: 11px; opacity: 0.7; font-family: var(--font-mono);">${data.vehicle.placa}</span>
    `;

    // Progress timeline and status calculation
    const progressFill = document.getElementById('res-progress-bar');
    const progressLabel = document.getElementById('res-percentage');
    const progressDays = document.getElementById('res-days-sub');

    if (data.marbete) {
      const days = data.marbete.diasRestantes;
      const isAnnual = data.marbete.plan === 'Anual';
      const pct = days < 0 ? 0 : Math.min(100, Math.round((days / (isAnnual ? 365 : 30)) * 100));
      
      progressFill.style.width = `${pct}%`;
      progressLabel.innerText = `${pct}%`;
      
      // Color matching states
      if (data.marbete.estado === 'Vencido') {
        progressFill.style.backgroundColor = 'var(--danger)';
        progressDays.innerText = `Marbete vencido hace ${Math.abs(days)} días. Acceso denegado.`;
        progressDays.className = 'progress-days-sub text-danger';
      } else if (data.marbete.estado === 'Por vencer') {
        progressFill.style.backgroundColor = 'var(--warning)';
        progressDays.innerText = `Acceso autorizado. El marbete expirará en ${days} días.`;
        progressDays.className = 'progress-days-sub text-warning';
      } else {
        progressFill.style.backgroundColor = 'var(--success)';
        progressDays.innerText = `Acceso autorizado. ${days} días restantes de vigencia.`;
        progressDays.className = 'progress-days-sub text-success';
      }
    } else {
      progressFill.style.width = '0%';
      progressLabel.innerText = '0%';
      progressDays.innerText = 'No se registran datos de marbete contratados.';
      progressDays.className = 'progress-days-sub text-muted';
    }

    // Payments Table mapping
    const payTable = document.getElementById('res-payments-table');
    payTable.innerHTML = '';
    const payments = data.payments || [];
    
    if (payments.length === 0) {
      payTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No se registran transacciones de pago.</td></tr>`;
    } else {
      payments.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="font-mono">${p.transaccion_id}</td>
          <td>${p.fecha_pago}</td>
          <td style="text-transform: capitalize;">${p.plan_tipo}</td>
          <td class="font-bold text-primary">Q${p.monto}.00</td>
          <td><span class="badge badge-success-soft"><i class="ti ti-circle-check"></i> ${p.estado_pago}</span></td>
        `;
        payTable.appendChild(row);
      });
    }

    // Entrance/Exit logs mapping
    const auditTimeline = document.getElementById('res-audit-timeline');
    auditTimeline.innerHTML = '';
    const auditLogs = data.accessLogs || [];
    
    if (auditLogs.length === 0) {
      auditTimeline.innerHTML = `<div class="empty-state"><i class="ti ti-history"></i><p>No se registran pasos en garita.</p></div>`;
    } else {
      auditLogs.forEach(l => {
        const isAuth = l.estado_acceso === 'Autorizado';
        const indicatorClass = isAuth ? 'tl-auth' : 'tl-denied';
        const icon = isAuth ? 'ti ti-shield-check' : 'ti ti-shield-x';
        
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
          <div class="timeline-indicator ${indicatorClass}"><i class="${icon}"></i></div>
          <div class="timeline-body">
            <h4>${l.garita} <span class="time">${new Date(l.fecha_acceso).toLocaleTimeString('es-GT')}</span></h4>
            <p>${l.detalle}</p>
            <span class="detail-sub">${new Date(l.fecha_acceso).toLocaleDateString('es-GT')}</span>
          </div>
        `;
        auditTimeline.appendChild(item);
      });
    }

  } catch (err) {
    hideGlobalLoader();
    showToast('danger', 'Error de Consulta', 'No se pudo consultar el marbete por placa.');
  }
}

function triggerReprintFromQuery() {
  const placa = document.getElementById('res-placa').innerText;
  if (placa && placa !== 'P-000XXX') {
    fillAndSearchReprint(placa);
  }
}

// ----------------------------------
//   MÓDULO: REIMPRESIÓN
// ----------------------------------
function fillAndSearchReprint(placa) {
  document.getElementById('r-plate-search').value = placa;
  switchTab('reimpresion');
  executeReprintQuery();
}

async function executeReprintQuery() {
  const placa = document.getElementById('r-plate-search').value.trim().toUpperCase();

  if (!placa) {
    showToast('danger', 'Campo Requerido', 'Por favor ingrese una placa vehicular.');
    return;
  }

  showGlobalLoader('Compilando factura oficial...');

  try {
    const res = await fetch(`/api/marbetes/consulta/${placa}`);
    const data = await res.json();
    
    hideGlobalLoader();

    if (!data.success) {
      showToast('danger', 'No Encontrado', data.message);
      document.getElementById('reprint-results-panel').classList.add('hidden');
      document.getElementById('reprint-empty-panel').classList.remove('hidden');
      return;
    }

    if (!data.marbete) {
      showToast('danger', 'Sin Marbete', 'El vehículo está registrado pero no posee derecho de marbete para facturar.');
      return;
    }

    // Populate invoice fields
    document.getElementById('reprint-empty-panel').classList.add('hidden');
    document.getElementById('reprint-results-panel').classList.remove('hidden');

    const cleanPlaca = data.vehicle.placa.replace(/[^A-Z0-9]/g, '');
    document.getElementById('i-invoice-number').innerText = `FAC-2026-${cleanPlaca.substring(0, 6)}`;
    document.getElementById('i-invoice-date').innerText = `Fecha: ${data.marbete.desde}`;
    
    // Owner
    document.getElementById('i-owner-name').innerText = data.owner.nombre;
    document.getElementById('i-owner-cui').innerText = data.owner.cui;
    document.getElementById('i-owner-rol').innerText = data.owner.rol;
    document.getElementById('i-owner-email').innerText = data.owner.email;
    
    // Veh
    document.getElementById('i-veh-placa').innerText = data.vehicle.placa;
    document.getElementById('i-veh-tipo-placa').innerText = data.vehicle.tipo_placa;
    document.getElementById('i-veh-desc').innerText = `${data.vehicle.marca} ${data.vehicle.modelo} (${data.vehicle.anio})`;
    document.getElementById('i-veh-color').innerText = data.vehicle.color;
    
    // Marbete details
    document.getElementById('i-mrb-code').innerText = data.marbete.codigo_marbete;
    document.getElementById('i-mrb-type').innerText = data.marbete.tipo;
    document.getElementById('i-mrb-plan').innerText = data.marbete.plan;
    document.getElementById('i-mrb-desde').innerText = data.marbete.desde;
    document.getElementById('i-mrb-hasta').innerText = data.marbete.hasta;

    const statusBadge = document.getElementById('i-mrb-status');
    statusBadge.innerText = data.marbete.estado;
    statusBadge.className = 'badge';
    if (data.marbete.estado === 'Vigente') statusBadge.classList.add('badge-success');
    else if (data.marbete.estado === 'Por vencer') statusBadge.classList.add('badge-warning');
    else statusBadge.classList.add('badge-danger');

    // Costs
    const pay = data.payments[0] || { monto: 750 }; // default baseline if mock missing
    document.getElementById('i-item-total').innerText = `Q${pay.monto}.00`;
    document.getElementById('i-grand-total').innerText = `Q${pay.monto}.00`;

    // QR Code
    document.getElementById('i-qr-svg').innerHTML = `<img src="${data.marbete.qrCode}" alt="QR code" />`;
    document.getElementById('i-qr-url').innerText = data.marbete.verificationUrl;

    showToast('info', 'Factura Generada', 'La hoja de impresión está disponible para descargar o imprimir.');

  } catch (err) {
    hideGlobalLoader();
    showToast('danger', 'Error de Reimpresión', 'No se pudo generar la factura imprimible.');
  }
}

// ----------------------------------
//   DATABASE RESET
// ----------------------------------
async function resetDatabase() {
  if (!confirm('¿Está seguro de reiniciar la base de datos de la demo? Se restaurarán los 3 vehículos de prueba iniciales y se borrarán todas las nuevas transacciones y notificaciones.')) {
    return;
  }

  showGlobalLoader('Restableciendo base de datos...');

  try {
    const res = await fetch('/api/db/reset', { method: 'POST' });
    const data = await res.json();
    
    hideGlobalLoader();

    if (data.success) {
      showToast('success', 'Base de Datos Reiniciada', data.message);
      
      // Reset interfaces
      resetWizard();
      document.getElementById('query-results-panel').classList.add('hidden');
      document.getElementById('query-empty-panel').classList.remove('hidden');
      document.getElementById('reprint-results-panel').classList.add('hidden');
      document.getElementById('reprint-empty-panel').classList.remove('hidden');

      refreshAllData();
      switchTab('dashboard');
    }
  } catch (e) {
    hideGlobalLoader();
    showToast('danger', 'Error al Reiniciar', 'No se pudo reiniciar la base de datos.');
  }
}

// ----------------------------------
//   FLOATING INSPECTOR DRAWERS
// ----------------------------------
function toggleDrawer(type) {
  const panel = document.getElementById(`drawer-${type}`);
  const isCurrentlyOpen = panel.classList.contains('open');
  
  // Close both drawers first
  closeDrawer('emails');
  closeDrawer('webhooks');
  
  // Open only if it wasn't open
  if (!isCurrentlyOpen) {
    panel.classList.add('open');
    appState.drawers[type] = true;
    
    // Refresh content based on type
    if (type === 'emails') refreshDrawerEmails();
    if (type === 'webhooks') refreshDrawerWebhooks();
  }
}

function closeDrawer(type) {
  const panel = document.getElementById(`drawer-${type}`);
  if (panel) {
    panel.classList.remove('open');
    appState.drawers[type] = false;
  }
}

async function refreshDrawerEmails() {
  try {
    const res = await fetch('/api/notifications/emails');
    const data = await res.json();
    if (data.success) {
      const list = data.emails || [];
      document.getElementById('count-emails').innerText = list.length;
      
      const parent = document.getElementById('drawer-emails-content');
      parent.innerHTML = '';
      
      if (list.length === 0) {
        parent.innerHTML = `
          <div class="empty-state">
            <i class="ti ti-mail-forward"></i>
            <p>No se registran correos salientes en la cola de notificaciones.</p>
          </div>
        `;
        return;
      }

      list.forEach(mail => {
        const item = document.createElement('div');
        item.className = 'mock-email-item animate-fade-in';
        item.innerHTML = `
          <div class="email-meta">
            <div>
              Para: <strong class="email-to">${mail.to}</strong>
            </div>
            <span class="email-time">${new Date(mail.timestamp).toLocaleTimeString('es-GT')}</span>
          </div>
          <div style="padding: 6px 16px; font-weight: 600; font-size: 11px; border-bottom: 0.5px solid var(--border-color);">
            Asunto: <span class="email-subject">${mail.subject}</span>
          </div>
          <div class="email-body-preview">
            ${mail.body}
          </div>
        `;
        parent.appendChild(item);
      });
    }
  } catch (err) {
    console.error('Error fetching mock emails:', err);
  }
}

async function refreshDrawerWebhooks() {
  try {
    const res = await fetch('/api/notifications/webhooks');
    const data = await res.json();
    if (data.success) {
      const list = data.webhooks || [];
      document.getElementById('count-webhooks').innerText = list.length;
      
      const parent = document.getElementById('drawer-webhooks-content');
      parent.innerHTML = '';
      
      if (list.length === 0) {
        parent.innerHTML = `
          <div class="empty-state">
            <i class="ti ti-webhook-off"></i>
            <p>No se registran ejecuciones de webhooks disparadas en la demo.</p>
          </div>
        `;
        return;
      }

      list.forEach(wh => {
        const item = document.createElement('div');
        item.className = 'mock-webhook-item animate-fade-in';
        
        // Pretty print payload JSON
        const payloadStr = JSON.stringify(wh.payload, null, 2);
        
        item.innerHTML = `
          <div class="webhook-meta">
            <div>
              POST -> <span class="wh-url">${wh.url}</span>
            </div>
            <div>
              Estado: <span class="wh-status">${wh.status}</span>
            </div>
            <span class="wh-time">${new Date(wh.timestamp).toLocaleTimeString('es-GT')}</span>
          </div>
          <pre class="webhook-payload-box">${payloadStr}</pre>
        `;
        parent.appendChild(item);
      });
    }
  } catch (err) {
    console.error('Error fetching mock webhooks:', err);
  }
}

// ----------------------------------
//   INPUT FORMATTING HELPERS
// ----------------------------------
function formatDate(d) {
  return d.toLocaleDateString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatCardNumber(input) {
  let v = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  let matches = v.match(/\d{4,16}/g);
  let match = (matches && matches[0]) || '';
  let parts = [];

  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }

  if (parts.length > 0) {
    input.value = parts.join(' ');
  } else {
    input.value = v;
  }
}

function formatExpiry(input) {
  let v = input.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    input.value = v.substring(0, 2) + '/' + v.substring(2, 4);
  } else {
    input.value = v;
  }
}

function formatCVV(input) {
  input.value = input.value.replace(/[^0-9]/gi, '');
}
