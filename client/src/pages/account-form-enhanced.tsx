import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2, FileText, Users, CreditCard, Settings, Shield, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";

// Enhanced form schema based on reference design
const accountFormSchema = z.object({
  clientId: z.number().min(1, "Client selection is required"),
  repId: z.string().min(1, "Rep ID is required"),
  notes: z.string().optional(),
  accountType: z.string().min(1, "Account Type is required"),
  programType: z.string().min(1, "Program Type is required"),
  registrationType: z.string().min(1, "Registration Type is required"),
  deliveringFirm: z.string().optional(),
  contraAccount: z.string().optional(),
  iraType: z.string().optional(),
  transferOnDeath: z.enum(["Yes", "No"]).default("No"),
  investmentObjective: z.string().min(1, "Investment Objective is required"),
  approximateAccountValue: z.string().optional(),
  expectedAccountValue: z.string().optional(),
  advisoryBillingCycle: z.string().optional(),
  // IRA-specific fields
  decedentName: z.string().optional(),
  dateOfDeath: z.string().optional(),
  distributionTypes: z.string().optional(),
  investmentTimeHorizon: z.string().min(1, "Investment Time Horizon is required"),
  fundsNeededIn: z.string().optional(),
  // ACH Information
  achAccounts: z.array(z.object({
    bankName: z.string(),
    routingNumber: z.string(),
    accountNumber: z.string(),
    accountType: z.enum(["Checking", "Savings"]),
    bankAccountRegistration: z.string(),
    onDemand: z.boolean().default(false),
    periodic: z.boolean().default(false),
  })).default([]),
  // Beneficiaries
  beneficiaries: z.array(z.object({
    relationship: z.string(),
    type: z.string(),
    firstName: z.string(),
    middleName: z.string().optional(),
    lastName: z.string(),
    entityName: z.string().optional(),
    percentage: z.number().min(0).max(100),
    dateOfBirth: z.string().optional(),
    ssn: z.string().optional(),
  })).default([]),
  // Additional Holder
  additionalHolder: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    homePhone: z.string().optional(),
    mobilePhone: z.string().optional(),
    businessPhone: z.string().optional(),
    employmentStatus: z.string().optional(),
    industry: z.string().optional(),
    occupation: z.string().optional(),
    employerName: z.string().optional(),
    useSameAddress: z.boolean().default(false),
    excludeEmployerAddress: z.boolean().default(false),
    employerAddress1: z.string().optional(),
    employerAddress2: z.string().optional(),
    employerCity: z.string().optional(),
    employerState: z.string().optional(),
    employerZip: z.string().optional(),
  }).optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

// Navigation sections for sidebar
const navigationSections = [
  { id: "accountInfo", label: "Account Information", icon: FileText },
  { id: "achInfo", label: "ACH Information", icon: CreditCard },
  { id: "beneficiaries", label: "Beneficiaries", icon: Users },
  { id: "additionalHolder", label: "Additional Holder", icon: Users },
  { id: "tradingAuthority", label: "Trading Authority", icon: Shield },
  { id: "specialAccounts", label: "Special Accounts", icon: Settings },
];

