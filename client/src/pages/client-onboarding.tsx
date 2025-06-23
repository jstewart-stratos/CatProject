import { useState, useEffect } from "react";
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
import { useEmploymentLogic, useInvestmentLogic, useClientTypeLogic } from "@/hooks/useFormLogic";

const stepIcons = {
  1: User,
  2: Phone,
  3: Briefcase,
  4: DollarSign,
  5: Shield,
  6: TrendingUp,
  7: Building,
};

// Schema for Step 1 - Client Information (based on screenshot)
const personalInfoSchema = z.object({
  clientType: z.string().min(1, "Client type is required"),
  ssn: z.string().min(1, "SSN is required"),
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  alias: z.string().optional(),
  citizenship: z.string().min(1, "Citizenship/Legal Establishment is required"),
  residencyStatus: z.string().min(1, "Residency status is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  signingMethod: z.string().min(1, "Signing method is required"),
});

const contactInfoSchema = z.object({
  emailAddress: z.string().email("Valid email is required"),
  legalAddress1: z.string().min(1, "Legal address is required"),
  legalAddress2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().min(1, "ZIP code is required"),
  homePhone: z.string().optional(),
  mobilePhone: z.string().optional(),
  businessPhone: z.string().optional(),
  mailingAddressSameAsAbove: z.boolean().default(false),
  mailingAddress1: z.string().optional(),
  mailingAddress2: z.string().optional(),
  mailingCity: z.string().optional(),
  mailingState: z.string().optional(),
  mailingZipCode: z.string().optional(),
});

const employmentInfoSchema = z.object({
  status: z.string().min(1, "Status is required"),
  industry: z.string().min(1, "Industry is required"),
  occupation: z.string().min(1, "Occupation is required"),
});

const suitabilityInfoSchema = z.object({
  annualIncome: z.string().min(1, "Annual income is required"),
  taxBracket: z.string().min(1, "Tax bracket is required"),
  netWorth: z.string().min(1, "Net worth is required"),
  liquidNetWorth: z.string().min(1, "Liquid net worth is required"),
  sourceOfWealth: z.string().min(1, "Source of wealth is required"),
});

const trustedContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  relationship: z.string().optional(),
  streetAddress1: z.string().optional(),
  streetAddress2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  emailAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
});

const investmentExperienceSchema = z.object({
  hasInvestmentExperience: z.string().min(1, "Please select an option"),
  annuitiesYears: z.string().optional(),
  bondsYears: z.string().optional(),
  marginYears: z.string().optional(),
  mutualFundsYears: z.string().optional(),
  optionsYears: z.string().optional(),
  partnershipsYears: z.string().optional(),
  stocksYears: z.string().optional(),
  otherYears: z.string().optional(),
});

