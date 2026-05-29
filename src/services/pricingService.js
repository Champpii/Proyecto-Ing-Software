/**
 * Service to calculate pricing and validity dates based on institution role and payment plan.
 */

export const pricingService = {
  /**
   * Get pricing structure based on role
   * @param {string} role - Estudiante | Docente | Administrativo
   * @returns {{ monthly: number, annual: number }}
   */
  getPricingByRole: (role) => {
    const normRole = (role || '').trim().toLowerCase();
    
    if (normRole === 'estudiante') {
      return { monthly: 50, annual: 500 };
    }
    
    // Docente, Administrativo, and others default to Q75 / Q750
    return { monthly: 75, annual: 750 };
  },

  /**
   * Calculate cost based on role and plan
   * @param {string} role - Estudiante | Docente | Administrativo
   * @param {string} plan - mensual | anual
   * @returns {number}
   */
  calculateCost: (role, plan) => {
    const prices = pricingService.getPricingByRole(role);
    const isAnnual = (plan || '').trim().toLowerCase() === 'anual';
    
    return isAnnual ? prices.annual : prices.monthly;
  },

  /**
   * Calculate emission and expiration dates based on today's date and selected plan
   * @param {string} plan - mensual | anual
   * @returns {{ emissionDate: Date, expiryDate: Date }}
   */
  calculateValidityDates: (plan) => {
    const today = new Date();
    const expiry = new Date(today);
    
    const isAnnual = (plan || '').trim().toLowerCase() === 'anual';
    
    if (isAnnual) {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    
    return {
      emissionDate: today,
      expiryDate: expiry
    };
  },

  /**
   * Determine status based on expiration date
   * @param {string|Date} expiryDate 
   * @returns {{ estado: string, diasRestantes: number }}
   */
  getStatusAndDaysRemaining: (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    
    // Clear hours to count full days
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let estado = 'Vigente';
    if (diffDays < 0) {
      estado = 'Vencido';
    } else if (diffDays <= 7) {
      estado = 'Por vencer';
    }
    
    return {
      estado,
      diasRestantes: diffDays
    };
  }
};
