import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";

interface FormLogicRule {
  "Account Type": string;
  "Program Type": string;
  "Registration Type": string;
  [key: string]: boolean | string;
}

interface NavLogicRule {
  "Account Type": string;
  "Program Type": string;
  "Registration Type": string;
  [key: string]: boolean | string;
}

const accountFormSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  accountType: z.string().min(1, "Account type is required"),
  programType: z.string().min(1, "Program type is required"),
  registrationType: z.string().min(1, "Registration type is required"),
  iraType: z.string().optional(),
  transferOnDeath: z.string().optional(),
  deliveringFirm: z.string().optional(),
  contraAccountNumber: z.string().optional(),
  investmentObjective: z.string().optional(),
  investmentTimeHorizon: z.string().optional(),
  fundsNeededIn: z.string().optional(),
  approximateAccountValue: z.string().optional(),
  expectedAccountValue: z.string().optional(),
  advisorFee: z.string().optional(),
  advisoryBillingCycle: z.string().optional(),
  decedentName: z.string().optional(),
  dateOfDeath: z.string().optional(),
  distributionTypes: z.string().optional(),
  optionsLevel1: z.boolean().default(false),
  optionsLevel2: z.boolean().default(false),
  optionsLevel3: z.boolean().default(false),
  optionsLevel4: z.boolean().default(false),
  optionsLevel5: z.boolean().default(false),
  marginEnabled: z.boolean().default(false),
  fdtEnabled: z.boolean().default(false),
  sptEnabled: z.boolean().default(false),
  etpEnabled: z.boolean().default(false),
  notes: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

const sectionMap = {
  'ACH Information': 'achInfo',
  'Additional Account Holders': 'additionalHolders',
  'Account Options': 'accountOptions',
  'Beneficiaries': 'beneficiaries',
  'Trading Authority': 'tradingAuthority',
  'Trading Options': 'tradingOptions',
  'Direct/Outside Business': 'directOutsideBusiness',
  '529 Plan Disclosure Checklist': 'planDisclosureChecklist',
  'Trust Account Information': 'trustAccountInfo',
  'Power of Attorney': 'powerOfAttorney'
};

