import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle, InfoIcon, Save, FileText } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Sidebar from "@/components/sidebar";

// Step schemas
const step1Schema = z.object({
  clientType: z.enum(["individual", "entity"]),
  ssn: z.string()
    .min(1, "SSN is required")
    .regex(/^\d{3}-?\d{2}-?\d{4}$/, "SSN must be in format XXX-XX-XXXX"),
  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name too long"),
  middleName: z.string().max(50, "Middle name too long").optional(),
  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name too long"),
  alias: z.string().max(50, "Alias too long").optional(),
  citizenship: z.string().min(1, "Citizenship is required"),
  residencyStatus: z.string().optional(),
  dateOfBirth: z.string()
    .min(1, "Date of birth is required")
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 0 && age <= 120;
    }, "Please enter a valid date of birth"),
  signingMethod: z.string().optional(),
});

const step2Schema = z.object({
  emailAddress: z.string().email("Valid email is required"),
  legalAddress1: z.string()
    .min(1, "Legal address is required")
    .max(100, "Address too long"),
  legalAddress2: z.string().max(100, "Address too long").optional(),
  city: z.string()
    .min(1, "City is required")
    .max(50, "City name too long"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string()
    .min(1, "Zip code is required")
    .regex(/^\d{5}(-\d{4})?$/, "Zip code must be in format 12345 or 12345-6789"),
  homePhone: z.string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Phone must be in format (000) 000-0000")
    .optional()
    .or(z.literal("")),
  mobilePhone: z.string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Phone must be in format (000) 000-0000")
    .optional()
    .or(z.literal("")),
  businessPhone: z.string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, "Phone must be in format (000) 000-0000")
    .optional()
    .or(z.literal("")),
  mailingAddressSameAsAbove: z.boolean(),
  mailingAddress1: z.string().max(100, "Address too long").optional(),
  mailingAddress2: z.string().max(100, "Address too long").optional(),
  mailingCity: z.string().max(50, "City name too long").optional(),
  mailingState: z.string().optional(),
  mailingZipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, "Zip code must be in format 12345 or 12345-6789")
    .optional()
    .or(z.literal("")),
});

const step3Schema = z.object({
  employmentStatus: z.string().min(1, "Employment status is required"),
  industry: z.string().optional(),
  occupation: z.string().optional(),
  employerName: z.string().optional(),
  industryAffiliation: z.string().optional(),
});

const step4Schema = z.object({
  annualIncome: z.string().optional(),
  taxBracket: z.string().optional(),
  netWorth: z.string().optional(),
  liquidNetWorth: z.string().optional(),
  sourceOfWealth: z.string().optional(),
});

const step5Schema = z.object({
  trustedContactFirstName: z.string().optional(),
  trustedContactLastName: z.string().optional(),
  trustedContactRelationship: z.string().optional(),
  trustedContactAddress1: z.string().optional(),
  trustedContactAddress2: z.string().optional(),
  trustedContactCity: z.string().optional(),
  trustedContactState: z.string().optional(),
  trustedContactZipCode: z.string().optional(),
  trustedContactEmail: z.string().optional(),
  trustedContactPhone: z.string().optional(),
});

const step6Schema = z.object({
  hasInvestmentExperience: z.string().min(1, "Investment experience selection is required"),
  annuitiesYears: z.string().optional(),
  bondsYears: z.string().optional(),
  marginYears: z.string().optional(),
  mutualFundsYears: z.string().optional(),
  optionsYears: z.string().optional(),
  partnershipsYears: z.string().optional(),
  stocksYears: z.string().optional(),
  otherYears: z.string().optional(),
});

const step7Schema = z.object({
  hasOtherInvestments: z.string().min(1, "Other investments selection is required"),
  altInvestmentsPercent: z.string().optional(),
  annuitiesPercent: z.string().optional(),
  bondsPercent: z.string().optional(),
  checkingSavingsPercent: z.string().optional(),
  equitiesPercent: z.string().optional(),
  insurancePercent: z.string().optional(),
  mutualFundsPercent: z.string().optional(),
  realEstatePercent: z.string().optional(),
  otherPercent: z.string().optional(),
});

const fullSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step6Schema)
  .merge(step7Schema);

type FormData = z.infer<typeof fullSchema>;

const steps = [
  { id: 1, title: "Personal Information", description: "Basic client details" },
  { id: 2, title: "Contact Information", description: "Address and phone details" },
  { id: 3, title: "Employment Information", description: "Work details" },
  { id: 4, title: "Suitability", description: "Financial profile" },
  { id: 5, title: "Trusted Contact", description: "Emergency contact" },
  { id: 6, title: "Investment Experience", description: "Experience details" },
  { id: 7, title: "Financial Information", description: "Investment allocations" },
];

