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
        'Manager Access Network',
        'Manager Access Select',
        'Manager Select',
        'Unified Managed Account'
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
        'Brokerage': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'Direct Business': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'Manager Access Network': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'Manager Access Select': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'Manager Select': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'MWP': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'MWP RIA': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'OMP - Advisory': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'OMP RIA': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'PWP': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'PWP RIA': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'SAM': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property'],
        'SWM': ['Joint Tenants with Rights of Survivorship', 'Tenants in Common', 'Joint Tenants in Common', 'Community Property']
      },
      'IRA': {
        'Brokerage': ['Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', 'Rollover IRA', 'Beneficiary IRA', 'Beneficiary Roth IRA'],
        'Manager Access Network': ['Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', 'Rollover IRA', 'Beneficiary IRA', 'Beneficiary Roth IRA'],
        'Manager Access Select': ['Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', 'Rollover IRA', 'Beneficiary IRA', 'Beneficiary Roth IRA'],
        'Manager Select': ['Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', 'Rollover IRA', 'Beneficiary IRA', 'Beneficiary Roth IRA'],
        'Unified Managed Account': ['Traditional IRA', 'Roth IRA', 'SEP IRA', 'SIMPLE IRA', 'Rollover IRA', 'Beneficiary IRA', 'Beneficiary Roth IRA']
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

    // Default visibility
    let showDeliveringFirm = true;
    let showContraAccount = true;
    let showIraType = false;

    // Hide ACAT instructions for Joint accounts
    if (accountType === 'Joint') {
      showDeliveringFirm = false;
      showContraAccount = false;
    }

    // Show IRA Type for IRA accounts
    if (accountType === 'IRA') {
      showIraType = true;
    }

    return {
      showDeliveringFirm,
      showContraAccount,
      showIraType,
      showTransferOnDeath: true,
      showBeneficiaries: regTypesRequireBenef.includes(registrationType || '') || transferOnDeath === 'Yes',
      showAdditionalHolder: regTypesRequireHolder.includes(registrationType || '') || accountType?.toLowerCase().includes('joint'),
      showInvestmentObjective: true,
      showInvestmentTimeHorizon: true,
      showFundsNeededIn: true,
      showApproximateAccountValue: true,
      showExpectedAccountValue: false
    };
  }, [accountType, programType, registrationType, transferOnDeath]);

  const {
    showDeliveringFirm,
    showContraAccount,
    showIraType,
    showTransferOnDeath,
    showBeneficiaries,
    showAdditionalHolder,
    showInvestmentObjective,
    showInvestmentTimeHorizon,
    showFundsNeededIn,
    showApproximateAccountValue,
    showExpectedAccountValue
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

      {/* Transfer on Death */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Transfer on Death</h3>
        <p className="font-medium">Include Transfer on Death (TOD)?</p>
        <div className="inline-flex border rounded-lg overflow-hidden">
          <button
            type="button"
            className={`px-4 py-2 ${
              transferOnDeath === "No" 
                ? "bg-blue-100 text-blue-800" 
                : "text-gray-600 hover:bg-blue-100 hover:text-blue-800"
            }`}
            onClick={() => toggleTOD("No")}
          >
            No
          </button>
          <button
            type="button"
            className={`px-4 py-2 ${
              transferOnDeath === "Yes" 
                ? "bg-blue-100 text-blue-800" 
                : "text-gray-600 hover:bg-blue-100 hover:text-blue-800"
            }`}
            onClick={() => toggleTOD("Yes")}
          >
            Yes
          </button>
        </div>
      </div>

      {/* Suitability */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Suitability</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    {lists?.["Investment Objective"]?.map((obj: string) => (
                      <SelectItem key={obj} value={obj}>{obj}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    {/* Provide numerical value ranges for account values */}
                    {[
                      "Under $10,000",
                      "$10,000 - $25,000",
                      "$25,000 - $50,000",
                      "$50,000 - $100,000",
                      "$100,000 - $250,000",
                      "$250,000 - $500,000",
                      "$500,000 - $1,000,000",
                      "$1,000,000 - $2,500,000",
                      "$2,500,000 - $5,000,000",
                      "$5,000,000 - $10,000,000",
                      "Over $10,000,000"
                    ].map((value: string) => (
                      <SelectItem key={value} value={value}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
        </div>

        {/* Investment Horizon */}
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
                      {lists?.["Investment Time Horizon"]?.map((horizon: string) => (
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
                      {lists?.["Funds Needed In"]?.map((period: string) => (
                        <SelectItem key={period} value={period}>{period}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </section>
  );

  const renderAchInfoSection = () => (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold border-b pb-2">ACH Information</h2>
      
      <div className="space-y-6">
        {form.watch("achAccounts").map((_, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>ACH Account #{index + 1}</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAchAccount(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name={`achAccounts.${index}.bankName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`achAccounts.${index}.accountType`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Checking">Checking</SelectItem>
                          <SelectItem value="Savings">Savings</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`achAccounts.${index}.routingNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          pattern="\d{9}" 
                          maxLength={9}
                          placeholder="9 digits"
                          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`achAccounts.${index}.accountNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Button
          type="button"
          onClick={addAchAccount}
          className="text-blue-600 hover:underline"
          variant="ghost"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add ACH Account
        </Button>
      </div>
    </section>
  );

  const renderBeneficiariesSection = () => {
    if (!shouldShowBeneficiaries) {
      return (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Beneficiaries</h2>
          <p className="text-gray-600">Beneficiaries are not required for this account configuration.</p>
        </section>
      );
    }

    return (
      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Beneficiaries</h2>
        
        <div className="space-y-6">
          {form.watch("beneficiaries").map((_, index) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Beneficiary #{index + 1}</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBeneficiary(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name={`beneficiaries.${index}.relationship`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {lists?.["Bene Relation"]?.map((rel: string) => (
                              <SelectItem key={rel} value={rel}>{rel}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`beneficiaries.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {lists?.["Bene Type"]?.map((type: string) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name={`beneficiaries.${index}.firstName`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="First Name" />
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Last Name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`beneficiaries.${index}.percentage`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentage</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              placeholder="%" 
                              min="0" 
                              max="100" 
                              className="pr-10"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Button
            type="button"
            onClick={addBeneficiary}
            className="text-blue-600 hover:underline"
            variant="ghost"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>
      </section>
    );
  };

  const renderAdditionalHolderSection = () => {
    const registrationType = form.watch("registrationType");
    const shouldShowAdditionalHolder = ["Joint Tenants with Rights of Survivorship", "Tenants in Common", "Joint Tenants in Common"].includes(registrationType);
    
    if (!shouldShowAdditionalHolder) {
      return (
        <section className="space-y-6">
          <h2 className="text-xl font-semibold border-b pb-2">Additional Account Holders</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">Additional account holders are not required for the selected registration type: <strong>{registrationType || "None selected"}</strong></p>
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Additional Account Holders</h2>
        
        <Card>
          <CardContent className="space-y-6 pt-6">
            <h3 className="text-lg font-semibold">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="additionalHolder.firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalHolder.lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h3 className="text-lg font-semibold">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="additionalHolder.homePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Home Phone</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="tel"
                        placeholder="e.g. 5551234567"
                        pattern="\d{10}"
                        maxLength={10}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                      />
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
                      <Input 
                        {...field} 
                        type="tel"
                        placeholder="e.g. 5552345678"
                        pattern="\d{10}"
                        maxLength={10}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                      />
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
                      <Input 
                        {...field} 
                        type="tel"
                        placeholder="e.g. 5553456789"
                        pattern="\d{10}"
                        maxLength={10}
                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <h3 className="text-lg font-semibold">Employment Information</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="additionalHolder.employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lists?.["Employment Status"]?.map((status: string) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lists?.["Industry"]?.map((industry: string) => (
                          <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
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
                      <Input {...field} placeholder="Occupation" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    );
  };

  const renderTradingAuthoritySection = () => (
    <section className="space-y-6">
      <h2 className="text-xl font-semibold border-b pb-2">Trading Authority</h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          <strong>Note:</strong> Trading authority allows designated individuals to make investment decisions on behalf of the account holder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authorized Person Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authorized Person Name
              </label>
              <Input 
                placeholder="Full name of authorized person"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship to Account Holder
              </label>
              <Select>
                <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="sibling">Sibling</SelectItem>
                  <SelectItem value="attorney">Attorney</SelectItem>
                  <SelectItem value="financial-advisor">Financial Advisor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <Input 
                type="tel"
                placeholder="e.g. (555) 123-4567"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input 
                type="email"
                placeholder="authorized@example.com"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Authority Level</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox id="full-authority" />
                <label htmlFor="full-authority" className="text-sm font-medium">
                  Full Trading Authority (Buy, Sell, Transfer)
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox id="limited-authority" />
                <label htmlFor="limited-authority" className="text-sm font-medium">
                  Limited Authority (Sell Only)
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );

  const renderSpecialAccountsSection = () => {
    const accountType = form.watch("accountType");
    const showTrustInfo = accountType?.toLowerCase().includes("trust");
    const show529Info = accountType?.toLowerCase().includes("529") || accountType?.toLowerCase().includes("education");

    return (
      <section className="space-y-6">
        <h2 className="text-xl font-semibold border-b pb-2">Special Account Configuration</h2>
        
        {showTrustInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Trust Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trust Name
                  </label>
                  <Input 
                    placeholder="Name of the trust"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trust Date
                  </label>
                  <Input 
                    type="date"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trustee Name
                  </label>
                  <Input 
                    placeholder="Name of the trustee"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Successor Trustee
                  </label>
                  <Input 
                    placeholder="Name of successor trustee"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {show529Info && (
          <Card>
            <CardHeader>
              <CardTitle>529 Education Plan Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beneficiary Name
                  </label>
                  <Input 
                    placeholder="Student beneficiary name"
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Beneficiary SSN
                  </label>
                  <Input 
                    placeholder="XXX-XX-XXXX"
                    maxLength={11}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State Plan
                  </label>
                  <Select>
                    <SelectTrigger className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400">
                      <SelectValue placeholder="Select state plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="california">California</SelectItem>
                      <SelectItem value="new-york">New York</SelectItem>
                      <SelectItem value="florida">Florida</SelectItem>
                      <SelectItem value="texas">Texas</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Contribution
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                    <Input 
                      type="number"
                      placeholder="0.00"
                      className="w-full p-3 pl-8 border rounded-lg focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Automatic Investment</h3>
                <div className="flex items-center space-x-3">
                  <Checkbox id="auto-investment" />
                  <label htmlFor="auto-investment" className="text-sm font-medium">
                    Set up automatic monthly contributions
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!showTrustInfo && !show529Info && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <p className="text-gray-600 text-center">
              No special configuration required for the selected account type: <strong>{accountType || "None selected"}</strong>
            </p>
          </div>
        )}
      </section>
    );
  };

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
                : 'text-gray-700 hover:bg-white hover:border-l-4 hover:border-blue-800'
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
                : 'text-gray-700 hover:bg-white hover:border-l-4 hover:border-blue-800'
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
                : 'text-gray-700 hover:bg-white hover:border-l-4 hover:border-blue-800'
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
                : 'text-gray-700 hover:bg-white hover:border-l-4 hover:border-blue-800'
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
                : 'text-gray-700 hover:bg-white hover:border-l-4 hover:border-blue-800'
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
                : 'text-gray-700 hover:bg-white hover:border-l-4 hover:border-blue-800'
            }`}
            onClick={() => setCurrentSection('specialAccounts')}
          >
            Special Accounts
          </button>
          
          {/* Required Fields Summary */}
          <div className="mb-4 p-4 bg-gray-50 border-l-4 border-orange-300 text-gray-800 rounded">
            <div>
              <strong>Required fields for this selection:</strong>
              <ul className="list-disc ml-6 mt-1">
                <li className={clientId ? "text-green-600" : "text-red-600 font-semibold"}>Client Selection</li>
                <li className={watchedValues.repId ? "text-green-600" : "text-red-600 font-semibold"}>Rep ID</li>
                <li className={watchedValues.accountType ? "text-green-600" : "text-red-600 font-semibold"}>Account Type</li>
                <li className={watchedValues.programType ? "text-green-600" : "text-red-600 font-semibold"}>Program Type</li>
                <li className={watchedValues.registrationType ? "text-green-600" : "text-red-600 font-semibold"}>Registration Type</li>
                <li className={watchedValues.investmentObjective ? "text-green-600" : "text-red-600 font-semibold"}>Investment Objective</li>
                <li className={watchedValues.investmentTimeHorizon ? "text-green-600" : "text-red-600 font-semibold"}>Investment Time Horizon</li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Main Form Content */}
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
              {currentSection === 'achInfo' && renderAchInfoSection()}
              {currentSection === 'additionalHolders' && renderAdditionalHolderSection()}
              {currentSection === 'beneficiaries' && renderBeneficiariesSection()}
              {currentSection === 'tradingAuthority' && renderTradingAuthoritySection()}
              {currentSection === 'specialAccounts' && renderSpecialAccountsSection()}

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