export default function AccountFormEnhanced() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState("accountInfo");
  const [completedSections, setCompletedSections] = useState<string[]>([]);
  
  // Get clientId from URL params
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('clientId') ? parseInt(params.get('clientId')!) : undefined;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      clientId: clientId || undefined,
      transferOnDeath: "No",
      achAccounts: [],
      beneficiaries: [],
    },
  });

  // Fetch dropdown lists
  const { data: lists } = useQuery({
    queryKey: ["/api/lists"],
  });

  // Fetch clients for selection
  const { data: clientsData } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Watch form values for conditional logic
  const watchedValues = form.watch();
  const accountType = watchedValues.accountType;
  const programType = watchedValues.programType;
  const registrationType = watchedValues.registrationType;
  const transferOnDeath = watchedValues.transferOnDeath;

  // Reset program type and registration type when account type changes
  useEffect(() => {
    if (accountType) {
      // Reset dependent fields when account type changes
      form.setValue('programType', '');
      form.setValue('registrationType', '');
    }
  }, [accountType, form]);

  // Get filtered program types based on account type - use useMemo for proper re-rendering
  const filteredProgramTypes = useMemo(() => {
    if (!accountType) return [];
    
    const programTypeMap: { [key: string]: string[] } = {
      'Individual': [
        'Brokerage',
        'Direct Business',
        'Manager Select',
        'Manager Access Network',
        'Manager Access Select',
        'MWP',
        'MWP RIA',
        'OMP - Advisory',
        'OMP RIA',
        'PWP',
        'PWP RIA',
        'SAM',
        'SWM'
      ],
      'Joint': [
        'Brokerage',
        'Direct Business',
        'Manager Select',
        'Manager Access Network',
        'Manager Access Select',
        'MWP',
        'MWP RIA',
        'OMP - Advisory',
        'OMP RIA',
        'PWP',
        'PWP RIA',
        'SAM',
        'SWM'
      ],
      'IRA': [
        'Brokerage',
        'Direct Business',
        'Manager Select',
        'Manager Access Network',
        'Manager Access Select',
        'MWP',
        'MWP RIA',
        'OMP - Advisory',
        'OMP RIA',
        'PWP',
        'PWP RIA',
        'SAM',
        'SWM'
      ]
    };
    
    console.log('Account Type:', accountType);
    console.log('Filtered Program Types:', programTypeMap[accountType] || []);
    return programTypeMap[accountType] || [];
  }, [accountType]);

  // Get filtered registration types based on account type AND program type - use useMemo for proper re-rendering
  const filteredRegistrationTypes = useMemo(() => {
    if (!accountType || !programType) return [];
    
    // Registration Type filtering based on Account Type + Program Type combinations from original source
    const registrationTypeMap: { [key: string]: { [key: string]: string[] } } = {
      'Individual': {
        'Brokerage': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'Direct Business': ['529 Plan', 'Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial', 'TAMP/TPIA Non-Entity Non-Retirement'],
        'Manager Access Network': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'Manager Access Select': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'Manager Select': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'MWP': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'MWP RIA': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'OMP - Advisory': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'OMP RIA': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'PWP': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'PWP RIA': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'SAM': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial'],
        'SWM': ['Conservatorship', 'Education Savings', 'Guardianship', 'Individual', 'Minor Custodial']
      },
      'Joint': {
        'Brokerage': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'Direct Business': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'Manager Access Network': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'Manager Access Select': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'Manager Select': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'MWP': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'MWP RIA': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'OMP - Advisory': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'OMP RIA': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'PWP': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'PWP RIA': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'SAM': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common'],
        'SWM': ['Community Property', 'Community Property with Right of Survivorship', 'Joint Tenants with Right of Survivorship', 'Life Tenant with Remainderman', 'Tenants by Entirety', 'Tenants in Common']
      },
      'IRA': {
        'Brokerage': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'Direct Business': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA', 'TAMP/TPIA Non-Entity Non-Retirement'],
        'Manager Select': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'Manager Access Network': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'Manager Access Select': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'MWP': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'MWP RIA': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'OMP - Advisory': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'OMP RIA': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'PWP': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'PWP RIA': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'SAM': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA'],
        'SWM': ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'Guardian Roth IRA', 'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA']
      }
    };
    
    const registrationTypes = registrationTypeMap[accountType]?.[programType] || [];
    console.log('Account Type:', accountType);
    console.log('Program Type:', programType);
    console.log('Filtered Registration Types:', registrationTypes);
    return registrationTypes;
  }, [accountType, programType]);

  // Field visibility logic based on original form data
  const fieldVisibility = useMemo(() => {
    // Business rules for conditional sections
    const regTypesRequireBenef = [
      'Roth IRA', 'SARSEP', 'SEP IRA', 'SIMPLE IRA', 'Traditional IRA',
      'Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA',
      'Guardian IRA', 'Guardian Roth IRA'
    ];

    const regTypesRequireHolder = [
      'Guardianship', 'Conservatorship', 'Education Savings',
      'Minor Custodial', '529 Plan', 'Guardian IRA', 'Guardian Roth IRA'
    ];

    // Default visibility based on Account Type and Program Type combinations
    let showDeliveringFirm = false;
    let showContraAccount = false;
    let showIraType = false;
    let showTransferOnDeath = false;
    let showExpectedAccountValue = false;
    let showApproximateAccountValue = false;
    let showAdvisorFee = false;
    let showInvestmentObjective = true;
    let showAdvisoryBillingCycle = false;
    let showBeneficiaryDetails = false;
    let showDistributionTypes = false;

    // Program types that show ACAT Instructions and Advisory sections
    const advisoryProgramTypes = [
      'Manager Select',
      'Manager Access Network', 
      'Manager Access Select',
      'MWP',
      'MWP RIA',
      'OMP - Advisory',
      'OMP RIA',
      'PWP',
      'PWP RIA',
      'SAM',
      'SWM'
    ];

    // Business logic based on Account Type and Program Type combinations
    if (accountType === 'Joint') {
      // Joint accounts: Similar to Individual but with different conditional rules
      if (programType === 'Brokerage') {
        // Joint + Brokerage: ACAT + Suitability + Transfer on Death (depends on registration type)
        showDeliveringFirm = true;
        showContraAccount = true;
        // Transfer on Death only for specific registration types
        showTransferOnDeath = registrationType === 'Joint Tenants with Right of Survivorship';
        showExpectedAccountValue = false;
        showApproximateAccountValue = true;
        showAdvisorFee = false;
        showInvestmentObjective = true;
      } else if (programType === 'Direct Business') {
        // Joint + Direct Business: Only Suitability
        showDeliveringFirm = false;
        showContraAccount = false;
        showTransferOnDeath = false;
        showExpectedAccountValue = false;
        showApproximateAccountValue = true;
        showAdvisorFee = false;
        showInvestmentObjective = true;
      } else if (advisoryProgramTypes.includes(programType)) {
        // Joint + Advisory Programs: ACAT + Suitability + Advisory Program + Transfer on Death (depends on registration type)
        showDeliveringFirm = true;
        showContraAccount = true;
        // Transfer on Death only for specific registration types
        showTransferOnDeath = registrationType === 'Joint Tenants with Right of Survivorship';
        showExpectedAccountValue = true; // Advisory uses Expected Account Value text input
        showApproximateAccountValue = false;
        showAdvisorFee = true;
        showInvestmentObjective = true;
      }
    } else if (accountType === 'Individual') {
      // Individual accounts: Logic based on Program Type
      if (programType === 'Brokerage') {
        // Brokerage: ACAT + Suitability (dropdown) + Transfer on Death (Individual reg only)
        showDeliveringFirm = true;
        showContraAccount = true;
        showTransferOnDeath = registrationType === 'Individual';
        showExpectedAccountValue = false;
        showApproximateAccountValue = true;
        showAdvisorFee = false;
        showInvestmentObjective = true;
      } else if (programType === 'Direct Business') {
        // Direct Business: Only Suitability (dropdown)
        showDeliveringFirm = false;
        showContraAccount = false;
        showTransferOnDeath = false;
        showExpectedAccountValue = false;
        showApproximateAccountValue = true;
        showAdvisorFee = false;
        showInvestmentObjective = true;
      } else if (advisoryProgramTypes.includes(programType)) {
        // Advisory programs: ACAT + Suitability (text input) + Advisory Program + Transfer on Death (Individual reg only)
        showDeliveringFirm = true;
        showContraAccount = true;
        showTransferOnDeath = registrationType === 'Individual';
        showExpectedAccountValue = true;
        showApproximateAccountValue = false;
        showAdvisorFee = true;
        showInvestmentObjective = true;
      }
    } else if (accountType === 'IRA') {
      // IRA accounts: Show IRA Type and IRA-specific sections based on registration type
      // Hide IRA Type for specific registration types that don't need it
      const hideIraTypeForRegs = ['Beneficiary IRA', 'Beneficiary Roth IRA', 'Beneficiary SIMPLE IRA', 'Guardian IRA', 'SARSEP', 'SIMPLE IRA'];
      showIraType = !hideIraTypeForRegs.includes(registrationType);
      
      // Show Beneficiary Details for Beneficiary IRA types (from screenshots)
      if (registrationType && registrationType.includes('Beneficiary')) {
        showBeneficiaryDetails = true;
      }
      
      // Show Distribution Types for all IRA types (from screenshots)
      showDistributionTypes = true;
      
      if (programType === 'Brokerage') {
        // IRA + Brokerage: ACAT + Suitability + Investment Horizon & Liquidity Needs (from screenshots)
        showDeliveringFirm = true;
        showContraAccount = true;
        showTransferOnDeath = false; // IRAs don't use Transfer on Death
        showExpectedAccountValue = false;
        showApproximateAccountValue = true;
        showAdvisorFee = false;
        showInvestmentObjective = true;
      } else if (programType === 'Direct Business') {
        // IRA + Direct Business: NO ACAT Instructions, only Suitability + Investment Horizon & Liquidity Needs (from screenshots)
        showDeliveringFirm = false;
        showContraAccount = false;
        showTransferOnDeath = false;
        showExpectedAccountValue = false;
        showApproximateAccountValue = true;
        showAdvisorFee = false;
        showInvestmentObjective = true;
      } else if (programType === 'Manager Access Network') {
        // IRA + Manager Access Network: ACAT + Expected Account Value + Advisory Program + Investment Horizon & Liquidity Needs (from screenshots)
        showDeliveringFirm = true;
        showContraAccount = true;
        showTransferOnDeath = false; // IRAs don't use Transfer on Death
        showExpectedAccountValue = true;
        showApproximateAccountValue = false;
        showAdvisorFee = true;
        showInvestmentObjective = true;
      } else if (advisoryProgramTypes.includes(programType)) {
        // IRA + Other Advisory Programs (Manager Select, etc.): ACAT + Suitability + Advisory Program + Investment Horizon & Liquidity Needs (from screenshots)
        showDeliveringFirm = true;
        showContraAccount = true;
        showTransferOnDeath = false; // IRAs don't use Transfer on Death
        showExpectedAccountValue = true;
        showApproximateAccountValue = false;
        showAdvisorFee = true;
        showInvestmentObjective = true;
      }
    }

    // Show Advisory Billing Cycle for SAM and SWM program types
    if (programType === 'SAM' || programType === 'SWM') {
      showAdvisoryBillingCycle = true;
    }

    return {
      showDeliveringFirm,
      showContraAccount,
      showIraType,
      showTransferOnDeath,
      showExpectedAccountValue,
      showApproximateAccountValue,
      showAdvisorFee,
      showInvestmentObjective,
      showAdvisoryBillingCycle,
      showBeneficiaryDetails,
      showDistributionTypes,
      shouldShowBeneficiaries: regTypesRequireBenef.includes(registrationType),
      shouldShowAdditionalHolder: regTypesRequireHolder.includes(registrationType),
      showAdditionalHolders: regTypesRequireHolder.includes(registrationType)
    };
  }, [accountType, programType, registrationType]);

  const {
    showDeliveringFirm,
    showContraAccount,
    showIraType,
    showTransferOnDeath,
    showExpectedAccountValue,
    showApproximateAccountValue,
    showAdvisorFee,
    showInvestmentObjective,
    showAdvisoryBillingCycle,
    showBeneficiaryDetails,
    showDistributionTypes,
    shouldShowBeneficiaries,
    shouldShowAdditionalHolder,
    showAdditionalHolders
  } = fieldVisibility;

  // Submit mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      return apiRequest("/api/accounts", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setLocation("/accounts");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccountFormData) => {
    createAccountMutation.mutate(data);
  };

  // Helper functions for dynamic arrays
  const addAchAccount = () => {
    const currentAccounts = form.getValues("achAccounts");
    form.setValue("achAccounts", [
      ...currentAccounts,
      {
        bankName: "",
        routingNumber: "",
        accountNumber: "",
        accountType: "Checking" as const,
        bankAccountRegistration: "",
        onDemand: false,
        periodic: false,
      },
    ]);
  };

  const removeAchAccount = (index: number) => {
    const currentAccounts = form.getValues("achAccounts");
    form.setValue("achAccounts", currentAccounts.filter((_, i) => i !== index));
  };

  // Additional functions for ACH section
  const addACHAccount = () => {
    const currentAccounts = form.getValues("achAccounts") || [];
    form.setValue("achAccounts", [
      ...currentAccounts,
      { bankName: "", accountNumber: "", routingNumber: "", accountType: "" }
    ]);
  };

  const removeACHAccount = (index: number) => {
    const currentAccounts = form.getValues("achAccounts");
    form.setValue("achAccounts", currentAccounts.filter((_, i) => i !== index));
  };

  const updateACHAccount = (index: number, field: string, value: string) => {
    const currentAccounts = form.getValues("achAccounts");
    const updatedAccounts = [...currentAccounts];
    updatedAccounts[index] = { ...updatedAccounts[index], [field]: value };
    form.setValue("achAccounts", updatedAccounts);
  };

  const addBeneficiary = () => {
    const currentBeneficiaries = form.getValues("beneficiaries");
    form.setValue("beneficiaries", [
      ...currentBeneficiaries,
      {
        relationship: "",
        type: "",
        firstName: "",
        lastName: "",
        percentage: 0,
      },
    ]);
  };

  const removeBeneficiary = (index: number) => {
    const currentBeneficiaries = form.getValues("beneficiaries");
    form.setValue("beneficiaries", currentBeneficiaries.filter((_, i) => i !== index));
  };

  const updateBeneficiary = (index: number, field: string, value: any) => {
    const currentBeneficiaries = form.getValues("beneficiaries");
    const updatedBeneficiaries = [...currentBeneficiaries];
    updatedBeneficiaries[index] = { ...updatedBeneficiaries[index], [field]: value };
    form.setValue("beneficiaries", updatedBeneficiaries);
  };

  // Toggle TOD function
  const toggleTOD = (value: "Yes" | "No") => {
    form.setValue("transferOnDeath", value);
  };

  // Section validation functions
  const validateAccountInfo = () => {
    const values = form.getValues();
    return !!(values.clientId && values.repId && values.accountType && values.programType && values.registrationType);
  };

  const validateACHInfo = () => {
    // ACH Information is optional for all account types
    return true;
  };

  const validateAdditionalHolders = () => {
    if (!shouldShowAdditionalHolder) return true; // Not required if section is hidden
    const values = form.getValues();
    return values.additionalHolders && values.additionalHolders.length > 0;
  };

  const validateBeneficiaries = () => {
    const values = form.getValues();
    return values.beneficiaries && values.beneficiaries.length > 0;
  };

  // Navigation functions
  const goToNextSection = () => {
    const sections = ["accountInfo", "achInfo", "additionalHolders", "beneficiaries", "tradingAuthority", "specialAccounts"];
    const currentIndex = sections.indexOf(currentSection);
    
    // Mark current section as completed if validation passes
    let isValid = false;
    switch (currentSection) {
      case "accountInfo":
        isValid = validateAccountInfo();
        break;
      case "achInfo":
        isValid = true; // ACH is optional
        break;
      case "additionalHolders":
        isValid = validateAdditionalHolders();
        break;
      case "beneficiaries":
        isValid = validateBeneficiaries();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCompletedSections(prev => [...prev.filter(s => s !== currentSection), currentSection]);
      
      // Skip sections that don't apply based on business rules
      let nextIndex = currentIndex + 1;
      while (nextIndex < sections.length) {
        const nextSection = sections[nextIndex];
        
        // Skip Additional Holders if not required
        if (nextSection === "additionalHolders" && !shouldShowAdditionalHolder) {
          nextIndex++;
          continue;
        }
        
        setCurrentSection(nextSection);
        return;
      }
      
      // If we've reached the end without finding a valid section, stay on current
      if (nextIndex >= sections.length && currentIndex < sections.length - 1) {
        setCurrentSection(sections[sections.length - 1]);
      }
    } else {
      toast({
        title: "Incomplete Section",
        description: "Please complete all required fields in this section before proceeding.",
        variant: "destructive",
      });
    }
  };

  const goToPreviousSection = () => {
    const sections = ["accountInfo", "achInfo", "additionalHolders", "beneficiaries", "tradingAuthority", "specialAccounts"];
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1]);
    }
  };

  const canCreateAccount = () => {
    return validateAccountInfo() && validateAdditionalHolders() && validateBeneficiaries();
  };

  const renderSectionNavigation = (sectionKey: string, isFirstSection: boolean = false, isLastSection: boolean = false) => (
    <div className="flex justify-between pt-6 border-t">
      <div>
        {!isFirstSection && (
          <Button
            type="button"
            variant="outline"
            onClick={goToPreviousSection}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
        )}
      </div>
      <div>
        {!isLastSection ? (
          <Button
            type="button"
            onClick={goToNextSection}
            className="flex items-center gap-2"
            disabled={
              (sectionKey === "accountInfo" && !validateAccountInfo()) ||
              (sectionKey === "additionalHolders" && !validateAdditionalHolders()) ||
              (sectionKey === "beneficiaries" && !validateBeneficiaries())
            }
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!canCreateAccount()}
            className="flex items-center gap-2"
          >
            Create Account
            <Check className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  const renderAccountInfoSection = () => (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold border-b pb-2">Account Information</h2>

      {/* Client Selection */}
      <div className="grid grid-cols-1 gap-6">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Client <span className="text-red-500">*</span></FormLabel>
              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                <FormControl>
                  <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select an existing client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clientsData?.clients?.map((client: any) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.firstName} {client.lastName} (ID: {client.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Rep ID & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="repId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rep ID <span className="text-red-500">*</span></FormLabel>
              <FormControl>
                <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-2">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    rows={4}
                    placeholder="Enter any account-specific notes…"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Account Type / Program / Registration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Type <span className="text-red-500">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {lists?.["Account Type"]?.map((type: string) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="programType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Program Type <span className="text-red-500">*</span></FormLabel>
              <Select key={`program-${accountType}`} onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredProgramTypes.map((type: string) => {
                    console.log('Rendering Program Type option:', type);
                    return <SelectItem key={type} value={type}>{type}</SelectItem>
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="registrationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Registration Type <span className="text-red-500">*</span></FormLabel>
              <Select key={`registration-${accountType}`} onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredRegistrationTypes.map((type: string) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* ACAT Instructions - Conditionally shown based on account type */}
      {(showDeliveringFirm || showContraAccount || showIraType) && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">ACAT Instructions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {showDeliveringFirm && (
              <FormField
                control={form.control}
                name="deliveringFirm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivering Firm</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showContraAccount && (
              <FormField
                control={form.control}
                name="contraAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contra Account #</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {showIraType && (
              <FormField
                control={form.control}
                name="iraType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IRA Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lists?.["IRA Type"]?.map((type: string) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </div>
      )}



      {/* Suitability */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Suitability</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showInvestmentObjective && (
            <FormField
              control={form.control}
              name="investmentObjective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment Objective <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[
                        "A) Income with Capital Preservation",
                        "B) Income with Moderate Growth",
                        "C) Growth with Income",
                        "D) Growth",
                        "E) Aggressive Growth",
                        "F) Trading"
                      ].map((obj: string) => (
                        <SelectItem key={obj} value={obj}>{obj}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {showApproximateAccountValue && (
            <FormField
              control={form.control}
              name="approximateAccountValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Approximate Account Value</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Letter-based value ranges matching the original form */}
                      {[
                        "A) $1 - $24,999",
                        "B) $25,000 - $49,999",
                        "C) $50,000 - $99,999",
                        "D) $100,000 - $249,999",
                        "E) $250,000 - $499,999",
                        "F) $500,000 - $749,999",
                        "G) $750,000 - $999,999",
                        "H) $1,000,000 and over"
                      ].map((value: string) => (
                        <SelectItem key={value} value={value}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {showExpectedAccountValue && (
            <FormField
              control={form.control}
              name="expectedAccountValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Account Value</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                      <Input 
                        {...field} 
                        placeholder="Enter expected account value"
                        className="w-full p-3 pl-8 border rounded-lg focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Investment Horizon & Liquidity Needs - Show for Joint accounts always, Individual accounts conditionally */}
        {(accountType === 'Joint' || accountType === 'Individual') && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Investment Horizon & Liquidity Needs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="investmentTimeHorizon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment Time Horizon <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          "1 - 3 years",
                          "3 - 5 years", 
                          "5 - 10 years",
                          "10+ years"
                        ].map((horizon: string) => (
                          <SelectItem key={horizon} value={horizon}>{horizon}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fundsNeededIn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Funds Needed In</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          "None",
                          "0 - 3 years",
                          "3+ years"
                        ].map((timeframe: string) => (
                          <SelectItem key={timeframe} value={timeframe}>{timeframe}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}





        {/* Transfer on Death Section - Only for advisory program types */}
        {showTransferOnDeath && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transfer on Death</h3>
            <FormField
              control={form.control}
              name="transferOnDeath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer on Death</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Beneficiary IRA Details - Only for Beneficiary IRA types */}
        {showBeneficiaryDetails && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Beneficiary IRA Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="decedentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decedent Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" placeholder="Enter decedent name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfDeath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Of Death</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Distribution Types - For all IRA accounts */}
        {showDistributionTypes && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Distribution Types</h3>
            <FormField
              control={form.control}
              name="distributionTypes"
              render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lists?.["Distribution Types"]?.map((type: string) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Advisory Program Account Information - Only for advisory program types */}
        {showAdvisorFee && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Advisory Program Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="advisorFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advisor Fee (%)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="Enter fee percentage" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showAdvisoryBillingCycle && (
                <FormField
                  control={form.control}
                  name="advisoryBillingCycle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Advisory Billing Cycle</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 (Jan/Apr/July/Oct)</SelectItem>
                          <SelectItem value="2">2 (Feb/May/Aug/Nov)</SelectItem>
                          <SelectItem value="3">3 (Mar/June/Sept/Dec)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </div>
        )}
      </div>
      
      {renderSectionNavigation("accountInfo", true, false)}
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden flex">
        {/* Sidebar Navigation */}
        <nav className="w-1/4 bg-gray-100 p-6 space-y-2 sticky top-0">
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'accountInfo'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('accountInfo')}
          >
            Account Information
          </button>
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'achInfo'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('achInfo')}
          >
            ACH Information
          </button>
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'additionalHolders'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('additionalHolders')}
          >
            Additional Account Holders
          </button>
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'beneficiaries'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('beneficiaries')}
          >
            Beneficiaries
          </button>
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'tradingAuthority'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('tradingAuthority')}
          >
            Trading Authority
          </button>
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'specialAccounts'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('specialAccounts')}
          >
            Special Accounts
          </button>
        </nav>

        {/* Main Content */}
        <div className="w-3/4 p-8 space-y-12">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Create New Account</h1>
            <div className="flex items-center gap-4">
              {clientId && (
                <Badge variant="outline">
                  Client ID: {clientId}
                </Badge>
              )}
              <Link href="/accounts">
                <Button variant="ghost" className="bg-gray-300 text-gray-800 hover:bg-gray-400">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Accounts
                </Button>
              </Link>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              {currentSection === 'accountInfo' && renderAccountInfoSection()}
              
              {currentSection === 'achInfo' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">ACH Information</h2>
                  <div className="space-y-4">
                    <p className="text-gray-600">Configure ACH banking information for this account (optional).</p>
                    <Button
                      type="button"
                      onClick={addACHAccount}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add ACH Account
                    </Button>
                    
                    {form.watch("achAccounts")?.map((account, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Bank Name</label>
                            <Input
                              value={account.bankName}
                              onChange={(e) => updateACHAccount(index, 'bankName', e.target.value)}
                              placeholder="Enter bank name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Account Number</label>
                            <Input
                              value={account.accountNumber}
                              onChange={(e) => updateACHAccount(index, 'accountNumber', e.target.value)}
                              placeholder="Enter account number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Routing Number</label>
                            <Input
                              value={account.routingNumber}
                              onChange={(e) => updateACHAccount(index, 'routingNumber', e.target.value)}
                              placeholder="Enter routing number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Account Type</label>
                            <Select
                              value={account.accountType}
                              onValueChange={(value) => updateACHAccount(index, 'accountType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeACHAccount(index)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {renderSectionNavigation("achInfo", false, false)}
                </section>
              )}
              
              {currentSection === 'additionalHolders' && shouldShowAdditionalHolder && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Account Holders</CardTitle>
                    <CardDescription>
                      Required fields for this selection
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="additionalHolder.firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input placeholder="First Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="additionalHolder.middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Middle Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="additionalHolder.lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Last Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="additionalHolder.alias"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Alias</FormLabel>
                            <FormControl>
                              <Input placeholder="Nickname (optional)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Citizenship and Personal Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="additionalHolder.citizenship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Citizenship / Legal Establishment</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="US Citizen">US Citizen</SelectItem>
                                <SelectItem value="US Resident Alien">US Resident Alien</SelectItem>
                                <SelectItem value="Non-US Person">Non-US Person</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="additionalHolder.dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* SSN */}
                    <FormField
                      control={form.control}
                      name="additionalHolder.ssn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SSN</FormLabel>
                          <FormControl>
                            <Input placeholder="123456789" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Contact Information</h4>
                      
                      <FormField
                        control={form.control}
                        name="additionalHolder.useSameAddress"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Use same address as primary</FormLabel>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="additionalHolder.legalAddress1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Legal Address Line 1</FormLabel>
                              <FormControl>
                                <Input placeholder="Legal Address Line 1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="additionalHolder.legalAddress2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Legal Address Line 2</FormLabel>
                              <FormControl>
                                <Input placeholder="Legal Address Line 2" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="additionalHolder.city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City</FormLabel>
                              <FormControl>
                                <Input placeholder="City" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="additionalHolder.state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="AL">Alabama</SelectItem>
                                  <SelectItem value="AK">Alaska</SelectItem>
                                  <SelectItem value="AZ">Arizona</SelectItem>
                                  <SelectItem value="AR">Arkansas</SelectItem>
                                  <SelectItem value="CA">California</SelectItem>
                                  <SelectItem value="CO">Colorado</SelectItem>
                                  <SelectItem value="CT">Connecticut</SelectItem>
                                  <SelectItem value="DE">Delaware</SelectItem>
                                  <SelectItem value="FL">Florida</SelectItem>
                                  <SelectItem value="GA">Georgia</SelectItem>
                                  <SelectItem value="HI">Hawaii</SelectItem>
                                  <SelectItem value="ID">Idaho</SelectItem>
                                  <SelectItem value="IL">Illinois</SelectItem>
                                  <SelectItem value="IN">Indiana</SelectItem>
                                  <SelectItem value="IA">Iowa</SelectItem>
                                  <SelectItem value="KS">Kansas</SelectItem>
                                  <SelectItem value="KY">Kentucky</SelectItem>
                                  <SelectItem value="LA">Louisiana</SelectItem>
                                  <SelectItem value="ME">Maine</SelectItem>
                                  <SelectItem value="MD">Maryland</SelectItem>
                                  <SelectItem value="MA">Massachusetts</SelectItem>
                                  <SelectItem value="MI">Michigan</SelectItem>
                                  <SelectItem value="MN">Minnesota</SelectItem>
                                  <SelectItem value="MS">Mississippi</SelectItem>
                                  <SelectItem value="MO">Missouri</SelectItem>
                                  <SelectItem value="MT">Montana</SelectItem>
                                  <SelectItem value="NE">Nebraska</SelectItem>
                                  <SelectItem value="NV">Nevada</SelectItem>
                                  <SelectItem value="NH">New Hampshire</SelectItem>
                                  <SelectItem value="NJ">New Jersey</SelectItem>
                                  <SelectItem value="NM">New Mexico</SelectItem>
                                  <SelectItem value="NY">New York</SelectItem>
                                  <SelectItem value="NC">North Carolina</SelectItem>
                                  <SelectItem value="ND">North Dakota</SelectItem>
                                  <SelectItem value="OH">Ohio</SelectItem>
                                  <SelectItem value="OK">Oklahoma</SelectItem>
                                  <SelectItem value="OR">Oregon</SelectItem>
                                  <SelectItem value="PA">Pennsylvania</SelectItem>
                                  <SelectItem value="RI">Rhode Island</SelectItem>
                                  <SelectItem value="SC">South Carolina</SelectItem>
                                  <SelectItem value="SD">South Dakota</SelectItem>
                                  <SelectItem value="TN">Tennessee</SelectItem>
                                  <SelectItem value="TX">Texas</SelectItem>
                                  <SelectItem value="UT">Utah</SelectItem>
                                  <SelectItem value="VT">Vermont</SelectItem>
                                  <SelectItem value="VA">Virginia</SelectItem>
                                  <SelectItem value="WA">Washington</SelectItem>
                                  <SelectItem value="WV">West Virginia</SelectItem>
                                  <SelectItem value="WI">Wisconsin</SelectItem>
                                  <SelectItem value="WY">Wyoming</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="additionalHolder.zip"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Zip</FormLabel>
                              <FormControl>
                                <Input placeholder="12345" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="additionalHolder.email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="name@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Phone Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Phone Information</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="additionalHolder.homePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Home Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 5551234567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="additionalHolder.mobilePhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 5551234567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="additionalHolder.businessPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Business Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 5551234567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Employment Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Employment Information</h4>
                      
                      <FormField
                        control={form.control}
                        name="additionalHolder.employmentStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employment Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Employed">Employed</SelectItem>
                                <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                                <SelectItem value="Unemployed">Unemployed</SelectItem>
                                <SelectItem value="Student">Student</SelectItem>
                                <SelectItem value="Retired">Retired</SelectItem>
                                <SelectItem value="Homemaker">Homemaker</SelectItem>
                                <SelectItem value="Minor">Minor</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="additionalHolder.industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Agriculture">Agriculture</SelectItem>
                                <SelectItem value="Banking">Banking</SelectItem>
                                <SelectItem value="Construction">Construction</SelectItem>
                                <SelectItem value="Education">Education</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="Government">Government</SelectItem>
                                <SelectItem value="Healthcare">Healthcare</SelectItem>
                                <SelectItem value="Insurance">Insurance</SelectItem>
                                <SelectItem value="Legal">Legal</SelectItem>
                                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="Real Estate">Real Estate</SelectItem>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Technology">Technology</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="additionalHolder.occupation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Occupation</FormLabel>
                            <FormControl>
                              <Input placeholder="Occupation" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="additionalHolder.excludeEmployerAddress"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Exclude Employer Address</FormLabel>
                          </FormItem>
                        )}
                      />

                      {!form.watch('additionalHolder.excludeEmployerAddress') && (
                        <div className="space-y-4 pl-6">
                          <FormField
                            control={form.control}
                            name="additionalHolder.employerAddress1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Employer Address Line 1</FormLabel>
                                <FormControl>
                                  <Input placeholder="Employer Address Line 1" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="additionalHolder.employerAddress2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Employer Address Line 2</FormLabel>
                                <FormControl>
                                  <Input placeholder="Employer Address Line 2" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="additionalHolder.employerCity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="City" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="additionalHolder.employerState"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>State</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="AL">Alabama</SelectItem>
                                      <SelectItem value="AK">Alaska</SelectItem>
                                      <SelectItem value="AZ">Arizona</SelectItem>
                                      <SelectItem value="AR">Arkansas</SelectItem>
                                      <SelectItem value="CA">California</SelectItem>
                                      <SelectItem value="CO">Colorado</SelectItem>
                                      <SelectItem value="CT">Connecticut</SelectItem>
                                      <SelectItem value="DE">Delaware</SelectItem>
                                      <SelectItem value="FL">Florida</SelectItem>
                                      <SelectItem value="GA">Georgia</SelectItem>
                                      <SelectItem value="HI">Hawaii</SelectItem>
                                      <SelectItem value="ID">Idaho</SelectItem>
                                      <SelectItem value="IL">Illinois</SelectItem>
                                      <SelectItem value="IN">Indiana</SelectItem>
                                      <SelectItem value="IA">Iowa</SelectItem>
                                      <SelectItem value="KS">Kansas</SelectItem>
                                      <SelectItem value="KY">Kentucky</SelectItem>
                                      <SelectItem value="LA">Louisiana</SelectItem>
                                      <SelectItem value="ME">Maine</SelectItem>
                                      <SelectItem value="MD">Maryland</SelectItem>
                                      <SelectItem value="MA">Massachusetts</SelectItem>
                                      <SelectItem value="MI">Michigan</SelectItem>
                                      <SelectItem value="MN">Minnesota</SelectItem>
                                      <SelectItem value="MS">Mississippi</SelectItem>
                                      <SelectItem value="MO">Missouri</SelectItem>
                                      <SelectItem value="MT">Montana</SelectItem>
                                      <SelectItem value="NE">Nebraska</SelectItem>
                                      <SelectItem value="NV">Nevada</SelectItem>
                                      <SelectItem value="NH">New Hampshire</SelectItem>
                                      <SelectItem value="NJ">New Jersey</SelectItem>
                                      <SelectItem value="NM">New Mexico</SelectItem>
                                      <SelectItem value="NY">New York</SelectItem>
                                      <SelectItem value="NC">North Carolina</SelectItem>
                                      <SelectItem value="ND">North Dakota</SelectItem>
                                      <SelectItem value="OH">Ohio</SelectItem>
                                      <SelectItem value="OK">Oklahoma</SelectItem>
                                      <SelectItem value="OR">Oregon</SelectItem>
                                      <SelectItem value="PA">Pennsylvania</SelectItem>
                                      <SelectItem value="RI">Rhode Island</SelectItem>
                                      <SelectItem value="SC">South Carolina</SelectItem>
                                      <SelectItem value="SD">South Dakota</SelectItem>
                                      <SelectItem value="TN">Tennessee</SelectItem>
                                      <SelectItem value="TX">Texas</SelectItem>
                                      <SelectItem value="UT">Utah</SelectItem>
                                      <SelectItem value="VT">Vermont</SelectItem>
                                      <SelectItem value="VA">Virginia</SelectItem>
                                      <SelectItem value="WA">Washington</SelectItem>
                                      <SelectItem value="WV">West Virginia</SelectItem>
                                      <SelectItem value="WI">Wisconsin</SelectItem>
                                      <SelectItem value="WY">Wyoming</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="additionalHolder.employerZip"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Zip</FormLabel>
                                  <FormControl>
                                    <Input placeholder="12345" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  {renderSectionNavigation("additionalHolders", false, false)}
                </Card>
              )}
              
              {currentSection === 'beneficiaries' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">Beneficiaries</h2>
                  <div className="space-y-4">
                    <Button
                      type="button"
                      onClick={addBeneficiary}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Beneficiary
                    </Button>
                    
                    {form.watch("beneficiaries")?.map((beneficiary, index) => (
                      <Card key={index} className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">First Name</label>
                            <Input
                              value={beneficiary.firstName}
                              onChange={(e) => updateBeneficiary(index, 'firstName', e.target.value)}
                              placeholder="Enter first name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Last Name</label>
                            <Input
                              value={beneficiary.lastName}
                              onChange={(e) => updateBeneficiary(index, 'lastName', e.target.value)}
                              placeholder="Enter last name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Relationship</label>
                            <Select
                              value={beneficiary.relationship}
                              onValueChange={(value) => updateBeneficiary(index, 'relationship', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select relationship" />
                              </SelectTrigger>
                              <SelectContent>
                                {lists?.["Beneficiary Relationship"]?.map((rel: string) => (
                                  <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Percentage</label>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={beneficiary.percentage}
                              onChange={(e) => updateBeneficiary(index, 'percentage', parseInt(e.target.value))}
                              placeholder="Enter percentage"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeBeneficiary(index)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {renderSectionNavigation("beneficiaries", false, false)}
                </section>
              )}
              
              {currentSection === 'tradingAuthority' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">Trading Authority</h2>
                  <div className="space-y-4">
                    <p className="text-gray-600">Configure trading authority for this account.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Authorization Level</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select authorization level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="limited">Limited Trading Authority</SelectItem>
                            <SelectItem value="full">Full Trading Authority</SelectItem>
                            <SelectItem value="none">No Trading Authority</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Authorized Person</label>
                        <Input placeholder="Enter authorized person name" />
                      </div>
                    </div>
                  </div>
                  
                  {renderSectionNavigation("tradingAuthority", false, false)}
                </section>
              )}
              
              {currentSection === 'specialAccounts' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">Special Accounts</h2>
                  <div className="space-y-4">
                    <p className="text-gray-600">Additional configuration for special account types.</p>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Special Account Type</label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select special account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trust">Trust Account</SelectItem>
                            <SelectItem value="529">529 Education Plan</SelectItem>
                            <SelectItem value="custodial">Custodial Account</SelectItem>
                            <SelectItem value="corporate">Corporate Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  {renderSectionNavigation("specialAccounts", false, true)}
                </section>
              )}
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
