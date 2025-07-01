import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertClientAgreementSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";
import { Plus, Eye, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";

const createAgreementSchema = insertClientAgreementSchema.extend({
  agreementDate: z.string().min(1, "Agreement date is required"),
  businessLine: z.string().min(1, "Business line is required"),
});

type CreateAgreementData = z.infer<typeof createAgreementSchema>;

export default function ClientAgreementsPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [accountConfigurations, setAccountConfigurations] = useState<{[accountId: number]: any}>({});
  const [additionalFormData, setAdditionalFormData] = useState({
    // Step 4 - Advisor Information
    advisorName: "",
    iarRepCode: "",
    primaryClientName: "",
    secondaryClientName: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateAgreementData>({
    resolver: zodResolver(createAgreementSchema),
    defaultValues: {
      businessLine: "",
      householdId: 0,
      version: 1,
      agreementDate: new Date().toISOString().split('T')[0],
      status: "active",
    },
  });

  // Fetch all households for the dropdown
  const { data: householdsResponse } = useQuery({
    queryKey: ["/api/households"],
  });
  const households = (householdsResponse as any)?.households || [];

  // Fetch accounts for selected household
  const selectedHouseholdId = form.watch("householdId");
  const { data: householdAccounts = [] } = useQuery({
    queryKey: ["/api/households", selectedHouseholdId, "accounts"],
    queryFn: () => selectedHouseholdId ? fetch(`/api/households/${selectedHouseholdId}/accounts`).then(res => res.json()) : [],
    enabled: !!selectedHouseholdId,
  });

  // Fetch all client agreements
  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ["/api/client-agreements"],
  });
  const agreementsArray = Array.isArray(agreements) ? agreements : [];

  const businessLineOptions = [
    { value: "SWP", label: "Stratos Wealth Partners (SWP)" },
    { value: "SWA", label: "Stratos Wealth Advisors (SWA)" },
  ];

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrevious = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleNewAgreement = () => {
    setCurrentStep(1);
    setIsCreateDialogOpen(true);
    form.reset();
    // Reset additional form data
    setAdditionalFormData({
      advisorName: "",
      iarRepCode: "",
      primaryClientName: "",
      secondaryClientName: "",
    });
    // Reset account selection and configurations
    setSelectedAccounts([]);
    setAccountConfigurations({});
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateAgreementData) => {
      const payload = {
        ...data,
        householdId: parseInt(data.householdId.toString()),
      };
      return apiRequest("POST", "/api/client-agreements", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-agreements"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Client agreement created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client agreement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/client-agreements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-agreements"] });
      toast({
        title: "Success",
        description: "Client agreement deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client agreement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAgreementData) => {
    // Merge the basic form data with additional form data
    const completeData = {
      ...data,
      ...additionalFormData
    };
    console.log('Submitting complete form data:', completeData);
    createMutation.mutate(data); // For now, just send basic data to prevent server errors
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this client agreement?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownloadPDF = (agreementId: number, fileName: string) => {
    // Create a link to download the PDF
    const link = document.createElement('a');
    link.href = `/api/client-agreements/${agreementId}/download`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHouseholdName = (householdId: number) => {
    const household = households.find((h: any) => h.id === householdId);
    return household?.householdName || `Household ${householdId}`;
  };

  const getPrimaryClientName = () => {
    const selectedHouseholdId = form.watch("householdId");
    if (!selectedHouseholdId || !households) return "";
    
    const household = households.find((h: any) => h.id === Number(selectedHouseholdId));
    if (!household) return "";
    
    // Find the primary contact (first member) of the household
    const primaryClient = household.primaryContactName;
    return primaryClient || "";
  };

  const getOtherHouseholdMembers = () => {
    const selectedHouseholdId = form.watch("householdId");
    if (!selectedHouseholdId || !households) return [];
    
    const household = households.find((h: any) => h.id === Number(selectedHouseholdId));
    if (!household || !household.members) return [];
    
    // Return all members except the primary (first) member
    return household.members.slice(1).map((member: any) => ({
      id: member.id,
      name: `${member.firstName || ''} ${member.lastName || ''}`.trim()
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "superseded":
        return "secondary";
      case "void":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar currentView="client-agreements" />
      <div className="lg:ml-64">
        <TopBar 
          title="Client Agreements" 
          subtitle="Manage household client agreements and PDF documents"
        />
        
        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Client Agreements
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create and manage client agreements for households
              </p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewAgreement}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Agreement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Client Agreement</DialogTitle>
                  <DialogDescription>
                    Step {currentStep} of 5: Set up a new client agreement for a household.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    {/* Step 1: Business Line Selection */}
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="businessLine"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lg font-semibold">Business Line</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  {businessLineOptions.map((option) => (
                                    <div key={option.value} className="flex items-center space-x-3">
                                      <input
                                        type="radio"
                                        id={option.value}
                                        value={option.value}
                                        checked={field.value === option.value}
                                        onChange={(e) => field.onChange(e.target.value)}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                      />
                                      <label 
                                        htmlFor={option.value} 
                                        className="text-sm font-medium text-gray-900 cursor-pointer"
                                      >
                                        {option.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Step 2: Household Selection */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="householdId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lg font-semibold">Household</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a household" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {households.map((household: any) => (
                                    <SelectItem key={household.id} value={household.id.toString()}>
                                      {household.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Step 3: Account Selection */}
                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">Select Accounts</h3>
                          <p className="text-sm text-gray-600">Choose which accounts to include in this agreement.</p>
                        </div>

                        {/* Dynamic accounts from selected household */}
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {selectedHouseholdId ? (
                            householdAccounts.length > 0 ? (
                              <div className="space-y-2">
                                {householdAccounts.map((account: any) => (
                                  <div key={account.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                                    <input
                                      type="checkbox"
                                      id={`account-${account.id}`}
                                      checked={selectedAccounts.includes(account.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedAccounts(prev => [...prev, account.id]);
                                        } else {
                                          setSelectedAccounts(prev => prev.filter(id => id !== account.id));
                                        }
                                      }}
                                      className="w-4 h-4 text-blue-600"
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {account.accountType} {account.programType}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Account #{account.id} • {account.registrationType}
                                        {account.approximateAccountValue && ` • ${account.approximateAccountValue}`}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">No accounts found for this household.</p>
                            )
                          ) : (
                            <p className="text-sm text-gray-500 italic">Please select a household first to view available accounts.</p>
                          )}
                        </div>

                        {selectedAccounts.length > 0 && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>{selectedAccounts.length}</strong> account{selectedAccounts.length !== 1 ? 's' : ''} selected for this agreement.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 4: Account Configuration */}
                    {currentStep === 4 && (
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">Account Configuration</h3>
                          <p className="text-sm text-gray-600">Configure each selected account's details for the agreement.</p>
                        </div>

                        {selectedAccounts.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No accounts selected. Please go back and select accounts first.</p>
                        ) : (
                          <div className="space-y-6">
                            {selectedAccounts.map((accountId) => {
                              const account = householdAccounts.find((acc: any) => acc.id === accountId);
                              if (!account) return null;
                              
                              return (
                                <div key={accountId} className="border rounded-lg p-4 space-y-4">
                                  <h4 className="font-medium text-gray-900">
                                    {account.accountType} {account.programType} Account #{account.id}
                                  </h4>
                                
                                {/* Configuration fields based on the image requirements */}
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">SIM Fee</Label>
                                    <Input 
                                      placeholder="Enter SIM fee" 
                                      value={accountConfigurations[accountId]?.simFee || ''}
                                      onChange={(e) => setAccountConfigurations(prev => ({
                                        ...prev,
                                        [accountId]: { ...prev[accountId], simFee: e.target.value }
                                      }))}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Advisor Fee</Label>
                                    <Input 
                                      placeholder="Enter advisor fee" 
                                      value={accountConfigurations[accountId]?.advisorFee || ''}
                                      onChange={(e) => setAccountConfigurations(prev => ({
                                        ...prev,
                                        [accountId]: { ...prev[accountId], advisorFee: e.target.value }
                                      }))}
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Liquidity Needs</Label>
                                    <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                      ...prev,
                                      [accountId]: { ...prev[accountId], liquidityNeeds: value }
                                    }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select yes or no" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {/* Conditional RMD/Other dropdown when Liquidity Needs = Yes */}
                                    {accountConfigurations[accountId]?.liquidityNeeds === "yes" && (
                                      <div className="mt-2">
                                        <Label className="text-sm font-medium">Liquidity Type</Label>
                                        <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                          ...prev,
                                          [accountId]: { ...prev[accountId], liquidityType: value }
                                        }))}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="rmd">RMD</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Transaction Charges</Label>
                                    <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                      ...prev,
                                      [accountId]: { ...prev[accountId], transactionCharges: value }
                                    }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select transaction charges" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unwrapped">Unwrapped</SelectItem>
                                        <SelectItem value="wrapped">Wrapped</SelectItem>
                                        <SelectItem value="sub-advised">Sub-Advised</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Investment Objective</Label>
                                    <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                      ...prev,
                                      [accountId]: { ...prev[accountId], investmentObjective: value }
                                    }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select objective" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="income-capital-preservation">Income with Capital Preservation</SelectItem>
                                        <SelectItem value="income-moderate-growth">Income with Moderate Growth</SelectItem>
                                        <SelectItem value="growth-with-income">Growth with Income</SelectItem>
                                        <SelectItem value="growth">Growth</SelectItem>
                                        <SelectItem value="aggressive-growth">Aggressive Growth</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Time Horizon</Label>
                                    <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                      ...prev,
                                      [accountId]: { ...prev[accountId], timeHorizon: value }
                                    }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select time horizon" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="0-3">0-3 years</SelectItem>
                                        <SelectItem value="3-5">3-5 years</SelectItem>
                                        <SelectItem value="5-10">5-10 years</SelectItem>
                                        <SelectItem value="10+">10+ years</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Custodian</Label>
                                    <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                      ...prev,
                                      [accountId]: { ...prev[accountId], custodian: value }
                                    }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select custodian" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="schwab">Schwab</SelectItem>
                                        <SelectItem value="fidelity">Fidelity</SelectItem>
                                        <SelectItem value="lpl">LPL</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Is this a Solicitor Referred Account?</Label>
                                    <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                      ...prev,
                                      [accountId]: { ...prev[accountId], solicitorReferred: value }
                                    }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select yes or no" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Is this a qualified account?</Label>
                                    <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                      ...prev,
                                      [accountId]: { ...prev[accountId], qualifiedAccount: value }
                                    }))}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select yes or no" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="yes">Yes</SelectItem>
                                        <SelectItem value="no">No</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    {/* Conditional Source of Funds dropdown when Qualified Account = Yes */}
                                    {accountConfigurations[accountId]?.qualifiedAccount === "yes" && (
                                      <div className="mt-2">
                                        <Label className="text-sm font-medium">Source of Funds</Label>
                                        <Select onValueChange={(value) => setAccountConfigurations(prev => ({
                                          ...prev,
                                          [accountId]: { ...prev[accountId], sourceOfFunds: value }
                                        }))}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select source" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="incoming-transfer">Incoming Transfer (from another firm)</SelectItem>
                                            <SelectItem value="rollover-qualified-plan">Rollover from a Qualified Plan</SelectItem>
                                            <SelectItem value="roth-conversion">Roth Conversion</SelectItem>
                                            <SelectItem value="contribution-only">Contribution Only</SelectItem>
                                            <SelectItem value="death-distribution">Death Distribution/Inherited IRA</SelectItem>
                                            <SelectItem value="change-management-fees">Change in Acct Management/Fees (i.e. Stratos as Advisor, SWM to MAN, etc)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    {/* Empty space for symmetry */}
                                  </div>
                                </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 5: Agreement Details */}
                    {currentStep === 5 && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="agreementDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Agreement Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="version"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Version</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="1" 
                                    {...field} 
                                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Advisor Information</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="advisorName" className="text-sm font-medium">Advisor/Team Name</Label>
                              <Input 
                                id="advisorName" 
                                placeholder="Enter advisor or team name" 
                                className="mt-1"
                                value={additionalFormData.advisorName}
                                onChange={(e) => setAdditionalFormData(prev => ({ ...prev, advisorName: e.target.value }))}
                              />
                            </div>
                            <div>
                              <Label htmlFor="iarRepCode" className="text-sm font-medium">IAR Rep Code</Label>
                              <Input 
                                id="iarRepCode" 
                                placeholder="Representative code" 
                                className="mt-1"
                                value={additionalFormData.iarRepCode}
                                onChange={(e) => setAdditionalFormData(prev => ({ ...prev, iarRepCode: e.target.value }))}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Client Signatures</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="primaryClientName" className="text-sm font-medium">Primary Client Name</Label>
                              <Input 
                                id="primaryClientName" 
                                placeholder="Primary client name" 
                                className="mt-1"
                                value={additionalFormData.primaryClientName || getPrimaryClientName()}
                                onChange={(e) => setAdditionalFormData(prev => ({ ...prev, primaryClientName: e.target.value }))}
                                readOnly
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Secondary Client (Optional)</Label>
                              <Select onValueChange={(value) => setAdditionalFormData(prev => ({ ...prev, secondaryClientName: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select secondary client" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getOtherHouseholdMembers().map((member) => (
                                    <SelectItem key={member.id} value={member.name}>
                                      {member.name}
                                    </SelectItem>
                                  ))}
                                  {getOtherHouseholdMembers().length === 0 && (
                                    <SelectItem value="" disabled>
                                      No other household members available
                                    </SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agreement Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="superseded">Superseded</SelectItem>
                                  <SelectItem value="void">Void</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}



                    <DialogFooter className="flex justify-between">
                      <div className="flex space-x-2">
                        {currentStep > 1 && (
                          <Button type="button" variant="outline" onClick={handlePrevious}>
                            Previous
                          </Button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        {currentStep < 5 ? (
                          <Button 
                            type="button" 
                            onClick={handleNext}
                            disabled={
                              (currentStep === 1 && !form.watch("businessLine")) ||
                              (currentStep === 2 && !form.watch("householdId")) ||
                              (currentStep === 3 && selectedAccounts.length === 0)
                            }
                          >
                            Next
                          </Button>
                        ) : (
                          <Button 
                            type="submit" 
                            disabled={
                              createMutation.isPending ||
                              !additionalFormData.advisorName ||
                              !additionalFormData.primaryClientName
                            }
                          >
                            {createMutation.isPending ? "Creating..." : "Create Agreement"}
                          </Button>
                        )}
                      </div>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Client Agreements</CardTitle>
              <CardDescription>
                View and manage all client agreements across households
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading agreements...</div>
              ) : agreementsArray.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No client agreements found. Create your first agreement to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Household</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Agreement Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>PDF</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agreementsArray.map((agreement: any) => (
                      <TableRow key={agreement.id}>
                        <TableCell className="font-medium">
                          {getHouseholdName(agreement.householdId)}
                        </TableCell>
                        <TableCell>v{agreement.version}</TableCell>
                        <TableCell>
                          {format(new Date(agreement.agreementDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(agreement.status) as any}>
                            {agreement.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(agreement.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {agreement.pdfFileName ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDownloadPDF(agreement.id, agreement.pdfFileName)}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          ) : (
                            <span className="text-gray-400 text-sm">Not generated</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDelete(agreement.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}