const financialInfoSchema = z.object({
  hasOtherInvestments: z.string().min(1, "Please select an option"),
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
  
  // Initialize conditional logic hooks
  const employmentLogic = useEmploymentLogic();
  const investmentLogic = useInvestmentLogic();
  const clientTypeLogic = useClientTypeLogic();

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
      <div className="space-y-6">
        {/* Client Type Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Client Type</h3>
          <FormField
            control={personalForm.control}
            name="clientType"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => field.onChange("Individual")}
                      className={`px-4 py-2 rounded-lg border ${
                        field.value === "Individual"
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-gray-100 border-gray-300 text-gray-700"
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("Entity")}
                      className={`px-4 py-2 rounded-lg border ${
                        field.value === "Entity"
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-gray-100 border-gray-300 text-gray-700"
                      }`}
                    >
                      Entity
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Personal Information Section */}
        <div>
          <h3 className="text-lg font-medium mb-4">Personal Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={personalForm.control}
                name="ssn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSN</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="123456789" />
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
                      <Input {...field} placeholder="John" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={personalForm.control}
                name="middleName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="A." />
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
                      <Input {...field} placeholder="Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={personalForm.control}
                name="alias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alias</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nickname (optional)" />
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
                    <FormLabel>Citizenship / Legal Establishment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="US Citizen">US Citizen</SelectItem>
                        <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                        <SelectItem value="Non-Resident Alien">Non-Resident Alien</SelectItem>
                        <SelectItem value="Foreign Entity">Foreign Entity</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={personalForm.control}
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
                        <SelectItem value="US Resident">US Resident</SelectItem>
                        <SelectItem value="Non-US Resident">Non-US Resident</SelectItem>
                        <SelectItem value="Dual Resident">Dual Resident</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={personalForm.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Of Birth</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" placeholder="mm/dd/yyyy" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={personalForm.control}
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
                        <SelectItem value="Electronic">Electronic</SelectItem>
                        <SelectItem value="Physical">Physical</SelectItem>
                        <SelectItem value="Wet Signature">Wet Signature</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </Form>
  );

  const renderContactInfo = () => (
    <Form {...contactForm}>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-4">Contact Information</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={contactForm.control}
              name="emailAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="name@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={contactForm.control}
              name="legalAddress1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main St" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={contactForm.control}
              name="legalAddress2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Legal Address Line 2</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Apt, Suite, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={contactForm.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="City" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={contactForm.control}
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
              control={contactForm.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="12345" />
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
                    <Input {...field} placeholder="1234567890" />
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
                    <Input {...field} placeholder="0987654321" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={contactForm.control}
              name="businessPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Phone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="5555555555" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={contactForm.control}
            name="mailingAddressSameAsAbove"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="mt-1"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Mailing address same as above</FormLabel>
                </div>
              </FormItem>
            )}
          />

          {!contactForm.watch('mailingAddressSameAsAbove') && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={contactForm.control}
                  name="mailingAddress1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mailing Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="123 Main St" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
                  name="mailingAddress2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mailing Address Line 2</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apt, Suite, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={contactForm.control}
                  name="mailingCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mailing City</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="City" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={contactForm.control}
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
                  control={contactForm.control}
                  name="mailingZipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mailing Zip Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Form>
  );

  const renderEmploymentInfo = () => {
    const currentStatus = employmentForm.watch('status');
    const industryRequired = employmentLogic.getIndustryRequirement(currentStatus || '');
    
    // Auto-set industry for certain statuses
    useEffect(() => {
      if (currentStatus) {
        const defaultIndustry = employmentLogic.getDefaultIndustry(currentStatus);
        if (defaultIndustry && defaultIndustry !== currentStatus) {
          employmentForm.setValue('industry', '');
        } else if (defaultIndustry === currentStatus) {
          employmentForm.setValue('industry', currentStatus);
        }
      }
    }, [currentStatus]);

    return (
      <Form {...employmentForm}>
        <div className="space-y-6">
          <h3 className="text-lg font-medium mb-4">Employment Information</h3>
          
          <div className="space-y-4">
            <FormField
              control={employmentForm.control}
              name="status"
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
                      <SelectItem value="Employed">Employed</SelectItem>
                      <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                      <SelectItem value="Unemployed">Unemployed</SelectItem>
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
              control={employmentForm.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Industry {industryRequired && <span className="text-red-500">*</span>}
                  </FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!industryRequired}
                  >
                    <FormControl>
                      <SelectTrigger className={!industryRequired ? 'opacity-50' : ''}>
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
                  {!industryRequired && (
                    <p className="text-sm text-gray-500">Industry not required for this employment status</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={employmentForm.control}
              name="occupation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Occupation"
                      disabled={!industryRequired}
                      className={!industryRequired ? 'opacity-50' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                  {!industryRequired && (
                    <p className="text-sm text-gray-500">Occupation not required for this employment status</p>
                  )}
                </FormItem>
              )}
            />
          </div>
        </div>
      </Form>
    );
  };

  const renderSuitabilityInfo = () => (
    <Form {...suitabilityForm}>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-4">Suitability</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={suitabilityForm.control}
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
                      <SelectItem value="Under $25,000">Under $25,000</SelectItem>
                      <SelectItem value="$25,000 - $49,999">$25,000 - $49,999</SelectItem>
                      <SelectItem value="$50,000 - $99,999">$50,000 - $99,999</SelectItem>
                      <SelectItem value="$100,000 - $199,999">$100,000 - $199,999</SelectItem>
                      <SelectItem value="$200,000 - $499,999">$200,000 - $499,999</SelectItem>
                      <SelectItem value="$500,000+">$500,000+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={suitabilityForm.control}
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
                      <SelectItem value="10%">10%</SelectItem>
                      <SelectItem value="12%">12%</SelectItem>
                      <SelectItem value="22%">22%</SelectItem>
                      <SelectItem value="24%">24%</SelectItem>
                      <SelectItem value="32%">32%</SelectItem>
                      <SelectItem value="35%">35%</SelectItem>
                      <SelectItem value="37%">37%</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={suitabilityForm.control}
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
                      <SelectItem value="Under $100,000">Under $100,000</SelectItem>
                      <SelectItem value="$100,000 - $499,999">$100,000 - $499,999</SelectItem>
                      <SelectItem value="$500,000 - $999,999">$500,000 - $999,999</SelectItem>
                      <SelectItem value="$1,000,000 - $4,999,999">$1,000,000 - $4,999,999</SelectItem>
                      <SelectItem value="$5,000,000+">$5,000,000+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={suitabilityForm.control}
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
                      <SelectItem value="Under $50,000">Under $50,000</SelectItem>
                      <SelectItem value="$50,000 - $199,999">$50,000 - $199,999</SelectItem>
                      <SelectItem value="$200,000 - $499,999">$200,000 - $499,999</SelectItem>
                      <SelectItem value="$500,000 - $999,999">$500,000 - $999,999</SelectItem>
                      <SelectItem value="$1,000,000+">$1,000,000+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={suitabilityForm.control}
            name="sourceOfWealth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source of Wealth</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Employment Income">Employment Income</SelectItem>
                    <SelectItem value="Business Ownership">Business Ownership</SelectItem>
                    <SelectItem value="Investment Income">Investment Income</SelectItem>
                    <SelectItem value="Inheritance">Inheritance</SelectItem>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                    <SelectItem value="Retirement Savings">Retirement Savings</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
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

  const renderTrustedContact = () => (
    <Form {...trustedContactForm}>
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-4">
          <h3 className="text-lg font-medium">Trusted Contact</h3>
          <div className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
            i
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={trustedContactForm.control}
              name="firstName"
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
              control={trustedContactForm.control}
              name="lastName"
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={trustedContactForm.control}
              name="relationship"
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
                      <SelectItem value="Spouse">Spouse</SelectItem>
                      <SelectItem value="Child">Child</SelectItem>
                      <SelectItem value="Parent">Parent</SelectItem>
                      <SelectItem value="Sibling">Sibling</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Attorney">Attorney</SelectItem>
                      <SelectItem value="Accountant">Accountant</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={trustedContactForm.control}
              name="streetAddress1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address 1</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main St" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={trustedContactForm.control}
              name="streetAddress2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address 2</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Apt, Suite, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={trustedContactForm.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="City" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={trustedContactForm.control}
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
              control={trustedContactForm.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Zip Code</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="12345" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={trustedContactForm.control}
              name="emailAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="name@example.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={trustedContactForm.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="1234567890" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </Form>
  );

  const renderInvestmentExperience = () => (
    <Form {...investmentForm}>
      <div className="space-y-6">
        <h3 className="text-lg font-medium mb-4">Investment Experience</h3>
        
        <div className="space-y-4">
          <FormField
            control={investmentForm.control}
            name="hasInvestmentExperience"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">Does the client have any other prior investment experience?</FormLabel>
                <FormControl>
                  <div className="flex space-x-4 mt-2">
                    <button
                      type="button"
                      onClick={() => field.onChange("No")}
                      className={`px-4 py-2 rounded-lg border ${
                        field.value === "No"
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-gray-100 border-gray-300 text-gray-700"
                      }`}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("Yes")}
                      className={`px-4 py-2 rounded-lg border ${
                        field.value === "Yes"
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-gray-100 border-gray-300 text-gray-700"
                      }`}
                    >
                      Yes
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {investmentForm.watch('hasInvestmentExperience') === 'Yes' && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={investmentForm.control}
                  name="annuitiesYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annuities (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={investmentForm.control}
                  name="bondsYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonds (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={investmentForm.control}
                  name="marginYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Margin (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={investmentForm.control}
                  name="mutualFundsYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mutual Funds (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={investmentForm.control}
                  name="optionsYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Options (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={investmentForm.control}
                  name="partnershipsYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partnerships (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={investmentForm.control}
                  name="stocksYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stocks (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={investmentForm.control}
                  name="otherYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other (years)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Form>
  );

  const renderFinancialInfo = () => {
    const hasOtherInvestments = financialForm.watch('hasOtherInvestments');
    const showBreakdown = investmentLogic.shouldShowFinancialBreakdown(hasOtherInvestments || '');
    
    // Get all percentage values for validation
    const percentageValues = {
      altInvestmentsPercent: financialForm.watch('altInvestmentsPercent') || '0',
      annuitiesPercent: financialForm.watch('annuitiesPercent') || '0',
      bondsPercent: financialForm.watch('bondsPercent') || '0',
      checkingSavingsPercent: financialForm.watch('checkingSavingsPercent') || '0',
      equitiesPercent: financialForm.watch('equitiesPercent') || '0',
      insurancePercent: financialForm.watch('insurancePercent') || '0',
      mutualFundsPercent: financialForm.watch('mutualFundsPercent') || '0',
      realEstatePercent: financialForm.watch('realEstatePercent') || '0',
      otherPercent: financialForm.watch('otherPercent') || '0',
    };
    
    const { isValid: percentageValid, total: percentageTotal } = investmentLogic.validatePercentageTotal(percentageValues);

    return (
      <Form {...financialForm}>
        <div className="space-y-6">
          <h3 className="text-lg font-medium mb-4">Financial Information</h3>
          
          <div className="space-y-4">
            <FormField
              control={financialForm.control}
              name="hasOtherInvestments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Does your client have other investments (includes other assets held at LPL)?</FormLabel>
                  <FormControl>
                    <div className="flex space-x-4 mt-2">
                      <button
                        type="button"
                        onClick={() => field.onChange("No")}
                        className={`px-4 py-2 rounded-lg border ${
                          field.value === "No"
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "bg-gray-100 border-gray-300 text-gray-700"
                        }`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("Yes")}
                        className={`px-4 py-2 rounded-lg border ${
                          field.value === "Yes"
                            ? "bg-blue-100 border-blue-300 text-blue-700"
                            : "bg-gray-100 border-gray-300 text-gray-700"
                        }`}
                      >
                        Yes
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          {financialForm.watch('hasOtherInvestments') === 'Yes' && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={financialForm.control}
                  name="altInvestmentsPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alt. Investments</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={financialForm.control}
                  name="annuitiesPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annuities</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={financialForm.control}
                  name="bondsPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonds</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={financialForm.control}
                  name="checkingSavingsPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checking – Savings</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={financialForm.control}
                  name="equitiesPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equities</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={financialForm.control}
                  name="insurancePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insurance</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={financialForm.control}
                  name="mutualFundsPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mutual Funds</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={financialForm.control}
                  name="realEstatePercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Real Estate</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <FormField
                  control={financialForm.control}
                  name="otherPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input {...field} placeholder="0" className="pr-8" />
                        </FormControl>
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className={`text-sm mt-4 p-3 rounded-lg border ${
                percentageValid 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                <div className="flex justify-between items-center">
                  <span>Current Total: {percentageTotal.toFixed(1)}%</span>
                  <span className="font-medium">
                    {percentageValid ? '✓ Valid' : '⚠ Must equal 100%'}
                  </span>
                </div>
                {!percentageValid && (
                  <div className="text-xs mt-1">
                    {percentageTotal < 100 
                      ? `Need ${(100 - percentageTotal).toFixed(1)}% more` 
                      : `Reduce by ${(percentageTotal - 100).toFixed(1)}%`}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Form>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderPersonalInfo();
      case 2: return renderContactInfo();
      case 3: return renderEmploymentInfo();
      case 4: return renderSuitabilityInfo();
      case 5: return renderTrustedContact();
      case 6: return renderInvestmentExperience();
      case 7: return renderFinancialInfo();
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