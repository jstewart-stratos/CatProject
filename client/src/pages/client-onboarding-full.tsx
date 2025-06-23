import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle, InfoIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Step schemas
const step1Schema = z.object({
  clientType: z.enum(["individual", "entity"]),
  ssn: z.string().min(1, "SSN is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  alias: z.string().optional(),
  citizenship: z.string().min(1, "Citizenship is required"),
  residencyStatus: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  signingMethod: z.string().optional(),
});

const step2Schema = z.object({
  emailAddress: z.string().email("Valid email is required"),
  legalAddress1: z.string().min(1, "Legal address is required"),
  legalAddress2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "Zip code is required"),
  homePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  businessPhone: z.string().optional(),
  mailingAddressSameAsAbove: z.boolean(),
  mailingAddress1: z.string().optional(),
  mailingAddress2: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingState: z.string().optional(),
  mailingZipCode: z.string().optional(),
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
  const { toast } = useToast();

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

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      console.log("Submitting client data:", data);
      return await apiRequest("POST", "/api/onboarding/client", data);
    },
    onSuccess: () => {
      setIsCompleted(true);
      toast({
        title: "Success!",
        description: "Client onboarding completed successfully.",
      });
    },
    onError: (error) => {
      console.error("Error creating client:", error);
      toast({
        title: "Error",
        description: "Failed to create client. Please try again.",
        variant: "destructive",
      });
    },
  });

  const watchedValues = form.watch();
  const employmentStatus = form.watch("employmentStatus");

  // Auto-populate fields when "Minor" is selected
  useEffect(() => {
    if (employmentStatus === "minor") {
      form.setValue("industry", "minor");
      form.setValue("occupation", "Minor");
      form.setValue("employerName", "Minor");
    }
  }, [employmentStatus, form]);

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
    console.log("Final form data:", data);
    
    // Transform string values to booleans for certain fields
    const transformedData = {
      ...data,
      hasInvestmentExperience: data.hasInvestmentExperience === "yes",
      hasOtherInvestments: data.hasOtherInvestments === "yes"
    };
    
    console.log("Submitting client data:", transformedData);
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
    // For now, just advance to the next step
    // We'll validate on final submit
    nextStep();
  };

  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Onboarding Complete!</h2>
              <p className="text-gray-600 mb-4">
                The client information has been successfully submitted.
              </p>
              <Button onClick={() => window.location.href = "/"}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
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
                            <Input placeholder="123456789" {...field} />
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
                            <Input placeholder="John" {...field} />
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
                            <Input placeholder="A." {...field} />
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
                            <Input placeholder="Doe" {...field} />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
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
                            <Input placeholder="1234567890" {...field} />
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
                            <Input placeholder="0987654321" {...field} />
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
                            <Input placeholder="5555555555" {...field} />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        name="mailingZipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mailing Zip Code</FormLabel>
                            <FormControl>
                              <Input placeholder="12345" {...field} />
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="minor">Minor</SelectItem>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="under_50k">Under $50,000</SelectItem>
                              <SelectItem value="50k_100k">$50,000 - $100,000</SelectItem>
                              <SelectItem value="100k_250k">$100,000 - $250,000</SelectItem>
                              <SelectItem value="250k_500k">$250,000 - $500,000</SelectItem>
                              <SelectItem value="over_500k">Over $500,000</SelectItem>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="10">10%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="22">22%</SelectItem>
                              <SelectItem value="24">24%</SelectItem>
                              <SelectItem value="32">32%</SelectItem>
                              <SelectItem value="35">35%</SelectItem>
                              <SelectItem value="37">37%</SelectItem>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="under_100k">Under $100,000</SelectItem>
                              <SelectItem value="100k_500k">$100,000 - $500,000</SelectItem>
                              <SelectItem value="500k_1m">$500,000 - $1,000,000</SelectItem>
                              <SelectItem value="1m_5m">$1,000,000 - $5,000,000</SelectItem>
                              <SelectItem value="over_5m">Over $5,000,000</SelectItem>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="under_50k">Under $50,000</SelectItem>
                              <SelectItem value="50k_250k">$50,000 - $250,000</SelectItem>
                              <SelectItem value="250k_500k">$250,000 - $500,000</SelectItem>
                              <SelectItem value="500k_1m">$500,000 - $1,000,000</SelectItem>
                              <SelectItem value="over_1m">Over $1,000,000</SelectItem>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="employment">Employment</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="inheritance">Inheritance</SelectItem>
                              <SelectItem value="investments">Investments</SelectItem>
                              <SelectItem value="real_estate">Real Estate</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
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
                            <Input placeholder="First Name" {...field} />
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
                            <Input placeholder="Last Name" {...field} />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                            <Input placeholder="12345" {...field} />
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
                            <Input placeholder="1234567890" {...field} />
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

                {currentStep < steps.length ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Submitting..." : "Submit"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}