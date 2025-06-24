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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Trash2, FileText, Users, CreditCard, Settings, Shield, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Sidebar } from "@/components/sidebar";

// Enhanced form schema based on reference design
const accountFormSchema = z.object({
  clientId: z.number().optional(),
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
  
  // Get clientId from URL params
  const params = new URLSearchParams(window.location.search);
  const clientId = params.get('clientId') ? parseInt(params.get('clientId')!) : undefined;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      clientId,
      transferOnDeath: "No",
      achAccounts: [],
      beneficiaries: [],
    },
  });

  // Fetch dropdown lists
  const { data: lists } = useQuery({
    queryKey: ["/api/lists"],
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
      showIraType = true;
      
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
      shouldShowAdditionalHolder: regTypesRequireHolder.includes(registrationType)
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
    shouldShowAdditionalHolder
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

  // Toggle TOD function
  const toggleTOD = (value: "Yes" | "No") => {
    form.setValue("transferOnDeath", value);
  };

  const renderAccountInfoSection = () => (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold border-b pb-2">Account Information</h2>

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

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-6 border-t">
                <Link href="/accounts">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createAccountMutation.isPending}
                >
                  {createAccountMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
