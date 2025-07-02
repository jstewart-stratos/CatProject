import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Eye, FileText, Save, RefreshCw, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface PDFField {
  name: string;
  type: string;
  mapped: boolean;
}

interface FieldMapping {
  id: number;
  templateId: number;
  pdfFieldName: string;
  dataSource: string;
  fieldType: string;
  isRequired: boolean;
  defaultValue?: string;
  transformationType?: string;
}

interface PDFFieldSelectorProps {
  templateId: number;
  templateName: string;
}

export function PDFFieldSelector({ templateId, templateName }: PDFFieldSelectorProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [fieldMappings, setFieldMappings] = useState<Record<string, Partial<FieldMapping>>>({});
  const [showPDF, setShowPDF] = useState(false);
  const [openDataSourcePopover, setOpenDataSourcePopover] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch PDF field analysis
  const { data: pdfAnalysis, isLoading: isAnalyzing, error: analysisError } = useQuery({
    queryKey: [`/api/templates/${templateId}/analyze`],
    enabled: !!templateId,
  });

  // Fetch existing field mappings
  const { data: existingMappings = [] } = useQuery<FieldMapping[]>({
    queryKey: [`/api/templates/${templateId}/mappings`],
    enabled: !!templateId,
  });

  // Update template field count mutation
  const updateFieldCountMutation = useMutation({
    mutationFn: async (fieldCount: number) => {
      return apiRequest(`/api/templates/${templateId}`, "PUT", { fieldCount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Field count updated",
        description: "Template field count has been updated successfully.",
      });
    },
  });

  // Create field mappings mutation
  const createMappingsMutation = useMutation({
    mutationFn: async (mappings: Array<Omit<FieldMapping, 'id'>>) => {
      // Delete existing mappings first
      await apiRequest("DELETE", `/api/templates/${templateId}/mappings`);
      
      // Create new mappings
      const promises = mappings.map(mapping => 
        apiRequest("POST", "/api/templates/mappings", mapping)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/templates/${templateId}/mappings`] });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Field mappings saved",
        description: "PDF field mappings have been created successfully.",
      });
    },
  });

  // Initialize selected fields and mappings from existing data
  useEffect(() => {
    if (pdfAnalysis?.fields && existingMappings.length > 0) {
      const mappedFieldNames = new Set(existingMappings.map(m => m.pdfFieldName));
      setSelectedFields(mappedFieldNames);
      
      const mappingsObj: Record<string, Partial<FieldMapping>> = {};
      existingMappings.forEach(mapping => {
        mappingsObj[mapping.pdfFieldName] = mapping;
      });
      setFieldMappings(mappingsObj);
    }
  }, [pdfAnalysis, existingMappings]);

  const dataSourceCategories = {
    "Agreement Data": [
      { value: "householdName", label: "Household Name" },
      { value: "agreementDate", label: "Agreement Date" },
      { value: "advisorName", label: "Advisor Name" },
      { value: "iarRepCode", label: "IAR Rep Code" },
      { value: "businessLine", label: "Business Line" },
      { value: "agreementCreatedBy", label: "Agreement Created By" },
      { value: "agreementCreatedDate", label: "Agreement Created Date" },
      { value: "agreementLastUpdated", label: "Agreement Last Updated" },
    ],
    "Client Personal Info": [
      { value: "firstName", label: "First Name" },
      { value: "middleName", label: "Middle Name" },
      { value: "lastName", label: "Last Name" },
      { value: "firstName,lastName", label: "Full Name" },
      { value: "firstName,middleName,lastName", label: "Full Name with Middle" },
      { value: "clientType", label: "Client Type" },
      { value: "entityType", label: "Entity Type" },
      { value: "entityName", label: "Entity Name" },
      { value: "decedentName", label: "Decedent Name" },
      { value: "tin", label: "TIN/EIN" },
      { value: "ssn", label: "SSN" },
      { value: "alias", label: "Alias" },
      { value: "dateOfBirth", label: "Date of Birth" },
      { value: "signingMethod", label: "Signing Method" },
      { value: "citizenship", label: "Citizenship" },
      { value: "residencyStatus", label: "Residency Status" },
    ],
    "Contact Info": [
      { value: "emailAddress", label: "Email Address" },
      { value: "homePhone", label: "Home Phone" },
      { value: "mobilePhone", label: "Mobile Phone" },
      { value: "businessPhone", label: "Business Phone" },
      { value: "legalAddress1", label: "Legal Address Line 1" },
      { value: "legalAddress2", label: "Legal Address Line 2" },
      { value: "legalCity", label: "Legal City" },
      { value: "legalState", label: "Legal State" },
      { value: "legalZipCode", label: "Legal ZIP Code" },
      { value: "legalAddress1,legalCity,legalState,legalZipCode", label: "Complete Legal Address" },
      { value: "mailingAddress1", label: "Mailing Address Line 1" },
      { value: "mailingAddress2", label: "Mailing Address Line 2" },
      { value: "mailingCity", label: "Mailing City" },
      { value: "mailingState", label: "Mailing State" },
      { value: "mailingZipCode", label: "Mailing ZIP Code" },
      { value: "mailingAddress1,mailingCity,mailingState,mailingZipCode", label: "Complete Mailing Address" },
    ],
    "Employment": [
      { value: "employmentStatus", label: "Employment Status" },
      { value: "industry", label: "Industry" },
      { value: "occupation", label: "Occupation" },
      { value: "employer", label: "Employer" },
      { value: "workAddress", label: "Work Address" },
      { value: "financialAffiliation", label: "Financial Affiliation" },
    ],
    "Suitability": [
      { value: "annualIncome", label: "Annual Income" },
      { value: "taxBracket", label: "Tax Bracket" },
      { value: "netWorth", label: "Net Worth" },
      { value: "liquidNetWorth", label: "Liquid Net Worth" },
      { value: "sourceOfWealth", label: "Source of Wealth" },
    ],
    "Trusted Contact": [
      { value: "trustedContactFirstName", label: "Trusted Contact First Name" },
      { value: "trustedContactLastName", label: "Trusted Contact Last Name" },
      { value: "trustedContactFirstName,trustedContactLastName", label: "Trusted Contact Full Name" },
      { value: "trustedContactPhone", label: "Trusted Contact Phone" },
      { value: "trustedContactEmail", label: "Trusted Contact Email" },
      { value: "trustedContactAddress1", label: "Trusted Contact Address 1" },
      { value: "trustedContactAddress2", label: "Trusted Contact Address 2" },
      { value: "trustedContactCity", label: "Trusted Contact City" },
      { value: "trustedContactState", label: "Trusted Contact State" },
      { value: "trustedContactZipCode", label: "Trusted Contact ZIP" },
      { value: "trustedContactAddress1,trustedContactCity,trustedContactState,trustedContactZipCode", label: "Trusted Contact Complete Address" },
    ],
    "Investment Experience": [
      { value: "hasInvestmentExperience", label: "Has Investment Experience" },
      { value: "stocksExperience", label: "Stocks Experience (Years)" },
      { value: "bondsExperience", label: "Bonds Experience (Years)" },
      { value: "mutualFundsExperience", label: "Mutual Funds Experience (Years)" },
      { value: "etfExperience", label: "ETF Experience (Years)" },
      { value: "optionsExperience", label: "Options Experience (Years)" },
      { value: "commoditiesExperience", label: "Commodities Experience (Years)" },
      { value: "forexExperience", label: "Forex Experience (Years)" },
      { value: "alternativeInvestmentsExperience", label: "Alternative Investments Experience (Years)" },
    ],
    "Financial Allocations": [
      { value: "hasFinancialAllocations", label: "Has Financial Allocations" },
      { value: "cashPercentage", label: "Cash Percentage" },
      { value: "stocksPercentage", label: "Stocks Percentage" },
      { value: "bondsPercentage", label: "Bonds Percentage" },
      { value: "realEstatePercentage", label: "Real Estate Percentage" },
      { value: "commoditiesPercentage", label: "Commodities Percentage" },
      { value: "alternativeInvestmentsPercentage", label: "Alternative Investments Percentage" },
    ],
    "Account Information": [
      { value: "accountType", label: "Account Type" },
      { value: "programType", label: "Program Type" },
      { value: "registrationType", label: "Registration Type" },
      { value: "iraType", label: "IRA Type" },
      { value: "approximateAccountValue", label: "Approximate Account Value" },
      { value: "investmentObjective", label: "Investment Objective" },
      { value: "investmentTimeHorizon", label: "Investment Time Horizon" },
      { value: "fundsNeededIn", label: "Funds Needed In" },
      { value: "advisorFee", label: "Advisor Fee" },
      { value: "simFee", label: "SIM Fee" },
      { value: "liquidityNeeds", label: "Liquidity Needs" },
      { value: "transactionCharges", label: "Transaction Charges" },
      { value: "custodian", label: "Custodian" },
      { value: "accountNumber", label: "Account Number" },
      { value: "subAdvisorName", label: "Sub Advisor Name" },
      { value: "annualAdvisorFee", label: "Annual Advisor Fee" },
      { value: "annualNeedPercentage", label: "Annual Need Percentage" },
      { value: "typeOfLiquidityNeeded", label: "Type of Liquidity Needed" },
    ],
    "Trading Options": [
      { value: "grantTradingAuthority", label: "Grant Trading Authority" },
      { value: "fullDiscretionaryTrading", label: "Full Discretionary Trading" },
      { value: "structuredProductTrading", label: "Structured Product Trading" },
      { value: "complexEtpTrading", label: "Complex ETP Trading" },
      { value: "optionsTrading", label: "Options Trading" },
      { value: "optionsLevel", label: "Options Level" },
    ],
    "Additional Account Holder": [
      { value: "additionalAccountHolderFirstName", label: "Additional Holder First Name" },
      { value: "additionalAccountHolderLastName", label: "Additional Holder Last Name" },
      { value: "additionalAccountHolderDateOfBirth", label: "Additional Holder Date of Birth" },
      { value: "additionalAccountHolderSsn", label: "Additional Holder SSN" },
      { value: "additionalAccountHolderPhone", label: "Additional Holder Phone" },
    ],
    "Beneficiaries": [
      { value: "primaryBeneficiaryName", label: "Primary Beneficiary Name" },
      { value: "primaryBeneficiaryRelationship", label: "Primary Beneficiary Relationship" },
      { value: "primaryBeneficiaryPercentage", label: "Primary Beneficiary Percentage" },
      { value: "contingentBeneficiaryName", label: "Contingent Beneficiary Name" },
      { value: "contingentBeneficiaryRelationship", label: "Contingent Beneficiary Relationship" },
      { value: "contingentBeneficiaryPercentage", label: "Contingent Beneficiary Percentage" },
    ],
    "ACH Information": [
      { value: "achBankName", label: "ACH Bank Name" },
      { value: "achAccountNumber", label: "ACH Account Number" },
      { value: "achRoutingNumber", label: "ACH Routing Number" },
      { value: "achAccountType", label: "ACH Account Type" },
    ],
    "Client Signatures": [
      { value: "clientSignature", label: "Client Signature" },
      { value: "clientSignatureDate", label: "Client Signature Date" },
      { value: "clientCapacity", label: "Client Capacity" },
      { value: "clientNamePrint", label: "Client Name (Print)" },
      { value: "secondaryClientSignature", label: "Secondary Client Signature" },
      { value: "secondaryClientCapacity", label: "Secondary Client Capacity" },
      { value: "secondaryClientNamePrint", label: "Secondary Client Name (Print)" },
      { value: "iarSignature", label: "IAR Signature" },
      { value: "iarSignatureDate", label: "IAR Signature Date" },
      { value: "iarNamePrint", label: "IAR Name (Print)" },
      { value: "primaryInitial", label: "Primary Initial" },
      { value: "secondaryInitial", label: "Secondary Initial" },
    ]
  };

  const handleFieldToggle = (fieldName: string, checked: boolean) => {
    const newSelected = new Set(selectedFields);
    if (checked) {
      newSelected.add(fieldName);
      // Initialize mapping for new field
      if (!fieldMappings[fieldName]) {
        setFieldMappings(prev => ({
          ...prev,
          [fieldName]: {
            templateId,
            pdfFieldName: fieldName,
            dataSource: '',
            fieldType: 'text',
            isRequired: false,
          }
        }));
      }
    } else {
      newSelected.delete(fieldName);
      // Remove mapping for unselected field
      setFieldMappings(prev => {
        const newMappings = { ...prev };
        delete newMappings[fieldName];
        return newMappings;
      });
    }
    setSelectedFields(newSelected);
  };

  const handleMappingChange = (fieldName: string, key: string, value: any) => {
    setFieldMappings(prev => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [key]: value,
      }
    }));
  };

  const handleSaveMappings = () => {
    const selectedMappings = Array.from(selectedFields).map(fieldName => {
      const mapping = fieldMappings[fieldName];
      return {
        templateId,
        pdfFieldName: fieldName,
        dataSource: mapping?.dataSource || '',
        fieldType: mapping?.fieldType || 'text',
        isRequired: mapping?.isRequired || false,
        defaultValue: mapping?.defaultValue || undefined,
        transformationType: mapping?.transformationType || undefined,
      };
    }).filter(mapping => mapping.dataSource); // Only save mappings with data sources

    if (selectedMappings.length === 0) {
      toast({
        title: "No mappings to save",
        description: "Please select fields and configure their data sources.",
        variant: "destructive",
      });
      return;
    }

    createMappingsMutation.mutate(selectedMappings);
  };

  const handleUpdateFieldCount = () => {
    if (pdfAnalysis?.fieldCount) {
      updateFieldCountMutation.mutate(pdfAnalysis.fieldCount);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Analyzing PDF template...</span>
      </div>
    );
  }

  if (analysisError) {
    return (
      <div className="p-4 text-red-600">
        Error analyzing PDF: {analysisError.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              {templateName}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleUpdateFieldCount}
                disabled={updateFieldCountMutation.isPending}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Count
              </Button>
              <Button
                onClick={() => window.open(`/api/templates/${templateId}/pdf`, '_blank')}
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                Open PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Fields detected: {pdfAnalysis?.fieldCount || 0}</span>
            <span>Mappings configured: {existingMappings.length}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Selection */}
        <Card>
          <CardHeader>
            <CardTitle>
              Select PDF Fields ({selectedFields.size} selected)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {pdfAnalysis?.fields?.map((field: PDFField) => (
                  <div key={field.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={field.name}
                      checked={selectedFields.has(field.name)}
                      onCheckedChange={(checked) => 
                        handleFieldToggle(field.name, checked as boolean)
                      }
                    />
                    <Label htmlFor={field.name} className="flex-1 font-mono text-sm">
                      {field.name}
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Field Configuration */}
        {selectedFields.size > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Configure Field Mappings</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {Array.from(selectedFields).map(fieldName => (
                    <div key={fieldName} className="border rounded-lg p-3 bg-muted/30">
                      <div className="font-medium text-sm font-mono mb-2">
                        {fieldName}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`${fieldName}-datasource`} className="text-xs">
                            Data Source
                          </Label>
                          <Popover 
                            open={openDataSourcePopover[fieldName] || false} 
                            onOpenChange={(open) => 
                              setOpenDataSourcePopover(prev => ({ ...prev, [fieldName]: open }))
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openDataSourcePopover[fieldName] || false}
                                className="w-full justify-between"
                              >
                                {fieldMappings[fieldName]?.dataSource 
                                  ? Object.values(dataSourceCategories).flat().find(option => option.value === fieldMappings[fieldName]?.dataSource)?.label
                                  : "Select data source..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Search data sources..." />
                                <CommandEmpty>No data source found.</CommandEmpty>
                                <CommandList className="max-h-60">
                                  {Object.entries(dataSourceCategories).map(([category, options]) => (
                                    <CommandGroup key={category} heading={category}>
                                      {options.map((option) => (
                                        <CommandItem
                                          key={option.value}
                                          value={option.value}
                                          onSelect={(value) => {
                                            handleMappingChange(fieldName, 'dataSource', value);
                                            setOpenDataSourcePopover(prev => ({ ...prev, [fieldName]: false }));
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              fieldMappings[fieldName]?.dataSource === option.value 
                                                ? "opacity-100" 
                                                : "opacity-0"
                                            )}
                                          />
                                          {option.label}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  ))}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div>
                          <Label htmlFor={`${fieldName}-default`} className="text-xs">
                            Default Value (optional)
                          </Label>
                          <Input
                            id={`${fieldName}-default`}
                            placeholder="Enter default value"
                            value={fieldMappings[fieldName]?.defaultValue || ''}
                            onChange={(e) =>
                              handleMappingChange(fieldName, 'defaultValue', e.target.value)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Separator className="my-4" />
              
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveMappings}
                  disabled={createMappingsMutation.isPending || selectedFields.size === 0}
                  className="w-full md:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMappingsMutation.isPending ? 'Saving...' : 'Save Field Mappings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}