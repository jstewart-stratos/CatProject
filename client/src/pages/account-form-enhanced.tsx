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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Plus, Trash2, FileText, Users, CreditCard, Settings, Shield, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";

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
  advisorFee: z.string().optional(),
  // Account Options
  wantCheckwriting: z.boolean().default(false),
  accountTypeOption: z.string().optional(),
  wantDebitCard: z.boolean().default(false),
  wantCostBasisReporting: z.boolean().default(false),
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
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    entityName: z.string().optional(),
    tin: z.string().optional(),
    percentage: z.number().min(0).max(100),
    dateOfBirth: z.string().optional(),
    ssn: z.string().optional(),
  })).default([]),
  // Additional Holder
  additionalHolder: z.object({
    firstName: z.string().optional(),
    middleName: z.string().optional(),
    lastName: z.string().optional(),
    alias: z.string().optional(),
    citizenship: z.string().optional(),
    dateOfBirth: z.string().optional(),
    ssn: z.string().optional(),
    legalAddress1: z.string().optional(),
    legalAddress2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    email: z.string().optional(),
    homePhone: z.string().optional(),
    mobilePhone: z.string().optional(),
    businessPhone: z.string().optional(),
    employmentStatus: z.string().optional(),
    industry: z.string().optional(),
    industryAffiliation: z.string().optional(),
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
  // Power of Attorney
  grantPowerOfAttorney: z.boolean().default(false),
  authorizedAgentName: z.string().optional(),
  isAgentExistingClient: z.boolean().default(false),
  // Trading Authority
  grantTradingAuthority: z.string().optional(),
  tradingAuthorizedAgentName: z.string().optional(),
  isTradingAgentExistingClient: z.string().optional(),
  newTradingAuthorizationType: z.string().optional(),
  // Trading Options
  addFullDiscretionaryTrading: z.string().optional(),
  addStructuredProductTrading: z.string().optional(),
  tradeComplexETPs: z.string().optional(),
  addOptionsTrading: z.string().optional(),
  optionsLevel: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

// Navigation sections for sidebar - will be filtered based on business rules
const allNavigationSections = [
  { id: "accountInfo", label: "Account Information", icon: FileText },
  { id: "achInfo", label: "ACH Information", icon: CreditCard },
  { id: "additionalHolders", label: "Additional Account Holders", icon: Users },
  { id: "beneficiaries", label: "Beneficiaries", icon: Users },
  { id: "powerOfAttorney", label: "Power of Attorney", icon: Shield },
  { id: "tradingAuthority", label: "Trading Authority", icon: Settings },
  { id: "tradingOptions", label: "Trading Options", icon: Settings },
  { id: "specialAccounts", label: "Special Accounts", icon: FileText },
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

  // Get selected client data
  const selectedClientId = form.watch("clientId");
  const selectedClient = (clientsData as any)?.clients?.find((client: any) => client.id === selectedClientId);

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

    // Beneficiaries are required when:
    // 1. Registration type is an IRA type
    // 2. Transfer on Death is "Yes" (for Individual accounts)
    const transferOnDeathValue = form.watch('transferOnDeath');
    const shouldShowBeneficiaries = regTypesRequireBenef.includes(registrationType) || 
                                   (transferOnDeathValue === 'Yes');
    
    // Power of Attorney is commonly required/applicable for:
    // 1. Trust accounts (trustee management)
    // 2. Guardian/Conservatorship accounts (legal authority)
    // 3. Business accounts (authorized signers)
    // 4. Custodial accounts (parent/guardian authority)
    // 5. Estate accounts (executor authority)
    // 6. Advisory program accounts with high asset values (delegation of trading authority)
    const trustRegistrationTypes = [
      'Trust', 'Revocable Trust', 'Irrevocable Trust', 'Estate', 
      'Guardianship', 'Conservatorship', 'Custodial Account', 'Minor Custodial'
    ];
    const businessRegistrationTypes = ['Corporation', 'LLC', 'Partnership'];
    
    const shouldShowPowerOfAttorney = 
      trustRegistrationTypes.includes(registrationType) ||
      businessRegistrationTypes.includes(registrationType) ||
      registrationType === '529 Education Plan'; // Parent/guardian for minor beneficiary

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
      shouldShowBeneficiaries,
      shouldShowAdditionalHolder: regTypesRequireHolder.includes(registrationType),
      showAdditionalHolders: regTypesRequireHolder.includes(registrationType),
      shouldShowPowerOfAttorney
    };
  }, [accountType, programType, registrationType, form.watch('transferOnDeath')]);

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
    showAdditionalHolders,
    shouldShowPowerOfAttorney
  } = fieldVisibility;

  // Filter navigation sections based on business rules
  const navigationSections = allNavigationSections.filter(section => {
    if (section.id === "additionalHolders" && !shouldShowAdditionalHolder) {
      return false;
    }
    if (section.id === "beneficiaries" && !shouldShowBeneficiaries) {
      return false;
    }
    if (section.id === "powerOfAttorney" && !shouldShowPowerOfAttorney) {
      return false;
    }
    return true;
  });

  // Submit mutation
  const createAccountMutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      return apiRequest("/api/accounts", "POST", data);
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
      { 
        bankName: "", 
        accountNumber: "", 
        routingNumber: "", 
        accountType: "Checking" as "Checking" | "Savings",
        bankAccountRegistration: "",
        onDemand: false,
        periodic: false
      }
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

  // Function to populate address from selected client
  const populateAddressFromClient = () => {
    if (selectedClient) {
      form.setValue("additionalHolder.legalAddress1", selectedClient.legalAddress1 || "");
      form.setValue("additionalHolder.legalAddress2", selectedClient.legalAddress2 || "");
      form.setValue("additionalHolder.city", selectedClient.city || "");
      form.setValue("additionalHolder.state", selectedClient.state || "");
      form.setValue("additionalHolder.zip", selectedClient.zipCode || "");
    }
  };

  // Watch for changes to "Use same address as primary" checkbox
  const useSameAddress = form.watch("additionalHolder.useSameAddress");
  
  // Auto-populate address when checkbox is checked
  useEffect(() => {
    if (useSameAddress && selectedClient) {
      populateAddressFromClient();
    } else if (!useSameAddress) {
      // Clear address fields when unchecked
      form.setValue("additionalHolder.legalAddress1", "");
      form.setValue("additionalHolder.legalAddress2", "");
      form.setValue("additionalHolder.city", "");
      form.setValue("additionalHolder.state", "");
      form.setValue("additionalHolder.zip", "");
    }
  }, [useSameAddress, selectedClient]);

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
    return values.additionalHolder;
  };

  const validateBeneficiaries = () => {
    if (!shouldShowBeneficiaries) return true; // Not required if section is hidden
    const values = form.getValues();
    return values.beneficiaries && values.beneficiaries.length > 0;
  };

  // Navigation functions
  const goToNextSection = () => {
    const sections = ["accountInfo", "achInfo", "additionalHolders", "beneficiaries", "powerOfAttorney", "tradingAuthority", "specialAccounts"];
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
        isValid = Boolean(validateAdditionalHolders());
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
        
        // Skip Beneficiaries if not required
        if (nextSection === "beneficiaries" && !shouldShowBeneficiaries) {
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
    const sections = ["accountInfo", "achInfo", "additionalHolders", "beneficiaries", "powerOfAttorney", "tradingAuthority", "specialAccounts"];
    const currentIndex = sections.indexOf(currentSection);
    
    // Skip sections that don't apply based on business rules
    let prevIndex = currentIndex - 1;
    while (prevIndex >= 0) {
      const prevSection = sections[prevIndex];
      
      // Skip Additional Holders if not required
      if (prevSection === "additionalHolders" && !shouldShowAdditionalHolder) {
        prevIndex--;
        continue;
      }
      
      // Skip Beneficiaries if not required
      if (prevSection === "beneficiaries" && !shouldShowBeneficiaries) {
        prevIndex--;
        continue;
      }
      
      setCurrentSection(prevSection);
      return;
    }
    
    // If we can't find a valid previous section, stay on current
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
                  {(clientsData as any)?.clients?.map((client: any) => (
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
                  {(lists as any)?.["Account Type"]?.map((type: string) => (
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
                        {(lists as any)?.["IRA Type"]?.map((type: string) => (
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



      {/* Suitability - Only show when account type is selected */}
      {accountType && (
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
                      {(lists as any)?.["Distribution Types"]?.map((type: string) => (
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
      )}
      
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
          {shouldShowAdditionalHolder && (
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
          )}
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'accountOptions'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('accountOptions')}
          >
            Account Options
          </button>
          {shouldShowBeneficiaries && (
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
          )}
          <button
            type="button"
            className={`nav-btn w-full text-left px-3 py-2 rounded-r ${
              currentSection === 'powerOfAttorney'
                ? 'bg-white border-l-4 border-blue-800 text-blue-800 font-medium'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setCurrentSection('powerOfAttorney')}
          >
            Power of Attorney
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
              
              {currentSection === 'accountOptions' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">Account Options</h2>
                  
                  <div className="space-y-6">
                    {/* Checkwriting Question */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="wantCheckwriting"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Do you want checkwriting for this account?</FormLabel>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="checkwriting-no"
                                  name="wantCheckwriting"
                                  value="false"
                                  checked={field.value === false}
                                  onChange={() => field.onChange(false)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <label htmlFor="checkwriting-no" className="text-sm font-medium cursor-pointer bg-blue-100 text-blue-800 px-3 py-1 rounded">
                                  No
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="checkwriting-yes"
                                  name="wantCheckwriting"
                                  value="true"
                                  checked={field.value === true}
                                  onChange={() => field.onChange(true)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <label htmlFor="checkwriting-yes" className="text-sm font-medium cursor-pointer bg-gray-100 text-gray-800 px-3 py-1 rounded">
                                  Yes
                                </label>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Account Type - Only show when checkwriting is Yes */}
                    {form.watch("wantCheckwriting") === true && (
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="accountTypeOption"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-2">
                                <FormLabel className="text-base font-medium">Account Type</FormLabel>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="w-4 h-4 bg-blue-500 text-white rounded text-xs flex items-center justify-center font-bold cursor-help">
                                        i
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm p-3 bg-gray-800 text-white">
                                      <div className="space-y-2">
                                        <div>
                                          <p className="font-medium">Premier:</p>
                                          <p className="text-sm">Free, wallet-size checks. Initial checkbook includes 40 checks.</p>
                                        </div>
                                        <div>
                                          <p className="font-medium">Premier Plus:</p>
                                          <p className="text-sm">Same benefits as Premier, Business Checks available upon request and also offers an optional VISA Platinum debit card.</p>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div className="flex gap-4 mt-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="account-type-premier"
                                    name="accountTypeOption"
                                    value="Premier"
                                    checked={field.value === "Premier"}
                                    onChange={() => field.onChange("Premier")}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <label htmlFor="account-type-premier" className="text-sm font-medium cursor-pointer bg-blue-100 text-blue-800 px-3 py-1 rounded">
                                    Premier
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="account-type-premier-plus"
                                    name="accountTypeOption"
                                    value="Premier +"
                                    checked={field.value === "Premier +"}
                                    onChange={() => field.onChange("Premier +")}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <label htmlFor="account-type-premier-plus" className="text-sm font-medium cursor-pointer bg-gray-100 text-gray-800 px-3 py-1 rounded">
                                    Premier +
                                  </label>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Debit Card Question - Only show when Premier + is selected */}
                    {form.watch("accountTypeOption") === "Premier +" && (
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="wantDebitCard"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Do you want a debit card for this account?</FormLabel>
                              <div className="flex gap-4 mt-2">
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="debit-card-no"
                                    name="wantDebitCard"
                                    value="false"
                                    checked={field.value === false}
                                    onChange={() => field.onChange(false)}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <label htmlFor="debit-card-no" className="text-sm font-medium cursor-pointer bg-blue-100 text-blue-800 px-3 py-1 rounded">
                                    No
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id="debit-card-yes"
                                    name="wantDebitCard"
                                    value="true"
                                    checked={field.value === true}
                                    onChange={() => field.onChange(true)}
                                    className="w-4 h-4 text-blue-600"
                                  />
                                  <label htmlFor="debit-card-yes" className="text-sm font-medium cursor-pointer bg-gray-100 text-gray-800 px-3 py-1 rounded">
                                    Yes
                                  </label>
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Cost-basis Reporting Question */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="wantCostBasisReporting"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Does client want cost-basis reporting on LPL Statement?</FormLabel>
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="cost-basis-no"
                                  name="wantCostBasisReporting"
                                  value="false"
                                  checked={field.value === false}
                                  onChange={() => field.onChange(false)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <label htmlFor="cost-basis-no" className="text-sm font-medium cursor-pointer bg-blue-100 text-blue-800 px-3 py-1 rounded">
                                  No
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="cost-basis-yes"
                                  name="wantCostBasisReporting"
                                  value="true"
                                  checked={field.value === true}
                                  onChange={() => field.onChange(true)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <label htmlFor="cost-basis-yes" className="text-sm font-medium cursor-pointer bg-gray-100 text-gray-800 px-3 py-1 rounded">
                                  Yes
                                </label>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {renderSectionNavigation("accountOptions", false, false)}
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
                            <FormLabel>Use same address as primary client</FormLabel>
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
                                <Input 
                                  placeholder="Legal Address Line 1" 
                                  {...field} 
                                  disabled={useSameAddress}
                                />
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
                                <Input 
                                  placeholder="Legal Address Line 2" 
                                  {...field} 
                                  disabled={useSameAddress}
                                />
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
                                <Input 
                                  placeholder="City" 
                                  {...field} 
                                  disabled={useSameAddress}
                                />
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
                              {useSameAddress ? (
                                <FormControl>
                                  <Input 
                                    value={field.value || ""} 
                                    disabled={true}
                                    className="bg-gray-50"
                                  />
                                </FormControl>
                              ) : (
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
                              )}
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
                                <Input 
                                  placeholder="12345" 
                                  {...field} 
                                  disabled={useSameAddress}
                                />
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
                                  <SelectValue placeholder="Select employment status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="employed">Employed</SelectItem>
                                <SelectItem value="self_employed">Self-Employed</SelectItem>
                                <SelectItem value="retired">Retired</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="homemaker">Homemaker</SelectItem>
                                <SelectItem value="unemployed">Unemployed</SelectItem>
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
                                <SelectItem value="Transportation">Transportation</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                                {/* Auto-populated values for certain statuses */}
                                <SelectItem value="Retired">Retired</SelectItem>
                                <SelectItem value="Student">Student</SelectItem>
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
                        name="additionalHolder.industryAffiliation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry Affiliation</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="lpl_rep_employee_sales_assistant">LPL Rep/Employee/Sales Assistant</SelectItem>
                                <SelectItem value="relative_of_lpl_rep_employee">Relative of LPL Rep/Employee</SelectItem>
                                <SelectItem value="employee_relative_other_securities_firm">Employee/Relative of Other Securities Firm</SelectItem>
                                <SelectItem value="employee_relative_other_financial_institution">Employee/Relative of Other Financial Institution</SelectItem>
                                <SelectItem value="employee_relative_finra_employee">Employee/Relative of FINRA Employee</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
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
                  
                  <div className="space-y-6">
                    {form.watch("beneficiaries")?.map((beneficiary: any, index: number) => (
                      <div key={index} className="border rounded-lg p-6 space-y-6 relative">
                        {/* Close button */}
                        <button
                          type="button"
                          onClick={() => {
                            const current = form.getValues("beneficiaries") || [];
                            const updated = current.filter((_, i) => i !== index);
                            form.setValue("beneficiaries", updated);
                          }}
                          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
                        >
                          ×
                        </button>

                        {/* Relationship and Type row */}
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name={`beneficiaries.${index}.relationship`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Relationship</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {((lists as any)?.["Bene Relation"] || []).map((relationship: any) => (
                                      <SelectItem key={relationship} value={relationship}>
                                        {relationship}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`beneficiaries.${index}.type` as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {((lists as any)?.["Bene Type"] || []).map((type: string) => (
                                      <SelectItem key={type} value={type}>
                                        {type}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Conditional fields based on relationship type */}
                        {form.watch(`beneficiaries.${index}.relationship`) === "Non-Person" ? (
                          // Non-Person fields: Entity Name and TIN
                          <div className="grid grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name={`beneficiaries.${index}.entityName` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Entity Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Entity Name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`beneficiaries.${index}.tin` as any}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">TIN</FormLabel>
                                  <FormControl>
                                    <Input placeholder="TIN" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        ) : (
                          // Person fields: Name row
                          <div className="grid grid-cols-3 gap-6">
                            <FormField
                              control={form.control}
                              name={`beneficiaries.${index}.firstName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">First Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="First Name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`beneficiaries.${index}.middleName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Middle Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Middle Name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`beneficiaries.${index}.lastName`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Last Name</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Last Name" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}

                        {/* Percentage row */}
                        <div className="grid grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name={`beneficiaries.${index}.percentage`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Percentage</FormLabel>
                                <div className="flex gap-2">
                                  <FormControl>
                                    <Input placeholder="%" {...field} className="w-20" />
                                  </FormControl>
                                  <span className="flex items-center text-gray-500">%</span>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div></div>
                        </div>

                        {/* Date of Birth and SSN row - only for persons */}
                        {form.watch(`beneficiaries.${index}.relationship`) !== "Non-Person" && (
                          <div className="grid grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name={`beneficiaries.${index}.dateOfBirth`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">Date Of Birth</FormLabel>
                                  <FormControl>
                                    <Input placeholder="mm/dd/yyyy" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`beneficiaries.${index}.ssn`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-base font-medium">SSN</FormLabel>
                                  <FormControl>
                                    <Input placeholder="123456789" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Add Another Beneficiary button */}
                    <button
                      type="button"
                      onClick={() => {
                        const current = form.getValues("beneficiaries") || [];
                        form.setValue("beneficiaries", [...current, {
                          firstName: "",
                          middleName: "",
                          lastName: "",
                          relationship: "",
                          type: "Primary",
                          percentage: 0,
                          dateOfBirth: "",
                          ssn: ""
                        }]);
                      }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      + Add Another Beneficiary
                    </button>

                    {renderSectionNavigation("beneficiaries", false, false)}
                  </div>
                </section>
              )}
              
              {currentSection === 'powerOfAttorney' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">Power of Attorney</h2>
                  
                  <div className="space-y-6">
                    {/* Grant Power of Attorney Question */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={"grantPowerOfAttorney" as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Grant Power of Attorney?</FormLabel>
                            <FormControl>
                              <div className="flex space-x-4">
                                <button
                                  type="button"
                                  className={`px-4 py-2 rounded-md border ${
                                    field.value === false
                                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                                      : 'bg-gray-50 border-gray-300 text-gray-700'
                                  }`}
                                  onClick={() => field.onChange(false)}
                                >
                                  No
                                </button>
                                <button
                                  type="button"
                                  className={`px-4 py-2 rounded-md border ${
                                    field.value === true
                                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                                      : 'bg-gray-50 border-gray-300 text-gray-700'
                                  }`}
                                  onClick={() => field.onChange(true)}
                                >
                                  Yes
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Conditional fields when Power of Attorney is granted */}
                    {(form.watch('grantPowerOfAttorney' as any)) === true && (
                      <div className="space-y-6">
                        {/* Authorized Agent Name */}
                        <FormField
                          control={form.control}
                          name={"authorizedAgentName" as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Authorized Agent Name</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Authorized Agent Name"
                                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Is agent an existing client Question */}
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={"isAgentExistingClient" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Is agent an existing client?</FormLabel>
                                <FormControl>
                                  <div className="flex space-x-4">
                                    <button
                                      type="button"
                                      className={`px-4 py-2 rounded-md border ${
                                        field.value === false
                                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                                          : 'bg-gray-50 border-gray-300 text-gray-700'
                                      }`}
                                      onClick={() => field.onChange(false)}
                                    >
                                      No
                                    </button>
                                    <button
                                      type="button"
                                      className={`px-4 py-2 rounded-md border ${
                                        field.value === true
                                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                                          : 'bg-gray-50 border-gray-300 text-gray-700'
                                      }`}
                                      onClick={() => field.onChange(true)}
                                    >
                                      Yes
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {renderSectionNavigation("powerOfAttorney", false, false)}
                </section>
              )}
              
              {currentSection === 'tradingAuthority' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">Trading Authority</h2>
                  <div className="space-y-6">
                    {/* Grant Trading Authority Question */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={"grantTradingAuthority" as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Grant Trading Authority?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-6"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="No" id="trading-no" />
                                  <Label htmlFor="trading-no">No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Yes" id="trading-yes" />
                                  <Label htmlFor="trading-yes">Yes</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Conditional fields when Grant Trading Authority = Yes */}
                    {form.watch('grantTradingAuthority' as any) === 'Yes' && (
                      <>
                        {/* Authorized Agent Name */}
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={"tradingAuthorizedAgentName" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Authorized Agent Name</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="Authorized Agent Name" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Is agent an existing client Question */}
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={"isTradingAgentExistingClient" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Is agent an existing client?</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex space-x-6"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="No" id="trading-client-no" />
                                      <Label htmlFor="trading-client-no">No</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="Yes" id="trading-client-yes" />
                                      <Label htmlFor="trading-client-yes">Yes</Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Trading Authorization Type */}
                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={"newTradingAuthorizationType" as any}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-base font-medium">Trading Authorization Type (Select One)</FormLabel>
                                <FormControl>
                                  <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="space-y-3"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="Limited" id="limited-trading" />
                                      <Label htmlFor="limited-trading" className="flex items-center space-x-2">
                                        Limited Trading Authority 
                                        <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-500 rounded-full ml-1">i</span>
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="Full" id="full-trading" />
                                      <Label htmlFor="full-trading" className="flex items-center space-x-2">
                                        Full Trading Authorization
                                        <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-500 rounded-full ml-1">i</span>
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  
                  {renderSectionNavigation("tradingAuthority", false, false)}
                </section>
              )}
              
              {currentSection === 'tradingOptions' && (
                <section className="space-y-6">
                  <h2 className="text-xl font-semibold border-b pb-2">Trading Options</h2>
                  <div className="space-y-6">
                    {/* Full Discretionary Trading */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={"addFullDiscretionaryTrading" as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Would you like to add Full Discretionary Trading?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-6"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="No" id="discretionary-no" />
                                  <Label htmlFor="discretionary-no">No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Yes" id="discretionary-yes" />
                                  <Label htmlFor="discretionary-yes">Yes</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Structured Product Trading */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={"addStructuredProductTrading" as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Would you like to add Structured Product Trading to this Account?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-6"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="No" id="structured-no" />
                                  <Label htmlFor="structured-no">No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Yes" id="structured-yes" />
                                  <Label htmlFor="structured-yes">Yes</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Complex ETPs Trading */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={"tradeComplexETPs" as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Would you like to trade complex ETPs (including cryptocurrency)?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-6"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="No" id="complex-etps-no" />
                                  <Label htmlFor="complex-etps-no">No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Yes" id="complex-etps-yes" />
                                  <Label htmlFor="complex-etps-yes">Yes</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Options Trading */}
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name={"addOptionsTrading" as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-base font-medium">Would you like to add Options Trading to this account?</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex space-x-6"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="No" id="options-no" />
                                  <Label htmlFor="options-no">No</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="Yes" id="options-yes" />
                                  <Label htmlFor="options-yes">Yes</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Options Level - conditional on Options Trading = Yes */}
                    {form.watch('addOptionsTrading' as any) === 'Yes' && (
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name={"optionsLevel" as any}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-base font-medium">Select Options Trading Level:</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  className="space-y-3"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Level 1" id="options-level-1" />
                                    <Label htmlFor="options-level-1" className="flex items-center space-x-2">
                                      Level 1
                                      <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-blue-500 rounded-full ml-1">i</span>
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                  
                  {renderSectionNavigation("tradingOptions", false, false)}
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