export default function AccountForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSection, setCurrentSection] = useState('accountInfo');
  const [formLogicData, setFormLogicData] = useState<FormLogicRule[]>([]);
  const [navLogicData, setNavLogicData] = useState<NavLogicRule[]>([]);
  const [listsData, setListsData] = useState<Record<string, string[]>>({});
  const [visibleSections, setVisibleSections] = useState<string[]>(['accountInfo']);
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());

  // Get client ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('clientId');

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      clientId: clientId ? parseInt(clientId) : 0,
      accountType: "",
      programType: "",
      registrationType: "",
      optionsLevel1: false,
      optionsLevel2: false,
      optionsLevel3: false,
      optionsLevel4: false,
      optionsLevel5: false,
      marginEnabled: false,
      fdtEnabled: false,
      sptEnabled: false,
      etpEnabled: false,
    },
  });

  // Load configuration data
  useEffect(() => {
    Promise.all([
      fetch('/static/form-logic.json').then(r => r.json()),
      fetch('/static/nav-logic.json').then(r => r.json()),
      fetch('/api/lists').then(r => r.json())
    ])
    .then(([formData, navData, lists]) => {
      setFormLogicData(formData);
      setNavLogicData(navData);
      setListsData(lists);
    })
    .catch(console.error);
  }, []);

  // Watch form values to trigger dynamic updates
  const accountType = form.watch('accountType');
  const programType = form.watch('programType');
  const registrationType = form.watch('registrationType');

  // Update form logic when key fields change
  useEffect(() => {
    updateFormLogic();
  }, [accountType, programType, registrationType, formLogicData, navLogicData]);

  const updateFormLogic = () => {
    if (!formLogicData.length || !navLogicData.length) return;

    // Find matching form logic rule
    const formRule = formLogicData.find(rule => 
      rule['Account Type'] === accountType &&
      rule['Program Type'] === programType &&
      rule['Registration Type'] === registrationType
    );

    // Find matching nav logic rule
    const navRule = navLogicData.find(rule => 
      rule['Account Type'] === accountType &&
      rule['Program Type'] === programType &&
      rule['Registration Type'] === registrationType
    );

    // Update visible sections based on nav logic
    const newVisibleSections = ['accountInfo'];
    if (navRule) {
      Object.keys(sectionMap).forEach(sectionName => {
        const unhideKey = `Unhide ${sectionName}`;
        if (navRule[unhideKey] === true) {
          newVisibleSections.push(sectionMap[sectionName as keyof typeof sectionMap]);
        }
      });
    }
    setVisibleSections(newVisibleSections);

    // Update hidden fields based on form logic
    const newHiddenFields = new Set<string>();
    if (formRule) {
      Object.keys(formRule).forEach(key => {
        if (key.startsWith('Unhide ') && formRule[key] === false) {
          const fieldName = key.replace('Unhide ', '').toLowerCase().replace(/\s+/g, '');
          newHiddenFields.add(fieldName);
        }
      });
    }
    setHiddenFields(newHiddenFields);
  };

  // Update registration type options based on account and program type
  const getRegistrationTypes = () => {
    if (!formLogicData.length) return [];
    
    return formLogicData
      .filter(rule => 
        rule['Account Type'] === accountType &&
        rule['Program Type'] === programType
      )
      .map(rule => rule['Registration Type'])
      .filter((value, index, array) => array.indexOf(value) === index);
  };

  const mutation = useMutation({
    mutationFn: async (data: AccountFormData) => {
      return await apiRequest("POST", "/api/accounts", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Account created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      setLocation('/accounts');
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AccountFormData) => {
    mutation.mutate(data);
  };

  const isFieldVisible = (fieldName: string) => {
    const normalizedFieldName = fieldName.toLowerCase().replace(/\s+/g, '');
    return !hiddenFields.has(normalizedFieldName);
  };

  const renderAccountInfoSection = () => (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="accountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {listsData['Account Type']?.map((type) => (
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

          <FormField
            control={form.control}
            name="programType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select program type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {listsData['Program Type']?.map((type) => (
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

          <FormField
            control={form.control}
            name="registrationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select registration type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getRegistrationTypes().map((type) => (
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

        {isFieldVisible('Investment Objective') && (
          <FormField
            control={form.control}
            name="investmentObjective"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Investment Objective</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select investment objective" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {listsData['Investment Objective']?.map((obj) => (
                      <SelectItem key={obj} value={obj}>
                        {obj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isFieldVisible('Investment Time Horizon') && (
            <FormField
              control={form.control}
              name="investmentTimeHorizon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Investment Time Horizon</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time horizon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {listsData['Investment Time Horizon']?.map((horizon) => (
                        <SelectItem key={horizon} value={horizon}>
                          {horizon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {isFieldVisible('Funds Needed In') && (
            <FormField
              control={form.control}
              name="fundsNeededIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funds Needed In</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timeframe" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {listsData['Liquidity Needs Timeframe']?.map((timeframe) => (
                        <SelectItem key={timeframe} value={timeframe}>
                          {timeframe}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {isFieldVisible('Approximate Account Value') && (
          <FormField
            control={form.control}
            name="approximateAccountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Approximate Account Value</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter approximate value" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );

  const renderSidebarNav = () => (
    <div className="w-64 bg-gray-50 p-4 space-y-2">
      <h3 className="font-semibold text-gray-900 mb-4">Form Sections</h3>
      
      <button
        onClick={() => setCurrentSection('accountInfo')}
        className={`w-full text-left p-3 rounded-lg transition-colors ${
          currentSection === 'accountInfo'
            ? 'bg-blue-100 text-blue-700 border border-blue-200'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        Account Information
      </button>

      {Object.entries(sectionMap).map(([sectionName, sectionId]) => {
        const isVisible = visibleSections.includes(sectionId);
        return (
          <button
            key={sectionId}
            onClick={() => isVisible && setCurrentSection(sectionId)}
            disabled={!isVisible}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              !isVisible
                ? 'opacity-50 cursor-not-allowed text-gray-400'
                : currentSection === sectionId
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            {sectionName}
            {!isVisible && <EyeOff className="inline ml-2 h-4 w-4" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/accounts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Accounts
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create New Account</h1>
          </div>
          <Badge variant="outline">
            Client ID: {clientId || 'Not specified'}
          </Badge>
        </div>
      </div>

      <div className="flex">
        {renderSidebarNav()}
        
        <div className="flex-1 p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {currentSection === 'accountInfo' && renderAccountInfoSection()}
              
              {currentSection === 'additionalHolders' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Account Holders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">Additional account holder information will be implemented here.</p>
                  </CardContent>
                </Card>
              )}

              {currentSection === 'achInfo' && (
                <Card>
                  <CardHeader>
                    <CardTitle>ACH Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">ACH banking information will be implemented here.</p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setLocation('/accounts')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Creating..." : "Create Account"}
                  <Save className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}