export default function ClientOnboardingFull() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [editClientId, setEditClientId] = useState<number | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [draftName, setDraftName] = useState("");
  const { toast } = useToast();

  // Check for draftId and editId in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const draftId = urlParams.get('draftId');
    const editId = urlParams.get('editId');
    
    if (draftId && !isNaN(Number(draftId))) {
      setCurrentDraftId(Number(draftId));
    }
    
    if (editId && !isNaN(Number(editId))) {
      setEditClientId(Number(editId));
    }
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      clientType: "individual",
      ssn: "",
      firstName: "",
      middleName: "",
      lastName: "",
      alias: "",
      citizenship: "",
      residencyStatus: "",
      dateOfBirth: "",
      signingMethod: "",
      emailAddress: "",
      legalAddress1: "",
      legalAddress2: "",
      city: "",
      state: "",
      zipCode: "",
      homePhone: "",
      mobilePhone: "",
      businessPhone: "",
      mailingAddressSameAsAbove: true,
      mailingAddress1: "",
      mailingAddress2: "",
      mailingCity: "",
      mailingState: "",
      mailingZipCode: "",
      employmentStatus: "",
      industry: "",
      occupation: "",
      employerName: "",
      industryAffiliation: "",
      annualIncome: "",
      taxBracket: "",
      netWorth: "",
      liquidNetWorth: "",
      sourceOfWealth: "",
      trustedContactFirstName: "",
      trustedContactLastName: "",
      trustedContactRelationship: "",
      trustedContactAddress1: "",
      trustedContactAddress2: "",
      trustedContactCity: "",
      trustedContactState: "",
      trustedContactZipCode: "",
      trustedContactEmail: "",
      trustedContactPhone: "",
      hasInvestmentExperience: "",
      annuitiesYears: "",
      bondsYears: "",
      marginYears: "",
      mutualFundsYears: "",
      optionsYears: "",
      partnershipsYears: "",
      stocksYears: "",
      otherYears: "",
      hasOtherInvestments: "",
      altInvestmentsPercent: "",
      annuitiesPercent: "",
      bondsPercent: "",
      checkingSavingsPercent: "",
      equitiesPercent: "",
      insurancePercent: "",
      mutualFundsPercent: "",
      realEstatePercent: "",
      otherPercent: "",
    },
  });

  // Query for user's draft onboardings
  const { data: userDrafts, refetch: refetchDrafts } = useQuery({
    queryKey: ["/api/draft-onboarding"],
    retry: false,
  });

  // Query for specific draft when draftId is provided
  const { data: specificDraft, isLoading: isDraftLoading } = useQuery({
    queryKey: ["/api/draft-onboarding", currentDraftId],
    queryFn: async () => {
      if (!currentDraftId) return null;
      const response = await apiRequest("GET", `/api/draft-onboarding/${currentDraftId}`);
      return await response.json();
    },
    enabled: !!currentDraftId,
    retry: false,
  });

  // Query for existing client when editClientId is provided
  const { data: existingClient, isLoading: isClientLoading } = useQuery({
    queryKey: ["/api/clients", editClientId],
    queryFn: async () => {
      if (!editClientId) return null;
      const response = await apiRequest("GET", `/api/clients/${editClientId}`);
      return await response.json();
    },
    enabled: !!editClientId,
    retry: false,
  });

  // Load draft data when specificDraft is fetched
  useEffect(() => {
    if (specificDraft && specificDraft.formData) {
      const formData = specificDraft.formData;
      
      // Populate form with draft data
      form.reset(formData);
      
      // Set current step to the saved step or calculate based on data
      if (specificDraft.currentStep) {
        setCurrentStep(specificDraft.currentStep);
      }
      
      // Show toast to indicate draft was loaded
      toast({
        title: "Draft Loaded",
        description: `Continuing from step ${specificDraft.currentStep || 1}`,
      });
    }
  }, [specificDraft, form, toast]);

  // Load existing client data when existingClient is fetched
  useEffect(() => {
    if (existingClient) {
      // Map client data to form format (using actual database field names)
      const clientFormData = {
        clientType: existingClient.clientType?.toLowerCase() || "individual",
        ssn: existingClient.ssn || "",
        firstName: existingClient.firstName || "",
        middleName: existingClient.middleName || "",
        lastName: existingClient.lastName || "",
        alias: existingClient.alias || "",
        citizenship: existingClient.citizenship || "",
        residencyStatus: existingClient.residencyStatus || "",
        dateOfBirth: existingClient.dateOfBirth || "",
        signingMethod: existingClient.signingMethod || "",
        emailAddress: existingClient.emailAddress || "",
        legalAddress1: existingClient.legalAddress1 || "",
        legalAddress2: existingClient.legalAddress2 || "",
        city: existingClient.city || "",
        state: existingClient.state || "",
        zipCode: existingClient.zipCode || "",
        homePhone: existingClient.homePhone || "",
        mobilePhone: existingClient.mobilePhone || "",
        businessPhone: existingClient.businessPhone || "",
        mailingAddressSameAsAbove: !existingClient.mailingAddress1,
        mailingAddress1: existingClient.mailingAddress1 || "",
        mailingAddress2: existingClient.mailingAddress2 || "",
        mailingCity: existingClient.mailingCity || "",
        mailingState: existingClient.mailingState || "",
        mailingZipCode: existingClient.mailingZipCode || "",
        employmentStatus: existingClient.employmentStatus || "",
        industry: existingClient.industry || "",
        occupation: existingClient.occupation || "",
        employerName: existingClient.employerName || "",
        industryAffiliation: existingClient.affiliationType || "",
        annualIncome: existingClient.annualIncome || "",
        taxBracket: existingClient.taxBracket || "",
        netWorth: existingClient.netWorth || "",
        liquidNetWorth: existingClient.liquidNetWorth || "",
        sourceOfWealth: existingClient.sourceOfWealth || "",
        trustedContactFirstName: existingClient.trustedContactFirstName || "",
        trustedContactLastName: existingClient.trustedContactLastName || "",
        trustedContactRelationship: existingClient.trustedContactRelationship || "",
        trustedContactAddress1: existingClient.trustedContactAddress1 || "",
        trustedContactAddress2: existingClient.trustedContactAddress2 || "",
        trustedContactCity: existingClient.trustedContactCity || "",
        trustedContactState: existingClient.trustedContactState || "",
        trustedContactZipCode: existingClient.trustedContactZipCode || "",
        trustedContactEmail: existingClient.trustedContactEmail || "",
        trustedContactPhone: existingClient.trustedContactPhone || "",
        hasInvestmentExperience: existingClient.hasInvestmentExperience ? "yes" : "no",
        annuitiesYears: existingClient.annuitiesYears || "",
        bondsYears: existingClient.bondsYears || "",
        marginYears: existingClient.marginYears || "",
        mutualFundsYears: existingClient.mutualFundsYears || "",
        optionsYears: existingClient.optionsYears || "",
        partnershipsYears: existingClient.partnershipsYears || "",
        stocksYears: existingClient.stocksYears || "",
        otherYears: existingClient.otherYears || "",
        hasOtherInvestments: existingClient.hasOtherInvestments ? "yes" : "no",
        altInvestmentsPercent: existingClient.altInvestmentsPercent || "",
        annuitiesPercent: existingClient.annuitiesPercent || "",
        bondsPercent: existingClient.bondsPercent || "",
        checkingSavingsPercent: existingClient.checkingSavingsPercent || "",
        equitiesPercent: existingClient.equitiesPercent || "",
        insurancePercent: existingClient.insurancePercent || "",
        mutualFundsPercent: existingClient.mutualFundsPercent || "",
        realEstatePercent: existingClient.realEstatePercent || "",
        otherPercent: existingClient.otherPercent || "",
      };
      
      // Populate form with client data
      form.reset(clientFormData);
      
      // Show toast to indicate client data was loaded for editing
      toast({
        title: "Client Loaded",
        description: `Editing ${existingClient.firstName} ${existingClient.lastName}`,
      });
    }
  }, [existingClient, form, toast]);

  // Mutation for creating/updating draft onboarding
  const saveDraftMutation = useMutation({
    mutationFn: async ({ name, data }: { name: string; data: Partial<FormData> }) => {
      const draftData = {
        title: name,
        formData: data,
        currentStep,
        completedSteps: Array.from({ length: currentStep - 1 }, (_, i) => i + 1),
      };

      if (currentDraftId) {
        return apiRequest("PUT", `/api/draft-onboarding/${currentDraftId}`, draftData);
      } else {
        return apiRequest("POST", "/api/draft-onboarding", draftData);
      }
    },
    onSuccess: (data) => {
      setCurrentDraftId(data.id);
      refetchDrafts();
      toast({
        title: "Draft Saved",
        description: "Your progress has been saved successfully.",
      });
      // Auto-save completed
    },
    onError: (error) => {
      console.error("Save draft error:", error);
      toast({
        title: "Error",
        description: "Failed to save draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting draft onboarding
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      return apiRequest("DELETE", `/api/draft-onboarding/${draftId}`);
    },
    onSuccess: () => {
      refetchDrafts();
      toast({
        title: "Draft Deleted",
        description: "Draft has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Delete draft error:", error);
      toast({
        title: "Error",
        description: "Failed to delete draft. Please try again.",
        variant: "destructive",
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Submitting client data:", data);
      
      if (editClientId) {
        // Update existing client
        return await apiRequest("PUT", `/api/clients/${editClientId}`, data);
      } else {
        // Create new client
        return await apiRequest("POST", "/api/onboarding/client", data);
      }
    },
    onSuccess: (data) => {
      console.log("Client operation successful:", data);
      
      // Invalidate client-related queries to refresh UI
      if (editClientId) {
        // Force immediate refetch for specific client data
        queryClient.refetchQueries({ queryKey: [`/api/clients/${editClientId}`] });
        queryClient.refetchQueries({ queryKey: [`/api/audit-logs`, { entityType: 'clients', entityId: editClientId }] });
        
        // Also invalidate general queries for list views
        queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        queryClient.invalidateQueries({ queryKey: ["/api/audit-logs"] });
      }
      
      // Delete the draft if it was loaded from a draft
      if (currentDraftId) {
        deleteDraftMutation.mutate(currentDraftId);
      }
      setIsCompleted(true);
      toast({
        title: "Success!",
        description: editClientId ? "Client updated successfully." : "Client onboarding completed successfully.",
      });
    },
    onError: (error) => {
      console.error("Error with client operation:", error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${editClientId ? "update" : "create"} client. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  const employmentStatus = form.watch("employmentStatus");

  // Auto-populate fields for specific employment statuses
  useEffect(() => {
    if (employmentStatus === "minor") {
      form.setValue("industry", "minor");
      form.setValue("occupation", "Minor");
      form.setValue("employerName", "Minor");
    } else if (employmentStatus === "retired") {
      form.setValue("industry", "retired");
      form.setValue("occupation", "Retired");
      form.setValue("employerName", "Retired");
    } else if (employmentStatus === "student") {
      form.setValue("industry", "student");
      form.setValue("occupation", "Student");
      form.setValue("employerName", "Student");
    } else if (employmentStatus === "homemaker") {
      form.setValue("industry", "homemaker");
      form.setValue("occupation", "Homemaker");
      form.setValue("employerName", "Homemaker");
    }
  }, [employmentStatus, form]);

  // Functions for handling draft operations
  const handleSaveDraft = () => {
    const currentFormData = form.getValues();
    const clientName = `${currentFormData.firstName || 'Client'} ${currentFormData.lastName || ''}`.trim();
    const draftTitle = clientName === 'Client' ? `Client ${new Date().toLocaleDateString()}` : clientName;
    
    saveDraftMutation.mutate({ 
      name: draftTitle, 
      data: currentFormData 
    });
  };

  // Auto-save functionality - save draft whenever user moves to next step
  const handleAutoSave = () => {
    const currentFormData = form.getValues();
    const hasData = Object.values(currentFormData).some(value => value && value !== "");
    
    if (hasData) {
      const clientName = `${currentFormData.firstName || 'Client'} ${currentFormData.lastName || ''}`.trim();
      const draftTitle = clientName === 'Client' ? `Client ${new Date().toLocaleDateString()}` : clientName;
      
      // Server-side duplicate prevention handles the logic, so we just save
      saveDraftMutation.mutate({ 
        name: draftTitle, 
        data: currentFormData 
      });
    }
  };

  // Calculate completion percentage based on meaningful fields across all steps
  const calculateCompletionPercentage = (formData: any) => {
    const requiredFields = [
      // Step 1 - Personal Information
      'clientType', 'ssn', 'firstName', 'lastName', 'citizenship', 'dateOfBirth',
      // Step 2 - Contact Information  
      'emailAddress', 'legalAddress1', 'city', 'state', 'zipCode',
      // Step 3 - Employment
      'employmentStatus',
      // Step 4 - Suitability
      'annualIncome', 'netWorth', 'liquidNetWorth',
      // Step 5 - Trusted Contact
      'trustedContactFirstName', 'trustedContactLastName', 'trustedContactRelationship',
      // Step 6 - Investment Experience
      'hasInvestmentExperience',
      // Step 7 - Financial Information
      'hasOtherInvestments'
    ];
    
    const filledRequiredFields = requiredFields.filter(field => 
      formData[field] && formData[field] !== ""
    ).length;
    
    return Math.round((filledRequiredFields / requiredFields.length) * 100);
  };

  const handleLoadDraft = (draft: any) => {
    if (draft.formData) {
      Object.keys(draft.formData).forEach((key) => {
        if (draft.formData[key] !== undefined && draft.formData[key] !== null) {
          form.setValue(key as any, draft.formData[key]);
        }
      });
    }
    setCurrentStep(draft.currentStep || 1);
    setCurrentDraftId(draft.id);
    setShowLoadDialog(false);
    toast({
      title: "Draft Loaded",
      description: `Successfully loaded "${draft.title}".`,
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: FormData) => {
    console.log("onSubmit called - Final form data:", data);
    
    // Transform string values to booleans for certain fields
    const transformedData = {
      ...data,
      hasInvestmentExperience: data.hasInvestmentExperience === "yes",
      hasOtherInvestments: data.hasOtherInvestments === "yes"
    };
    
    console.log("Submitting client data:", transformedData);
    console.log("Mutation pending:", mutation.isPending);
    mutation.mutate(transformedData);
  };

  const getStepSchema = (step: number) => {
    switch (step) {
      case 1: return step1Schema;
      case 2: return step2Schema;
      case 3: return step3Schema;
      case 4: return step4Schema;
      case 5: return step5Schema;
      case 6: return step6Schema;
      case 7: return step7Schema;
      default: return step1Schema;
    }
  };

  const validateCurrentStep = async () => {
    const schema = getStepSchema(currentStep);
    const currentData = form.getValues();
    try {
      await schema.parseAsync(currentData);
      return true;
    } catch (error) {
      console.log("Validation errors:", error);
      return false;
    }
  };

  const handleNext = () => {
    // Just advance to the next step without auto-saving
    nextStep();
  };

  if (isCompleted) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar currentView="client-onboarding-full" />
        <div className="flex-1 p-6">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Full Client Onboarding</h1>
              <p className="text-slate-600">Complete 7-step client information collection process</p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">
                    {editClientId ? "Client Updated!" : "Onboarding Complete!"}
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {editClientId 
                      ? "The client information has been successfully updated."
                      : "The client information has been successfully submitted."
                    }
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => window.location.href = "/"}>
                      Return to Dashboard
                    </Button>
                    {editClientId && (
                      <Button 
                        variant="outline" 
                        onClick={() => window.location.href = "/clients"}
                      >
                        View All Clients
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentView="client-onboarding-full" />
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  {editClientId ? "Edit Client" : "Full Client Onboarding"}
                </h1>
                <p className="text-slate-600">
                  {editClientId 
                    ? "Update client information across all steps" 
                    : "Complete 7-step client information collection process"
                  }
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSaveDraft}
                  disabled={saveDraftMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveDraftMutation.isPending ? "Saving..." : "Save Progress"}
                </Button>

                <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Load Draft
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Load Draft</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {userDrafts && userDrafts.length > 0 ? (
                        <div className="space-y-2">
                          {userDrafts.map((draft: any) => {
                            const completionPercentage = calculateCompletionPercentage(draft.formData || {});
                            return (
                              <div key={draft.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium">{draft.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full" 
                                        style={{ width: `${completionPercentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-500">{completionPercentage}%</span>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Step {draft.currentStep || 1} of 7 • {new Date(draft.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-1 ml-4">
                                  <Button
                                    size="sm"
                                    onClick={() => handleLoadDraft(draft)}
                                  >
                                    Continue
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteDraftMutation.mutate(draft.id)}
                                    disabled={deleteDraftMutation.isPending}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">No saved progress found</p>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          
      <Card>
        <CardHeader>
          <CardTitle>Client Information Form</CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}</span>
              <span>{Math.round((currentStep / steps.length) * 100)}% Complete</span>
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="h-2" />
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="clientType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Type</FormLabel>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant={field.value === "individual" ? "default" : "outline"}
                            onClick={() => field.onChange("individual")}
                          >
                            Individual
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "entity" ? "default" : "outline"}
                            onClick={() => field.onChange("entity")}
                          >
                            Entity
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ssn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SSN</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="000-00-0000" 
                              maxLength={11}
                              value={field.value}
                              onChange={(e) => {
                                // Remove all non-digit characters
                                const digits = e.target.value.replace(/\D/g, '');
                                
                                // Format as XXX-XX-XXXX
                                let formatted = '';
                                if (digits.length > 0) {
                                  formatted = digits.substring(0, 3);
                                  if (digits.length > 3) {
                                    formatted += '-' + digits.substring(3, 5);
                                    if (digits.length > 5) {
                                      formatted += '-' + digits.substring(5, 9);
                                    }
                                  }
                                }
                                
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="John" 
                              value={field.value}
                              onChange={(e) => {
                                // Capitalize first letter of each word
                                const formatted = e.target.value
                                  .toLowerCase()
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="middleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Middle Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="A." 
                              value={field.value}
                              onChange={(e) => {
                                const formatted = e.target.value
                                  .toLowerCase()
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Doe" 
                              value={field.value}
                              onChange={(e) => {
                                const formatted = e.target.value
                                  .toLowerCase()
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="alias"
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

                    <FormField
                      control={form.control}
                      name="citizenship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Citizenship / Legal Establishment</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="us_citizen">US Citizen</SelectItem>
                              <SelectItem value="permanent_resident">Permanent Resident</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="residencyStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Residency Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="resident">Resident</SelectItem>
                              <SelectItem value="non_resident">Non-Resident</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="signingMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Signing Method</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="electronic">Electronic</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Contact Information */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emailAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="name@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalAddress1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Address Line 1</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalAddress2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Legal Address Line 2</FormLabel>
                          <FormControl>
                            <Input placeholder="Apt, Suite, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="city"
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
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
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
                              <SelectItem value="DC">District of Columbia</SelectItem>
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
                              <SelectItem value="AS">American Samoa</SelectItem>
                              <SelectItem value="GU">Guam</SelectItem>
                              <SelectItem value="MP">Northern Mariana Islands</SelectItem>
                              <SelectItem value="PR">Puerto Rico</SelectItem>
                              <SelectItem value="VI">U.S. Virgin Islands</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="12345-6789" 
                              maxLength={10}
                              value={field.value}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                let formatted = '';
                                if (digits.length > 0) {
                                  formatted = digits.substring(0, 5);
                                  if (digits.length > 5) {
                                    formatted += '-' + digits.substring(5, 9);
                                  }
                                }
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="homePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Home Phone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(000) 000-0000" 
                              maxLength={14}
                              value={field.value}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                let formatted = '';
                                if (digits.length > 0) {
                                  formatted = '(' + digits.substring(0, 3);
                                  if (digits.length > 3) {
                                    formatted += ') ' + digits.substring(3, 6);
                                    if (digits.length > 6) {
                                      formatted += '-' + digits.substring(6, 10);
                                    }
                                  }
                                }
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mobilePhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Phone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(000) 000-0000" 
                              maxLength={14}
                              value={field.value}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                let formatted = '';
                                if (digits.length > 0) {
                                  formatted = '(' + digits.substring(0, 3);
                                  if (digits.length > 3) {
                                    formatted += ') ' + digits.substring(3, 6);
                                    if (digits.length > 6) {
                                      formatted += '-' + digits.substring(6, 10);
                                    }
                                  }
                                }
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(000) 000-0000" 
                              maxLength={14}
                              value={field.value}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                let formatted = '';
                                if (digits.length > 0) {
                                  formatted = '(' + digits.substring(0, 3);
                                  if (digits.length > 3) {
                                    formatted += ') ' + digits.substring(3, 6);
                                    if (digits.length > 6) {
                                      formatted += '-' + digits.substring(6, 10);
                                    }
                                  }
                                }
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="mailingAddressSameAsAbove"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Mailing address same as above
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {!watchedValues.mailingAddressSameAsAbove && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="mailingAddress1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailing Address Line 1</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mailingAddress2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailing Address Line 2</FormLabel>
                            <FormControl>
                              <Input placeholder="Apt, Suite, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mailingCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailing City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mailingState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailing State</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                                <SelectItem value="DC">District of Columbia</SelectItem>
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
                                <SelectItem value="AS">American Samoa</SelectItem>
                                <SelectItem value="GU">Guam</SelectItem>
                                <SelectItem value="MP">Northern Mariana Islands</SelectItem>
                                <SelectItem value="PR">Puerto Rico</SelectItem>
                                <SelectItem value="VI">U.S. Virgin Islands</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mailingZipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailing Zip Code</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="12345-6789" 
                                maxLength={10}
                                value={field.value}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, '');
                                  let formatted = '';
                                  if (digits.length > 0) {
                                    formatted = digits.substring(0, 5);
                                    if (digits.length > 5) {
                                      formatted += '-' + digits.substring(5, 9);
                                    }
                                  }
                                  field.onChange(formatted);
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Employment Information */}
              {currentStep === 3 && (
                <TooltipProvider>
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Employment Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="employmentStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="employed">Employed</SelectItem>
                                <SelectItem value="unemployed">Unemployed</SelectItem>
                                <SelectItem value="retired">Retired</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="self_employed">Self Employed</SelectItem>
                                <SelectItem value="minor">Minor</SelectItem>
                                <SelectItem value="homemaker">Homemaker</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Industry</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="minor">Minor</SelectItem>
                                <SelectItem value="retired">Retired</SelectItem>
                                <SelectItem value="student">Student</SelectItem>
                                <SelectItem value="homemaker">Homemaker</SelectItem>
                                <SelectItem value="accounting">Accounting</SelectItem>
                                <SelectItem value="advertising">Advertising</SelectItem>
                                <SelectItem value="aerospace">Aerospace</SelectItem>
                                <SelectItem value="agriculture">Agriculture</SelectItem>
                                <SelectItem value="automotive">Automotive</SelectItem>
                                <SelectItem value="banking">Banking</SelectItem>
                                <SelectItem value="biotechnology">Biotechnology</SelectItem>
                                <SelectItem value="construction">Construction</SelectItem>
                                <SelectItem value="consulting">Consulting</SelectItem>
                                <SelectItem value="education">Education</SelectItem>
                                <SelectItem value="energy">Energy</SelectItem>
                                <SelectItem value="entertainment">Entertainment</SelectItem>
                                <SelectItem value="finance">Finance</SelectItem>
                                <SelectItem value="food_beverage">Food & Beverage</SelectItem>
                                <SelectItem value="government">Government</SelectItem>
                                <SelectItem value="healthcare">Healthcare</SelectItem>
                                <SelectItem value="hospitality">Hospitality</SelectItem>
                                <SelectItem value="insurance">Insurance</SelectItem>
                                <SelectItem value="legal">Legal</SelectItem>
                                <SelectItem value="manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="media">Media</SelectItem>
                                <SelectItem value="nonprofit">Non-Profit</SelectItem>
                                <SelectItem value="pharmaceuticals">Pharmaceuticals</SelectItem>
                                <SelectItem value="real_estate">Real Estate</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="technology">Technology</SelectItem>
                                <SelectItem value="telecommunications">Telecommunications</SelectItem>
                                <SelectItem value="transportation">Transportation</SelectItem>
                                <SelectItem value="utilities">Utilities</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="occupation"
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
                        name="employerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employer Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Employer Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="industryAffiliation"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <div className="flex items-center gap-2">
                              <FormLabel>Industry Affiliation</FormLabel>
                              <Tooltip>
                                <TooltipTrigger type="button">
                                  <InfoIcon className="h-4 w-4 text-gray-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Indicate if the account holder or any immediate family member is affiliated with a financial institution or securities firm.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Select onValueChange={field.onChange} value={field.value}>
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
                    </div>
                  </div>
                </TooltipProvider>
              )}

              {/* Step 4: Suitability */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Suitability</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="annualIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Income</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1_24999">A) $1 - $24,999</SelectItem>
                              <SelectItem value="25000_49999">B) $25,000 - $49,999</SelectItem>
                              <SelectItem value="50000_99999">C) $50,000 - $99,999</SelectItem>
                              <SelectItem value="100000_249999">D) $100,000 - $249,999</SelectItem>
                              <SelectItem value="250000_499999">E) $250,000 - $499,999</SelectItem>
                              <SelectItem value="500000_749999">F) $500,000 - $749,999</SelectItem>
                              <SelectItem value="750000_999999">G) $750,000 - $999,999</SelectItem>
                              <SelectItem value="1000000_over">H) $1,000,000 and over</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="taxBracket"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Bracket</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">0</SelectItem>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="12">12</SelectItem>
                              <SelectItem value="21">21</SelectItem>
                              <SelectItem value="22">22</SelectItem>
                              <SelectItem value="24">24</SelectItem>
                              <SelectItem value="32">32</SelectItem>
                              <SelectItem value="35">35</SelectItem>
                              <SelectItem value="37">37</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="netWorth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net Worth</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1_24999">A) $1 - $24,999</SelectItem>
                              <SelectItem value="25000_49999">B) $25,000 - $49,999</SelectItem>
                              <SelectItem value="50000_99999">C) $50,000 - $99,999</SelectItem>
                              <SelectItem value="100000_249999">D) $100,000 - $249,999</SelectItem>
                              <SelectItem value="250000_499999">E) $250,000 - $499,999</SelectItem>
                              <SelectItem value="500000_749999">F) $500,000 - $749,999</SelectItem>
                              <SelectItem value="750000_999999">G) $750,000 - $999,999</SelectItem>
                              <SelectItem value="1000000_over">H) $1,000,000 and over</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="liquidNetWorth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Liquid Net Worth</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1_24999">A) $1 - $24,999</SelectItem>
                              <SelectItem value="25000_49999">B) $25,000 - $49,999</SelectItem>
                              <SelectItem value="50000_99999">C) $50,000 - $99,999</SelectItem>
                              <SelectItem value="100000_249999">D) $100,000 - $249,999</SelectItem>
                              <SelectItem value="250000_499999">E) $250,000 - $499,999</SelectItem>
                              <SelectItem value="500000_749999">F) $500,000 - $749,999</SelectItem>
                              <SelectItem value="750000_999999">G) $750,000 - $999,999</SelectItem>
                              <SelectItem value="1000000_over">H) $1,000,000 and over</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sourceOfWealth"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Source of Wealth</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="employment_income">Employment Income</SelectItem>
                              <SelectItem value="gift">Gift</SelectItem>
                              <SelectItem value="inheritance">Inheritance</SelectItem>
                              <SelectItem value="investment_income">Investment Income</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="retirement_assets">Retirement Assets</SelectItem>
                              <SelectItem value="sale_of_home_business">Sale of Home/Business</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 5: Trusted Contact */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Trusted Contact</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="trustedContactFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="First Name" 
                              value={field.value}
                              onChange={(e) => {
                                const formatted = e.target.value
                                  .toLowerCase()
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Last Name" 
                              value={field.value}
                              onChange={(e) => {
                                const formatted = e.target.value
                                  .toLowerCase()
                                  .split(' ')
                                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ');
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactRelationship"
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
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="sibling">Sibling</SelectItem>
                              <SelectItem value="friend">Friend</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactAddress1"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address 1</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactAddress2"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address 2</FormLabel>
                          <FormControl>
                            <Input placeholder="Apt, Suite, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactCity"
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
                      name="trustedContactState"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="AL">Alabama</SelectItem>
                              <SelectItem value="AK">Alaska</SelectItem>
                              <SelectItem value="FL">Florida</SelectItem>
                              <SelectItem value="CA">California</SelectItem>
                              <SelectItem value="NY">New York</SelectItem>
                              <SelectItem value="TX">Texas</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactZipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="12345-6789" 
                              maxLength={10}
                              value={field.value}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                let formatted = '';
                                if (digits.length > 0) {
                                  formatted = digits.substring(0, 5);
                                  if (digits.length > 5) {
                                    formatted += '-' + digits.substring(5, 9);
                                  }
                                }
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="name@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trustedContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(555) 123-4567" 
                              maxLength={14}
                              value={field.value}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                let formatted = '';
                                if (digits.length > 0) {
                                  if (digits.length <= 3) {
                                    formatted = `(${digits}`;
                                  } else if (digits.length <= 6) {
                                    formatted = `(${digits.substring(0, 3)}) ${digits.substring(3)}`;
                                  } else {
                                    formatted = `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6, 10)}`;
                                  }
                                }
                                field.onChange(formatted);
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 6: Investment Experience */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Investment Experience</h3>
                  
                  <FormField
                    control={form.control}
                    name="hasInvestmentExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Does the client have any other prior investment experience?</FormLabel>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant={field.value === "no" ? "default" : "outline"}
                            onClick={() => field.onChange("no")}
                          >
                            No
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "yes" ? "default" : "outline"}
                            onClick={() => field.onChange("yes")}
                          >
                            Yes
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedValues.hasInvestmentExperience === "yes" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="annuitiesYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annuities (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="bondsYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bonds (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="marginYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Margin (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="mutualFundsYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mutual Funds (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="optionsYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Options (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="partnershipsYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Partnerships (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="stocksYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stocks (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="otherYears"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other (years)</FormLabel>
                            <FormControl>
                              <Input placeholder="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 7: Financial Information */}
              {currentStep === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Financial Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="hasOtherInvestments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Does your client have other investments (includes other assets held at LPL)?</FormLabel>
                        <div className="flex space-x-2">
                          <Button
                            type="button"
                            variant={field.value === "no" ? "default" : "outline"}
                            onClick={() => field.onChange("no")}
                          >
                            No
                          </Button>
                          <Button
                            type="button"
                            variant={field.value === "yes" ? "default" : "outline"}
                            onClick={() => field.onChange("yes")}
                          >
                            Yes
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedValues.hasOtherInvestments === "yes" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="altInvestmentsPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Alt. Investments</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="annuitiesPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Annuities</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bondsPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bonds</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="checkingSavingsPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Checking - Savings</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="equitiesPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Equities</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="insurancePercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Insurance</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mutualFundsPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mutual Funds</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="realEstatePercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Real Estate</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="otherPercent"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Other</FormLabel>
                              <div className="flex items-center space-x-2">
                                <FormControl>
                                  <Input placeholder="0" {...field} />
                                </FormControl>
                                <span>%</span>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <p className="text-sm text-red-600">Total must equal 100 %</p>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {/* Show Update Client button when editing */}
                  {editClientId && (
                    <Button 
                      type="button" 
                      disabled={mutation.isPending}
                      onClick={async () => {
                        const formData = form.getValues();
                        
                        // Transform data for submission
                        const transformedData = {
                          ...formData,
                          hasInvestmentExperience: formData.hasInvestmentExperience === "yes",
                          hasOtherInvestments: formData.hasOtherInvestments === "yes"
                        };
                        
                        mutation.mutate(transformedData);
                      }}
                    >
                      {mutation.isPending ? "Updating..." : "Update Client"}
                    </Button>
                  )}

                  {/* Regular Next/Submit buttons for new clients or step-by-step editing */}
                  {currentStep < steps.length ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      disabled={mutation.isPending}
                      onClick={async () => {
                        const formData = form.getValues();
                        
                        // Manually trigger form submission
                        const transformedData = {
                          ...formData,
                          hasInvestmentExperience: formData.hasInvestmentExperience === "yes",
                          hasOtherInvestments: formData.hasOtherInvestments === "yes"
                        };
                        
                        mutation.mutate(transformedData);
                      }}
                    >
                      {mutation.isPending ? "Submitting..." : "Submit"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}