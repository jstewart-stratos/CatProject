import { useState, useEffect } from 'react';

interface FormRule {
  "Account Type": string;
  "Program Type": string;
  "Registration Type": string;
  [key: string]: boolean | string;
}

interface FieldVisibility {
  isVisible: boolean;
  isRequired: boolean;
}

export function useFormLogic() {
  const [formRules, setFormRules] = useState<FormRule[]>([]);
  const [currentRule, setCurrentRule] = useState<FormRule | null>(null);

  // Load form logic configuration
  useEffect(() => {
    fetch('/static/form-logic.json')
      .then(response => response.json())
      .then(data => setFormRules(data))
      .catch(error => console.error('Failed to load form logic:', error));
  }, []);

  // Get field visibility and validation rules based on current selections
  const getFieldRules = (
    accountType?: string,
    programType?: string,
    registrationType?: string
  ): Record<string, FieldVisibility> => {
    if (!accountType || !programType || !registrationType) {
      return {};
    }

    const rule = formRules.find(r =>
      r['Account Type'] === accountType &&
      r['Program Type'] === programType &&
      r['Registration Type'] === registrationType
    );

    if (!rule) {
      return {};
    }

    setCurrentRule(rule);

    const fieldRules: Record<string, FieldVisibility> = {};

    // Process all unhide/require rules
    Object.keys(rule).forEach(key => {
      if (key.startsWith('Unhide ')) {
        const fieldName = key.replace('Unhide ', '');
        const requireKey = `Require ${fieldName}`;
        
        fieldRules[fieldName] = {
          isVisible: rule[key] === true,
          isRequired: rule[requireKey] === true
        };
      }
    });

    return fieldRules;
  };

  // Check if a specific field should be visible
  const isFieldVisible = (fieldName: string, accountType?: string, programType?: string, registrationType?: string): boolean => {
    const rules = getFieldRules(accountType, programType, registrationType);
    return rules[fieldName]?.isVisible ?? false;
  };

  // Check if a specific field should be required
  const isFieldRequired = (fieldName: string, accountType?: string, programType?: string, registrationType?: string): boolean => {
    const rules = getFieldRules(accountType, programType, registrationType);
    return rules[fieldName]?.isRequired ?? false;
  };

  return {
    formRules,
    currentRule,
    getFieldRules,
    isFieldVisible,
    isFieldRequired
  };
}

// Employment status logic for conditional industry requirements
export function useEmploymentLogic() {
  const getIndustryRequirement = (status: string): boolean => {
    // Based on the JS logic: certain statuses don't require industry
    const statusesWithoutIndustry = ['Minor', 'Retired', 'Student', 'Homemaker'];
    return !statusesWithoutIndustry.includes(status);
  };

  const getDefaultIndustry = (status: string): string => {
    const statusesWithoutIndustry = ['Minor', 'Retired', 'Student', 'Homemaker'];
    return statusesWithoutIndustry.includes(status) ? status : '';
  };

  return {
    getIndustryRequirement,
    getDefaultIndustry
  };
}

// Investment experience conditional logic
export function useInvestmentLogic() {
  const shouldShowExperienceFields = (hasExperience: string): boolean => {
    return hasExperience === 'Yes';
  };

  const shouldShowFinancialBreakdown = (hasOtherInvestments: string): boolean => {
    return hasOtherInvestments === 'Yes';
  };

  // Validate percentage totals for financial information
  const validatePercentageTotal = (percentages: Record<string, string>): { isValid: boolean; total: number } => {
    const total = Object.values(percentages)
      .filter(val => val && !isNaN(Number(val)))
      .reduce((sum, val) => sum + Number(val), 0);
    
    return {
      isValid: Math.abs(total - 100) < 0.01, // Allow for small floating point errors
      total
    };
  };

  return {
    shouldShowExperienceFields,
    shouldShowFinancialBreakdown,
    validatePercentageTotal
  };
}

// Client type conditional logic
export function useClientTypeLogic() {
  const isEntityClient = (clientType: string): boolean => {
    return clientType?.toLowerCase() === 'entity';
  };

  const getRequiredFieldsForClientType = (clientType: string): string[] => {
    if (isEntityClient(clientType)) {
      return ['entityName', 'taxId', 'stateOfIncorporation'];
    }
    return ['firstName', 'lastName', 'ssn', 'dateOfBirth'];
  };

  return {
    isEntityClient,
    getRequiredFieldsForClientType
  };
}