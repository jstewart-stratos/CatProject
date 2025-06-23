import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, ArrowRight, Save, User, Phone, Briefcase, DollarSign, Shield, TrendingUp, Building } from "lucide-react";

const stepIcons = {
  1: User,
  2: Phone,
  3: Briefcase,
  4: DollarSign,
  5: Shield,
  6: TrendingUp,
  7: Building,
};

// Schema for each step - will be updated based on your requirements
const personalInfoSchema = z.object({
  clientType: z.string().min(1, "Client type is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  ssn: z.string().min(1, "SSN is required"),
  citizenship: z.string().min(1, "Citizenship is required"),
});

const contactInfoSchema = z.object({
  legalAddress1: z.string().min(1, "Legal address is required"),
  legalAddress2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  homePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  emailAddress: z.string().email("Valid email is required"),
});

const employmentInfoSchema = z.object({
  employmentStatus: z.string().min(1, "Employment status is required"),
  employerName: z.string().optional(),
  industry: z.string().optional(),
  occupation: z.string().optional(),
});

const suitabilityInfoSchema = z.object({
  annualIncome: z.string().min(1, "Annual income is required"),
  netWorth: z.string().min(1, "Net worth is required"),
  liquidNetWorth: z.string().min(1, "Liquid net worth is required"),
  sourceOfWealth: z.string().min(1, "Source of wealth is required"),
});

const trustedContactSchema = z.object({
  trustedContactName: z.string().optional(),
  trustedContactPhone: z.string().optional(),
  trustedContactEmail: z.string().optional(),
});

const investmentExperienceSchema = z.object({
  hasInvestmentExperience: z.boolean(),
  // Additional fields based on your requirements
});

const financialInfoSchema = z.object({
  hasOtherInvestments: z.boolean(),
  // Additional fields based on your requirements
});

type PersonalInfo = z.infer<typeof personalInfoSchema>;
type ContactInfo = z.infer<typeof contactInfoSchema>;
type EmploymentInfo = z.infer<typeof employmentInfoSchema>;
type SuitabilityInfo = z.infer<typeof suitabilityInfoSchema>;
type TrustedContact = z.infer<typeof trustedContactSchema>;
type InvestmentExperience = z.infer<typeof investmentExperienceSchema>;
type FinancialInfo = z.infer<typeof financialInfoSchema>;

interface OnboardingData {
  personalInfo: PersonalInfo;
  contactInfo: ContactInfo;
  employmentInfo: EmploymentInfo;
  suitabilityInfo: SuitabilityInfo;
  trustedContact: TrustedContact;
  investmentExperience: InvestmentExperience;
  financialInfo: FinancialInfo;
}

const steps = [
  { id: 1, title: "Personal Information", description: "Basic personal details" },
  { id: 2, title: "Contact Information", description: "Address and contact details" },
  { id: 3, title: "Employment Information", description: "Work and employment details" },
  { id: 4, title: "Suitability Information", description: "Financial suitability assessment" },
  { id: 5, title: "Trusted Contact", description: "Emergency contact information" },
  { id: 6, title: "Investment Experience", description: "Investment knowledge and experience" },
  { id: 7, title: "Financial Information", description: "Additional financial details" },
];

export default function ClientOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<Partial<OnboardingData>>({});

  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: onboardingData.personalInfo || {},
  });

  const contactForm = useForm<ContactInfo>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: onboardingData.contactInfo || {},
  });

  const employmentForm = useForm<EmploymentInfo>({
    resolver: zodResolver(employmentInfoSchema),
    defaultValues: onboardingData.employmentInfo || {},
  });

  const suitabilityForm = useForm<SuitabilityInfo>({
    resolver: zodResolver(suitabilityInfoSchema),
    defaultValues: onboardingData.suitabilityInfo || {},
  });

  const trustedContactForm = useForm<TrustedContact>({
    resolver: zodResolver(trustedContactSchema),
    defaultValues: onboardingData.trustedContact || {},
  });

  const investmentForm = useForm<InvestmentExperience>({
    resolver: zodResolver(investmentExperienceSchema),
    defaultValues: onboardingData.investmentExperience || {},
  });

  const financialForm = useForm<FinancialInfo>({
    resolver: zodResolver(financialInfoSchema),
    defaultValues: onboardingData.financialInfo || {},
  });

  const getCurrentForm = () => {
    switch (currentStep) {
      case 1: return personalForm;
      case 2: return contactForm;
      case 3: return employmentForm;
      case 4: return suitabilityForm;
      case 5: return trustedContactForm;
      case 6: return investmentForm;
      case 7: return financialForm;
      default: return personalForm;
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      // Combine all form data into a single client object
      const clientData = {
        ...data.personalInfo,
        ...data.contactInfo,
        ...data.employmentInfo,
        ...data.suitabilityInfo,
        ...data.trustedContact,
        hasInvestmentExperience: data.investmentExperience.hasInvestmentExperience,
        hasOtherInvestments: data.financialInfo.hasOtherInvestments,
      };
      return await apiRequest("POST", "/api/clients", clientData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setLocation('/clients');
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
        description: "Failed to create client",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    const form = getCurrentForm();
    const isValid = await form.trigger();
    
    if (isValid) {
      const stepData = form.getValues();
      const stepKey = `step${currentStep}Data` as keyof OnboardingData;
      
      setOnboardingData(prev => ({
        ...prev,
        [stepKey]: stepData,
      }));

      if (currentStep < 7) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit all data
        const completeData = {
          ...onboardingData,
          [stepKey]: stepData,
        } as OnboardingData;
        mutation.mutate(completeData);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderPersonalInfo = () => (
    <Form {...personalForm}>
      <div className="space-y-4">
        <FormField
          control={personalForm.control}
          name="clientType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Joint">Joint</SelectItem>
                  <SelectItem value="Corporate">Corporate</SelectItem>
                  <SelectItem value="Trust">Trust</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={personalForm.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter first name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalForm.control}
            name="middleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Middle Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter middle name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalForm.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter last name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={personalForm.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth *</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalForm.control}
            name="ssn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Social Security Number *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="XXX-XX-XXXX" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalForm.control}
            name="citizenship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Citizenship *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select citizenship" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="US Citizen">US Citizen</SelectItem>
                    <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                    <SelectItem value="Non-Resident Alien">Non-Resident Alien</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );

  const renderContactInfo = () => (
    <Form {...contactForm}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={contactForm.control}
            name="legalAddress1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Address Line 1 *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter street address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={contactForm.control}
            name="legalAddress2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Address Line 2</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Apartment, suite, etc." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={contactForm.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter city" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={contactForm.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter state" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={contactForm.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ZIP Code *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter ZIP code" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={contactForm.control}
            name="homePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Home Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(555) 123-4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={contactForm.control}
            name="mobilePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(555) 123-4567" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={contactForm.control}
            name="emailAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address *</FormLabel>
                <FormControl>
                  <Input {...field} type="email" placeholder="user@example.com" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderPersonalInfo();
      case 2: return renderContactInfo();
      case 3: return <div className="text-center py-8">Employment Information form will be detailed based on your requirements</div>;
      case 4: return <div className="text-center py-8">Suitability Information form will be detailed based on your requirements</div>;
      case 5: return <div className="text-center py-8">Trusted Contact form will be detailed based on your requirements</div>;
      case 6: return <div className="text-center py-8">Investment Experience form will be detailed based on your requirements</div>;
      case 7: return <div className="text-center py-8">Financial Information form will be detailed based on your requirements</div>;
      default: return null;
    }
  };

  const currentStepData = steps[currentStep - 1];
  const IconComponent = stepIcons[currentStep as keyof typeof stepIcons];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/clients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">New Client Onboarding</h1>
          </div>
          <Badge variant="outline">
            Step {currentStep} of {steps.length}
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white px-6 py-4 border-b">
        <div className="max-w-3xl mx-auto">
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Progress: {Math.round((currentStep / steps.length) * 100)}%</span>
            <span>{currentStep} of {steps.length} steps completed</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <IconComponent className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
            <p className="text-gray-600">{currentStepData.description}</p>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button
            onClick={handleNext}
            disabled={mutation.isPending}
          >
            {currentStep === 7 ? (
              <>
                {mutation.isPending ? "Creating..." : "Create Client"}
                <Save className="h-4 w-4 ml-2" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}