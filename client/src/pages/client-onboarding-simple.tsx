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
import { ArrowLeft, ArrowRight, Save, User, Phone, Briefcase, DollarSign, Shield, TrendingUp, Building, CheckCircle } from "lucide-react";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";

const stepIcons = {
  1: User,
  2: Phone,
  3: Briefcase,
  4: DollarSign,
  5: Shield,
  6: TrendingUp,
  7: Building,
};

// Schema for Step 1 - Client Information
const personalInfoSchema = z.object({
  clientType: z.string().min(1, "Client type is required"),
  ssn: z.string().min(1, "SSN is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  citizenship: z.string().min(1, "Citizenship is required"),
});

// Schema for Step 2 - Contact Information
const contactInfoSchema = z.object({
  emailAddress: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
});

// Schema for Step 3 - Employment Information
const employmentInfoSchema = z.object({
  status: z.string().min(1, "Employment status is required"),
  occupation: z.string().optional(),
  industry: z.string().optional(),
  employer: z.string().optional(),
  workPhone: z.string().optional(),
  annualIncome: z.string().optional(),
});

type PersonalInfo = z.infer<typeof personalInfoSchema>;
type ContactInfo = z.infer<typeof contactInfoSchema>;
type EmploymentInfo = z.infer<typeof employmentInfoSchema>;

interface OnboardingData {
  personalInfo: PersonalInfo;
  contactInfo: ContactInfo;
  employmentInfo: EmploymentInfo;
}

const steps = [
  { id: 1, title: "Personal Information", description: "Basic client details" },
  { id: 2, title: "Contact Information", description: "Address and contact details" },
  { id: 3, title: "Employment Information", description: "Work and income details" },
];

function ClientOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  // Initialize all forms at once to avoid conditional hook calls
  const personalForm = useForm<PersonalInfo>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      clientType: "",
      ssn: "",
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      citizenship: "",
    },
  });

  const [contactData, setContactData] = useState<ContactInfo>({
    emailAddress: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const contactForm = useForm<ContactInfo>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: contactData,
    mode: "onChange",
  });

  const employmentForm = useForm<EmploymentInfo>({
    resolver: zodResolver(employmentInfoSchema),
    defaultValues: {
      status: "",
      occupation: "",
      industry: "",
      employer: "",
      workPhone: "",
      annualIncome: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      return await apiRequest("/api/clients", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Client onboarding completed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setLocation("/clients");
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
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    },
  });

  const handleNext = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = await personalForm.trigger();
        break;
      case 2:
        // Validate contact data manually since we're using state
        isValid = contactData.emailAddress.trim() !== "" && 
                 contactData.phoneNumber.trim() !== "" && 
                 contactData.address.trim() !== "" && 
                 contactData.city.trim() !== "" && 
                 contactData.state.trim() !== "" && 
                 contactData.zipCode.trim() !== "";
        break;
      case 3:
        isValid = await employmentForm.trigger();
        break;
    }

    if (isValid) {
      if (currentStep < steps.length) {
        setCurrentStep(currentStep + 1);
      } else {
        // Submit form - transform data to match client schema
        const personalInfo = personalForm.getValues();
        const employmentInfo = employmentForm.getValues();
        
        const clientData = {
          // Personal Information
          clientType: personalInfo.clientType,
          ssn: personalInfo.ssn,
          firstName: personalInfo.firstName,
          middleName: personalInfo.middleName,
          lastName: personalInfo.lastName,
          dateOfBirth: personalInfo.dateOfBirth,
          citizenship: personalInfo.citizenship,
          
          // Contact Information
          emailAddress: contactData.emailAddress,
          homePhone: contactData.phoneNumber,
          legalAddress1: contactData.address,
          city: contactData.city,
          state: contactData.state,
          zipCode: contactData.zipCode,
          
          // Employment Information
          employmentStatus: employmentInfo.status,
          industry: employmentInfo.industry,
        };
        
        mutation.mutate(clientData);
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={personalForm.control}
            name="clientType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="entity">Entity</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalForm.control}
            name="ssn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SSN/Tax ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="XXX-XX-XXXX" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalForm.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={personalForm.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date of Birth</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
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
                <FormLabel>Citizenship</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select citizenship" />
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
        </div>
      </div>
    </Form>
  );

  const renderContactInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="emailAddress" className="text-sm font-medium">Email Address</label>
          <Input
            id="emailAddress"
            type="email"
            value={contactData.emailAddress}
            onChange={(e) => setContactData({ ...contactData, emailAddress: e.target.value })}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</label>
          <Input
            id="phoneNumber"
            placeholder="(XXX) XXX-XXXX"
            value={contactData.phoneNumber}
            onChange={(e) => setContactData({ ...contactData, phoneNumber: e.target.value })}
            className="w-full"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="address" className="text-sm font-medium">Address</label>
          <Input
            id="address"
            value={contactData.address}
            onChange={(e) => setContactData({ ...contactData, address: e.target.value })}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="city" className="text-sm font-medium">City</label>
          <Input
            id="city"
            value={contactData.city}
            onChange={(e) => setContactData({ ...contactData, city: e.target.value })}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="state" className="text-sm font-medium">State</label>
          <Select value={contactData.state} onValueChange={(value) => setContactData({ ...contactData, state: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AL">Alabama</SelectItem>
              <SelectItem value="AK">Alaska</SelectItem>
              <SelectItem value="AZ">Arizona</SelectItem>
              <SelectItem value="CA">California</SelectItem>
              <SelectItem value="FL">Florida</SelectItem>
              <SelectItem value="NY">New York</SelectItem>
              <SelectItem value="TX">Texas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="zipCode" className="text-sm font-medium">ZIP Code</label>
          <Input
            id="zipCode"
            value={contactData.zipCode}
            onChange={(e) => setContactData({ ...contactData, zipCode: e.target.value })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );

  const renderEmploymentInfo = () => {
    const employmentStatus = employmentForm.watch('status');
    const isEmployed = employmentStatus === 'employed' || employmentStatus === 'self_employed';

    return (
      <Form {...employmentForm}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={employmentForm.control}
              name="status"
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

            {isEmployed && (
              <>
                <FormField
                  control={employmentForm.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={employmentForm.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="healthcare">Healthcare</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                          <SelectItem value="education">Education</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={employmentForm.control}
                  name="employer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={employmentForm.control}
              name="annualIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Annual Income</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select income range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="under_25k">Under $25,000</SelectItem>
                      <SelectItem value="25k_50k">$25,000 - $50,000</SelectItem>
                      <SelectItem value="50k_100k">$50,000 - $100,000</SelectItem>
                      <SelectItem value="100k_250k">$100,000 - $250,000</SelectItem>
                      <SelectItem value="over_250k">Over $250,000</SelectItem>
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
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderPersonalInfo();
      case 2: return renderContactInfo();
      case 3: return renderEmploymentInfo();
      default: return null;
    }
  };

  const currentStepData = steps[currentStep - 1];
  const IconComponent = stepIcons[currentStep as keyof typeof stepIcons];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar currentView="client-onboarding" />
      <div className="ml-64">
        <TopBar 
          title="Client Onboarding" 
          subtitle="Complete the 3-step client registration process"
        />
        
        <div className="p-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const StepIcon = stepIcons[step.id as keyof typeof stepIcons];
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : isCurrent 
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-white border-slate-300 text-slate-400'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-6 w-6" />
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-24 h-1 mx-4 ${
                        isCompleted ? 'bg-green-500' : 'bg-slate-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Step {currentStep}: {currentStepData.title}
              </h2>
              <p className="text-slate-600">{currentStepData.description}</p>
            </div>
          </div>

          {/* Step Content */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center">
                <IconComponent className="h-6 w-6 text-blue-500 mr-3" />
                <CardTitle>{currentStepData.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 max-w-4xl mx-auto">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <Progress value={(currentStep / steps.length) * 100} className="w-48" />

            <Button
              onClick={handleNext}
              disabled={mutation.isPending}
            >
              {currentStep === steps.length ? (
                <>
                  {mutation.isPending ? "Submitting..." : "Complete"}
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
    </div>
  );
}

export default ClientOnboarding;