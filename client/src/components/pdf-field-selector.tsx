import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Eye, FileText, Save, RefreshCw } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch PDF field analysis
  const { data: pdfAnalysis, isLoading: isAnalyzing } = useQuery({
    queryKey: ["/api/templates", templateId, "analyze"],
    enabled: !!templateId,
  });

  // Fetch existing field mappings
  const { data: existingMappings = [] } = useQuery<FieldMapping[]>({
    queryKey: ["/api/templates", templateId, "mappings"],
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
      await apiRequest(`/api/templates/${templateId}/mappings`, "DELETE");
      
      // Create new mappings
      const promises = mappings.map(mapping => 
        apiRequest("/api/templates/mappings", "POST", mapping)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", templateId, "mappings"] });
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

  const dataSourceOptions = [
    { value: "firstName", label: "First Name" },
    { value: "lastName", label: "Last Name" },
    { value: "firstName,lastName", label: "Full Name" },
    { value: "householdName", label: "Household Name" },
    { value: "agreementDate", label: "Agreement Date" },
    { value: "advisorName", label: "Advisor Name" },
    { value: "iarRepCode", label: "IAR Rep Code" },
    { value: "emailAddress", label: "Email Address" },
    { value: "homePhone", label: "Home Phone" },
    { value: "legalAddress1", label: "Legal Address Line 1" },
    { value: "city", label: "City" },
    { value: "state", label: "State" },
    { value: "zipCode", label: "ZIP Code" },
    { value: "ssn", label: "SSN" },
    { value: "dateOfBirth", label: "Date of Birth" },
  ];

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
        defaultValue: mapping?.defaultValue || null,
        transformationType: mapping?.transformationType || null,
      };
    });

    // Update field count
    updateFieldCountMutation.mutate(selectedFields.size);
    
    // Save mappings
    createMappingsMutation.mutate(selectedMappings);
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Analyzing PDF fields...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {templateName}
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {pdfAnalysis?.fieldCount || 0} fields found
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPDF(!showPDF)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPDF ? 'Hide' : 'View'} PDF
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Viewer */}
        {showPDF && (
          <Card>
            <CardHeader>
              <CardTitle>PDF Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-96 border rounded-lg overflow-hidden">
                <iframe
                  src={`/api/templates/${templateId}/pdf`}
                  className="w-full h-full"
                  title={`${templateName} Preview`}
                />
              </div>
            </CardContent>
          </Card>
        )}

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
      </div>

      {/* Field Mappings Configuration */}
      {selectedFields.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Field Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {Array.from(selectedFields).map((fieldName) => (
                  <div key={fieldName} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-mono text-sm font-semibold">
                        {fieldName}
                      </Label>
                      <Checkbox
                        checked={fieldMappings[fieldName]?.isRequired || false}
                        onCheckedChange={(checked) =>
                          handleMappingChange(fieldName, 'isRequired', checked)
                        }
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`${fieldName}-datasource`} className="text-xs">
                          Data Source
                        </Label>
                        <Select
                          value={fieldMappings[fieldName]?.dataSource || ''}
                          onValueChange={(value) =>
                            handleMappingChange(fieldName, 'dataSource', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select data source" />
                          </SelectTrigger>
                          <SelectContent>
                            {dataSourceOptions.map(option => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
  );
}