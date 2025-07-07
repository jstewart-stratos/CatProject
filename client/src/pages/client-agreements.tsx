import { useState, useEffect } from "react";
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

// US States list for dropdown
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

const createAgreementSchema = insertClientAgreementSchema.extend({
  agreementDate: z.string().min(1, "Agreement date is required"),
  businessLine: z.string().min(1, "Business line is required"),
  templateId: z.number().min(1, "Template is required"),
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
    // Step 4 - Client Data
    primaryClient: {
      firstName: "",
      middleName: "",
      lastName: "",
      ssn: "",
      dateOfBirth: "",
      driverLicense: "",
      issuingState: "",
      expirationDate: "",
      homePhone: "",
      businessPhone: "",
      mobilePhone: "",
      emailAddress: "",
      legalAddress1: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      mailingAddress1: "",
      mailingCity: "",
      mailingState: "",
      mailingZipCode: "",
      mailingCountry: "",
      riskScore: "",
      annualIncome: "",
      netWorth: "",
      liquidNetWorth: "",
      taxBracket: "",
    },
    secondaryClient: {
      firstName: "",
      middleName: "",
      lastName: "",
      ssn: "",
      dateOfBirth: "",
      driverLicense: "",
      issuingState: "",
      expirationDate: "",
      homePhone: "",
      businessPhone: "",
      mobilePhone: "",
      emailAddress: "",
      legalAddress1: "",
      city: "",
      state: "",
      zipCode: "",
      mailingAddress1: "",
      mailingCity: "",
      mailingState: "",
      mailingZipCode: "",
      riskScore: "",
      annualIncome: "",
      netWorth: "",
      liquidNetWorth: "",
      taxBracket: "",
    },
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateAgreementData>({
    resolver: zodResolver(createAgreementSchema),
    defaultValues: {
      businessLine: "",
      householdId: 0,
      templateId: 0,
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

  // Fetch all clients for primary contact name lookup
  const { data: clientsData } = useQuery({
    queryKey: ["/api/clients"],
  });
  const clients = (clientsData as any)?.clients || [];

  // Fetch accounts for selected household
  const selectedHouseholdId = form.watch("householdId");
  const { data: householdAccounts = [] } = useQuery({
    queryKey: ["/api/households", selectedHouseholdId, "accounts"],
    queryFn: () => selectedHouseholdId ? fetch(`/api/households/${selectedHouseholdId}/accounts`).then(res => res.json()) : [],
    enabled: !!selectedHouseholdId,
  });

  // Fetch clients for selected household for secondary client dropdown
  const { data: householdClients = [] } = useQuery({
    queryKey: ["/api/households", selectedHouseholdId, "clients"],
    queryFn: () => selectedHouseholdId ? fetch(`/api/households/${selectedHouseholdId}/clients`).then(res => res.json()) : [],
    enabled: !!selectedHouseholdId,
  });

  // Fetch all client agreements
  const { data: agreements = [], isLoading } = useQuery({
    queryKey: ["/api/client-agreements"],
  });
  const agreementsArray = Array.isArray(agreements) ? agreements : [];

  // Fetch active templates for template selection
  const { data: activeTemplates = [] } = useQuery({
    queryKey: ["/api/templates/active"],
  });

  const businessLineOptions = [
    { value: "SWP", label: "Stratos Wealth Partners (SWP)" },
    { value: "SWA", label: "Stratos Wealth Advisors (SWA)" },
  ];

  // Auto-populate primary client name and data when household changes
  useEffect(() => {
    const primaryName = getPrimaryClientName();
    if (primaryName && selectedHouseholdId && primaryName !== "Not set" && primaryName !== "Not found") {
      // Get the primary client full data
      const household = households.find((h: any) => h.id === Number(selectedHouseholdId));
      if (household?.primaryContactClientId && clients.length > 0) {
        const primaryClient = clients.find((c: any) => c.id === household.primaryContactClientId);
        if (primaryClient) {
          setAdditionalFormData(prev => ({ 
            ...prev, 
            primaryClientName: primaryName,
            primaryClient: {
              firstName: primaryClient.firstName || "",
              middleName: primaryClient.middleName || "",
              lastName: primaryClient.lastName || "",
              ssn: primaryClient.ssn || "",
              dateOfBirth: primaryClient.dateOfBirth || "",
              driverLicense: "",
              issuingState: "",
              expirationDate: "",
              homePhone: primaryClient.homePhone || "",
              businessPhone: primaryClient.businessPhone || "",
              mobilePhone: primaryClient.mobilePhone || "",
              emailAddress: primaryClient.emailAddress || "",
              legalAddress1: primaryClient.legalAddress1 || "",
              city: primaryClient.city || "",
              state: primaryClient.state || "",
              zipCode: primaryClient.zipCode || "",
              country: "",
              mailingAddress1: primaryClient.mailingAddress1 || "",
              mailingCity: primaryClient.mailingCity || "",
              mailingState: primaryClient.mailingState || "",
              mailingZipCode: primaryClient.mailingZipCode || "",
              mailingCountry: "",
              riskScore: primaryClient.riskScore || "",
              annualIncome: primaryClient.annualIncome || "",
              netWorth: primaryClient.netWorth || "",
              liquidNetWorth: primaryClient.liquidNetWorth || "",
              taxBracket: primaryClient.taxBracket || "",
            }
          }));
        }
      }
    }
  }, [selectedHouseholdId, households, clients]);

  const handleNext = () => {
    if (currentStep < 9) setCurrentStep(currentStep + 1);
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

  // Direct PDF generation mutation - bypasses database complexity
  const directPdfMutation = useMutation({
    mutationFn: (completeData: any) => {
      return apiRequest("POST", "/api/generate-agreement-pdf", completeData);
    },
    onSuccess: (response: any) => {
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success", 
        description: `PDF generated successfully: ${response.fileName}`,
      });
      
      // Optionally refresh agreements list
      queryClient.invalidateQueries({ queryKey: ["/api/client-agreements"] });
      
      // Trigger download
      if (response.fileName) {
        window.open(`/api/download-generated-pdf/${response.fileName}`, '_blank');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate PDF",
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
    
    // Use direct PDF generation instead of database flow
    directPdfMutation.mutate(completeData);
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
    if (!selectedHouseholdId || !households || !clients) return "";
    
    const household = households.find((h: any) => h.id === Number(selectedHouseholdId));
    if (!household) return "";
    
    // Use the same logic as households page to get primary contact name
    if (!household.primaryContactClientId) return "Not set";
    
    const client = clients.find((c: any) => c.id === household.primaryContactClientId);
    return client ? `${client.firstName} ${client.lastName}` : "Not found";
  };

  const getOtherHouseholdMembers = () => {
    const selectedHouseholdId = form.watch("householdId");
    if (!selectedHouseholdId || !households || !householdClients) return [];
    
    const household = households.find((h: any) => h.id === Number(selectedHouseholdId));
    if (!household) return [];
    
    // Return all household clients except the primary contact
    return householdClients
      .filter((client: any) => client.id !== household.primaryContactClientId)
      .map((client: any) => ({
        id: client.id,
        name: `${client.firstName} ${client.lastName}`
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
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Client Agreement</DialogTitle>
                  <DialogDescription>
                    Step {currentStep} of 9: Set up a new client agreement for a household.
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

                    {/* Step 2: Template Selection */}
                    {currentStep === 2 && (
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="templateId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-lg font-semibold">Template Selection</FormLabel>
                              <FormControl>
                                <div className="space-y-3">
                                  {activeTemplates.map((template: any) => (
                                    <div key={template.id} className="flex items-center space-x-3">
                                      <input
                                        type="radio"
                                        id={`template-${template.id}`}
                                        value={template.id}
                                        checked={field.value === template.id}
                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                                      />
                                      <label 
                                        htmlFor={`template-${template.id}`}
                                        className="text-base font-medium cursor-pointer hover:text-blue-600"
                                      >
                                        {template.name}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Step 3: Household Selection */}
                    {currentStep === 3 && (
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

                    {/* Step 3: Client Signatures */}
                    {currentStep === 3 && (
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
                            <Select onValueChange={(value) => {
                              // Find the selected secondary client and auto-populate their data
                              const selectedMember = getOtherHouseholdMembers().find((member: any) => member.name === value);
                              if (selectedMember && householdClients) {
                                const secondaryClientData = householdClients.find((client: any) => client.id === selectedMember.id);
                                if (secondaryClientData) {
                                  setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClientName: value,
                                    secondaryClient: {
                                      firstName: secondaryClientData.firstName || "",
                                      middleName: secondaryClientData.middleName || "",
                                      lastName: secondaryClientData.lastName || "",
                                      ssn: secondaryClientData.ssn || "",
                                      dateOfBirth: secondaryClientData.dateOfBirth || "",
                                      driverLicense: "",
                                      issuingState: "",
                                      expirationDate: "",
                                      homePhone: secondaryClientData.homePhone || "",
                                      businessPhone: secondaryClientData.businessPhone || "",
                                      mobilePhone: secondaryClientData.mobilePhone || "",
                                      emailAddress: secondaryClientData.emailAddress || "",
                                      legalAddress1: secondaryClientData.legalAddress1 || "",
                                      city: secondaryClientData.city || "",
                                      state: secondaryClientData.state || "",
                                      zipCode: secondaryClientData.zipCode || "",
                                      mailingAddress1: secondaryClientData.mailingAddress1 || "",
                                      mailingCity: secondaryClientData.mailingCity || "",
                                      mailingState: secondaryClientData.mailingState || "",
                                      mailingZipCode: secondaryClientData.mailingZipCode || "",
                                      riskScore: secondaryClientData.riskScore || "",
                                      annualIncome: secondaryClientData.annualIncome || "",
                                      netWorth: secondaryClientData.netWorth || "",
                                      liquidNetWorth: secondaryClientData.liquidNetWorth || "",
                                      taxBracket: secondaryClientData.taxBracket || ""
                                    }
                                  }));
                                }
                              } else {
                                setAdditionalFormData(prev => ({ ...prev, secondaryClientName: value }));
                              }
                            }}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select secondary client" />
                              </SelectTrigger>
                              <SelectContent>
                                {getOtherHouseholdMembers().map((member: any) => (
                                  <SelectItem key={member.id} value={member.name}>
                                    {member.name}
                                  </SelectItem>
                                ))}
                                {getOtherHouseholdMembers().length === 0 && (
                                  <SelectItem value="none" disabled>
                                    No other household members available
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Household Data and Financial Information */}
                    {currentStep === 4 && (
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">Household Data and Financial Information</h3>
                          <p className="text-sm text-gray-600">Review and update client information for the agreement.</p>
                        </div>
                        
                        {/* Primary Client Information */}
                        <div className="border rounded-lg p-4 space-y-4">
                          <h4 className="font-medium text-gray-900">Primary Client Information</h4>
                          
                          {/* Name Row */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs font-medium">First Name</Label>
                              <Input 
                                placeholder="First name" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.firstName || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, firstName: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Middle Name</Label>
                              <Input 
                                placeholder="Middle name" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.middleName || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, middleName: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Last Name</Label>
                              <Input 
                                placeholder="Last name" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.lastName || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, lastName: e.target.value }
                                }))}
                              />
                            </div>
                          </div>

                          {/* SSN/TIN and DOB Row */}
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <Label className="text-xs font-medium">Social Security/Taxpayer ID #</Label>
                              <Input 
                                placeholder="SSN/TIN" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.ssn || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, ssn: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Type</Label>
                              <div className="flex gap-2 pt-1">
                                <label className="flex items-center text-xs">
                                  <input type="checkbox" className="mr-1" /> SSN
                                </label>
                                <label className="flex items-center text-xs">
                                  <input type="checkbox" className="mr-1" /> TIN
                                </label>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Date of Birth</Label>
                              <Input 
                                type="date"
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.dateOfBirth || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, dateOfBirth: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Citizenship Status</Label>
                              <div className="space-y-1 pt-1">
                                <label className="flex items-center text-xs">
                                  <input type="checkbox" className="mr-1" /> U.S. Citizen
                                </label>
                                <label className="flex items-center text-xs">
                                  <input type="checkbox" className="mr-1" /> Resident Alien
                                </label>
                                <label className="flex items-center text-xs">
                                  <input type="checkbox" className="mr-1" /> Non-Resident Alien
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Driver's License Row */}
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs font-medium">Driver's License, ID, or Passport #</Label>
                              <Input 
                                placeholder="ID number" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.driverLicense || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, driverLicense: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Issuing State or Country</Label>
                              <Input 
                                placeholder="State/Country" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.issuingState || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, issuingState: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Expiration Date</Label>
                              <Input 
                                type="date"
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.expirationDate || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, expirationDate: e.target.value }
                                }))}
                              />
                            </div>
                          </div>

                          {/* Phone and Email Row */}
                          <div className="grid grid-cols-5 gap-3">
                            <div>
                              <Label className="text-xs font-medium">Evening Phone</Label>
                              <Input 
                                placeholder="Evening phone" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.homePhone || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, homePhone: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Daytime Phone</Label>
                              <Input 
                                placeholder="Daytime phone" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.businessPhone || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, businessPhone: e.target.value }
                                }))}
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium">Mobile</Label>
                              <Input 
                                placeholder="Mobile" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.mobilePhone || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, mobilePhone: e.target.value }
                                }))}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs font-medium">Email</Label>
                              <Input 
                                placeholder="Email address" 
                                className="h-8 text-sm"
                                value={additionalFormData.primaryClient?.emailAddress || ""}
                                onChange={(e) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, emailAddress: e.target.value }
                                }))}
                              />
                            </div>
                          </div>

                          {/* Address Sections */}
                          <div className="grid grid-cols-2 gap-4">
                            {/* Legal Address */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Legal or Permanent Address</Label>
                              <div className="space-y-2">
                                <Input 
                                  placeholder="Address" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.primaryClient?.legalAddress1 || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    primaryClient: { ...prev.primaryClient, legalAddress1: e.target.value }
                                  }))}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <Input 
                                    placeholder="City" 
                                    className="h-8 text-sm"
                                    value={additionalFormData.primaryClient?.city || ""}
                                    onChange={(e) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      primaryClient: { ...prev.primaryClient, city: e.target.value }
                                    }))}
                                  />
                                  <Select value={additionalFormData.primaryClient?.state || ""} onValueChange={(value) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    primaryClient: { ...prev.primaryClient, state: value }
                                  }))}>
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {US_STATES.map((state) => (
                                        <SelectItem key={state.value} value={state.value}>
                                          {state.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input 
                                    placeholder="Zip/Postal" 
                                    className="h-8 text-sm"
                                    value={additionalFormData.primaryClient?.zipCode || ""}
                                    onChange={(e) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      primaryClient: { ...prev.primaryClient, zipCode: e.target.value }
                                    }))}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Mailing Address */}
                            <div className="space-y-2">
                              <Label className="text-xs font-medium">Mailing Address (if different from Legal Address)</Label>
                              <div className="space-y-2">
                                <Input 
                                  placeholder="Address" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.primaryClient?.mailingAddress1 || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    primaryClient: { ...prev.primaryClient, mailingAddress1: e.target.value }
                                  }))}
                                />
                                <div className="grid grid-cols-3 gap-2">
                                  <Input 
                                    placeholder="City" 
                                    className="h-8 text-sm"
                                    value={additionalFormData.primaryClient?.mailingCity || ""}
                                    onChange={(e) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      primaryClient: { ...prev.primaryClient, mailingCity: e.target.value }
                                    }))}
                                  />
                                  <Select value={additionalFormData.primaryClient?.mailingState || ""} onValueChange={(value) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    primaryClient: { ...prev.primaryClient, mailingState: value }
                                  }))}>
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {US_STATES.map((state) => (
                                        <SelectItem key={state.value} value={state.value}>
                                          {state.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input 
                                    placeholder="Zip/Postal" 
                                    className="h-8 text-sm"
                                    value={additionalFormData.primaryClient?.mailingZipCode || ""}
                                    onChange={(e) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      primaryClient: { ...prev.primaryClient, mailingZipCode: e.target.value }
                                    }))}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Secondary Client Information (if applicable) */}
                        {additionalFormData.secondaryClientName && (
                          <div className="border rounded-lg p-4 space-y-4">
                            <h4 className="font-medium text-gray-900">Secondary Client Information</h4>
                            
                            {/* Name Row */}
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs font-medium">First Name</Label>
                                <Input 
                                  placeholder="First name" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.firstName || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), firstName: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Middle Name</Label>
                                <Input 
                                  placeholder="Middle name" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.middleName || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), middleName: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Last Name</Label>
                                <Input 
                                  placeholder="Last name" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.lastName || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), lastName: e.target.value }
                                  }))}
                                />
                              </div>
                            </div>

                            {/* SSN/TIN and DOB Row */}
                            <div className="grid grid-cols-4 gap-3">
                              <div>
                                <Label className="text-xs font-medium">Social Security/Taxpayer ID #</Label>
                                <Input 
                                  placeholder="SSN/TIN" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.ssn || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), ssn: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Type</Label>
                                <div className="flex gap-2 pt-1">
                                  <label className="flex items-center text-xs">
                                    <input type="checkbox" className="mr-1" /> SSN
                                  </label>
                                  <label className="flex items-center text-xs">
                                    <input type="checkbox" className="mr-1" /> TIN
                                  </label>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Date of Birth</Label>
                                <Input 
                                  type="date"
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.dateOfBirth || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), dateOfBirth: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Citizenship Status</Label>
                                <div className="space-y-1 pt-1">
                                  <label className="flex items-center text-xs">
                                    <input type="checkbox" className="mr-1" /> U.S. Citizen
                                  </label>
                                  <label className="flex items-center text-xs">
                                    <input type="checkbox" className="mr-1" /> Resident Alien
                                  </label>
                                  <label className="flex items-center text-xs">
                                    <input type="checkbox" className="mr-1" /> Non-Resident Alien
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Driver's License Row */}
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <Label className="text-xs font-medium">Driver's License, ID, or Passport #</Label>
                                <Input 
                                  placeholder="ID number" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.driverLicense || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), driverLicense: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Issuing State or Country</Label>
                                <Input 
                                  placeholder="State/Country" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.issuingState || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), issuingState: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Expiration Date</Label>
                                <Input 
                                  type="date"
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.expirationDate || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), expirationDate: e.target.value }
                                  }))}
                                />
                              </div>
                            </div>

                            {/* Phone and Email Row */}
                            <div className="grid grid-cols-5 gap-3">
                              <div>
                                <Label className="text-xs font-medium">Evening Phone</Label>
                                <Input 
                                  placeholder="Evening phone" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.homePhone || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), homePhone: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Daytime Phone</Label>
                                <Input 
                                  placeholder="Daytime phone" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.businessPhone || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), businessPhone: e.target.value }
                                  }))}
                                />
                              </div>
                              <div>
                                <Label className="text-xs font-medium">Mobile</Label>
                                <Input 
                                  placeholder="Mobile" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.mobilePhone || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), mobilePhone: e.target.value }
                                  }))}
                                />
                              </div>
                              <div className="col-span-2">
                                <Label className="text-xs font-medium">Email</Label>
                                <Input 
                                  placeholder="Email address" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.secondaryClient?.emailAddress || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    secondaryClient: { ...(prev.secondaryClient || {}), emailAddress: e.target.value }
                                  }))}
                                />
                              </div>
                            </div>

                            {/* Address Sections */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Legal Address */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Legal or Permanent Address</Label>
                                <div className="space-y-2">
                                  <Input 
                                    placeholder="Address" 
                                    className="h-8 text-sm"
                                    value={additionalFormData.secondaryClient?.legalAddress1 || ""}
                                    onChange={(e) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      secondaryClient: { ...(prev.secondaryClient || {}), legalAddress1: e.target.value }
                                    }))}
                                  />
                                  <div className="grid grid-cols-3 gap-2">
                                    <Input 
                                      placeholder="City" 
                                      className="h-8 text-sm"
                                      value={additionalFormData.secondaryClient?.city || ""}
                                      onChange={(e) => setAdditionalFormData(prev => ({ 
                                        ...prev, 
                                        secondaryClient: { ...(prev.secondaryClient || {}), city: e.target.value }
                                      }))}
                                    />
                                    <Select value={additionalFormData.secondaryClient?.state || ""} onValueChange={(value) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      secondaryClient: { ...(prev.secondaryClient || {}), state: value }
                                    }))}>
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Select state" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {US_STATES.map((state) => (
                                          <SelectItem key={state.value} value={state.value}>
                                            {state.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input 
                                      placeholder="Zip/Postal" 
                                      className="h-8 text-sm"
                                      value={additionalFormData.secondaryClient?.zipCode || ""}
                                      onChange={(e) => setAdditionalFormData(prev => ({ 
                                        ...prev, 
                                        secondaryClient: { ...(prev.secondaryClient || {}), zipCode: e.target.value }
                                      }))}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Mailing Address */}
                              <div className="space-y-2">
                                <Label className="text-xs font-medium">Mailing Address (if different from Legal Address)</Label>
                                <div className="space-y-2">
                                  <Input 
                                    placeholder="Address" 
                                    className="h-8 text-sm"
                                    value={additionalFormData.secondaryClient?.mailingAddress1 || ""}
                                    onChange={(e) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      secondaryClient: { ...(prev.secondaryClient || {}), mailingAddress1: e.target.value }
                                    }))}
                                  />
                                  <div className="grid grid-cols-3 gap-2">
                                    <Input 
                                      placeholder="City" 
                                      className="h-8 text-sm"
                                      value={additionalFormData.secondaryClient?.mailingCity || ""}
                                      onChange={(e) => setAdditionalFormData(prev => ({ 
                                        ...prev, 
                                        secondaryClient: { ...(prev.secondaryClient || {}), mailingCity: e.target.value }
                                      }))}
                                    />
                                    <Select value={additionalFormData.secondaryClient?.mailingState || ""} onValueChange={(value) => setAdditionalFormData(prev => ({ 
                                      ...prev, 
                                      secondaryClient: { ...(prev.secondaryClient || {}), mailingState: value }
                                    }))}>
                                      <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Select state" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {US_STATES.map((state) => (
                                          <SelectItem key={state.value} value={state.value}>
                                            {state.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input 
                                      placeholder="Zip/Postal" 
                                      className="h-8 text-sm"
                                      value={additionalFormData.secondaryClient?.mailingZipCode || ""}
                                      onChange={(e) => setAdditionalFormData(prev => ({ 
                                        ...prev, 
                                        secondaryClient: { ...(prev.secondaryClient || {}), mailingZipCode: e.target.value }
                                      }))}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 5: Client Background */}
                    {currentStep === 5 && (
                      <div className="space-y-6 max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">Client Background</h3>
                          <p className="text-sm text-gray-600">Financial suitability information for the agreement.</p>
                        </div>
                        
                        {/* Primary Client Background */}
                        <div className="border rounded-lg p-4 space-y-4">
                          <h4 className="font-medium text-gray-900">Primary Client Background</h4>
                          
                          {/* Financial Information Grid */}
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Risk Score (Optional)</Label>
                                <Input 
                                  placeholder="Risk score" 
                                  className="h-8 text-sm"
                                  value={additionalFormData.primaryClient?.riskScore || ""}
                                  onChange={(e) => setAdditionalFormData(prev => ({ 
                                    ...prev, 
                                    primaryClient: { ...prev.primaryClient, riskScore: e.target.value }
                                  }))}
                                />
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Annual Income</Label>
                                <Select value={additionalFormData.primaryClient?.annualIncome || ""} onValueChange={(value) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, annualIncome: value }
                                }))}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select annual income" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">A = $24,999 or less</SelectItem>
                                    <SelectItem value="B">B = $25,000 to $49,999</SelectItem>
                                    <SelectItem value="C">C = $50,000 to $99,999</SelectItem>
                                    <SelectItem value="D">D = $100,000 to $249,999</SelectItem>
                                    <SelectItem value="E">E = $250,000 to $499,999</SelectItem>
                                    <SelectItem value="F">F = $500,000 to $749,999</SelectItem>
                                    <SelectItem value="G">G = $750,000 to 999,999</SelectItem>
                                    <SelectItem value="H">H = $1,000,000 to $4,999,999</SelectItem>
                                    <SelectItem value="I">I = $5,000,000 to $9,999,999</SelectItem>
                                    <SelectItem value="J">J = Over $10 million</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Net Worth<sup>1</sup></Label>
                                <Select value={additionalFormData.primaryClient?.netWorth || ""} onValueChange={(value) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, netWorth: value }
                                }))}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select net worth" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">A = $24,999 or less</SelectItem>
                                    <SelectItem value="B">B = $25,000 to $49,999</SelectItem>
                                    <SelectItem value="C">C = $50,000 to $99,999</SelectItem>
                                    <SelectItem value="D">D = $100,000 to $249,999</SelectItem>
                                    <SelectItem value="E">E = $250,000 to $499,999</SelectItem>
                                    <SelectItem value="F">F = $500,000 to $749,999</SelectItem>
                                    <SelectItem value="G">G = $750,000 to 999,999</SelectItem>
                                    <SelectItem value="H">H = $1,000,000 to $4,999,999</SelectItem>
                                    <SelectItem value="I">I = $5,000,000 to $9,999,999</SelectItem>
                                    <SelectItem value="J">J = Over $10 million</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              <div>
                                <Label className="text-sm font-medium">Liquid Net Worth</Label>
                                <Select value={additionalFormData.primaryClient?.liquidNetWorth || ""} onValueChange={(value) => setAdditionalFormData(prev => ({ 
                                  ...prev, 
                                  primaryClient: { ...prev.primaryClient, liquidNetWorth: value }
                                }))}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select liquid net worth" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="A">A = $24,999 or less</SelectItem>
                                    <SelectItem value="B">B = $25,000 to $49,999</SelectItem>
                                    <SelectItem value="C">C = $50,000 to $99,999</SelectItem>
                                    <SelectItem value="D">D = $100,000 to $249,999</SelectItem>
                                    <SelectItem value="E">E = $250,000 to $499,999</SelectItem>
                                    <SelectItem value="F">F = $500,000 to $749,999</SelectItem>
                                    <SelectItem value="G">G = $750,000 to 999,999</SelectItem>
                                    <SelectItem value="H">H = $1,000,000 to $4,999,999</SelectItem>
                                    <SelectItem value="I">I = $5,000,000 to $9,999,999</SelectItem>
                                    <SelectItem value="J">J = Over $10 million</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div>
                                <Label className="text-sm font-medium">Tax Bracket</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center space-x-4">
                                    <label className="flex items-center">
                                      <input type="checkbox" className="mr-2" />
                                      <span className="text-sm">10-15%</span>
                                    </label>
                                    <label className="flex items-center">
                                      <input type="checkbox" className="mr-2" />
                                      <span className="text-sm">16-28%</span>
                                    </label>
                                  </div>
                                  <label className="flex items-center">
                                    <input type="checkbox" className="mr-2" />
                                    <span className="text-sm">29% or Higher</span>
                                  </label>
                                </div>
                              </div>
                              
                              <div className="pt-4">
                                <p className="text-xs text-gray-500"><sup>1</sup> Excluding Primary Residence</p>
                              </div>
                            </div>
                          </div>
                        </div>


                      </div>
                    )}

                    {/* Step 6: Account Selection */}
                    {currentStep === 6 && (
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

                    {/* Step 7: Account Configuration */}
                    {currentStep === 7 && (
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

                    {/* Step 8: Additional Options */}
                    {currentStep === 8 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-gray-900">Additional Options</h3>
                          <p className="text-sm text-gray-600">Configure additional agreement options and settings.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="advisorName" className="text-sm font-medium">Advisor/Team Name</Label>
                            <Input 
                              id="advisorName" 
                              placeholder="Enter advisor or team name" 
                              className="mt-1"
                              value={additionalFormData.advisorName || ""}
                              onChange={(e) => setAdditionalFormData(prev => ({ ...prev, advisorName: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="iarRepCode" className="text-sm font-medium">IAR Rep Code (Optional)</Label>
                            <Input 
                              id="iarRepCode" 
                              placeholder="Enter IAR Rep Code" 
                              className="mt-1"
                              value={additionalFormData.iarRepCode || ""}
                              onChange={(e) => setAdditionalFormData(prev => ({ ...prev, iarRepCode: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 9: Agreement Details */}
                    {currentStep === 9 && (
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
                        

                        
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agreement Status</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
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
                        {currentStep < 9 ? (
                          <Button 
                            type="button" 
                            onClick={handleNext}
                            disabled={
                              (currentStep === 1 && !form.watch("businessLine")) ||
                              (currentStep === 2 && !form.watch("templateId")) ||
                              (currentStep === 3 && !form.watch("householdId")) ||
                              (currentStep === 7 && selectedAccounts.length === 0)
                            }
                          >
                            Next
                          </Button>
                        ) : (
                          <Button 
                            type="submit" 
                            disabled={
                              directPdfMutation.isPending ||
                              !additionalFormData.advisorName ||
                              !additionalFormData.primaryClientName
                            }
                          >
                            {directPdfMutation.isPending ? "Generating PDF..." : "Create Agreement"}
                          </Button>
                        )}
                      </div>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>All Client Agreements</CardTitle>
                  <CardDescription>
                    View and manage all client agreements across households
                  </CardDescription>
                </div>
                <DialogTrigger asChild>
                  <Button onClick={handleNewAgreement}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Agreement
                  </Button>
                </DialogTrigger>
              </div>
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