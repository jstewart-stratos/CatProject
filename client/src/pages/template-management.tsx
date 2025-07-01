import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, FileText, Trash2, Settings, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import TopBar from "@/components/top-bar";

interface Template {
  id: number;
  name: string;
  businessLine: string;
  fileName: string;
  fieldCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FieldMapping {
  id: number;
  templateId: number;
  pdfFieldName: string;
  dataSource: string;
  fieldType: string;
  defaultValue?: string;
  isRequired: boolean;
}

export default function TemplateManagement() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Fetch field mappings for selected template
  const { data: fieldMappings = [] } = useQuery<FieldMapping[]>({
    queryKey: ["/api/templates", selectedTemplate?.id, "mappings"],
    enabled: !!selectedTemplate,
  });

  // Upload template mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setIsUploadDialogOpen(false);
      setUploadFile(null);
      toast({
        title: "Template uploaded successfully",
        description: "PDF template has been analyzed and is ready for field mapping.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload template",
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/templates/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Template deleted",
        description: "Template and all field mappings have been removed.",
      });
    },
  });

  // Update field mapping mutation
  const updateMappingMutation = useMutation({
    mutationFn: async ({ mappingId, data }: { mappingId: number; data: Partial<FieldMapping> }) => {
      return apiRequest(`/api/templates/mappings/${mappingId}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates", selectedTemplate?.id, "mappings"] });
      toast({
        title: "Field mapping updated",
        description: "Field mapping has been saved successfully.",
      });
    },
  });

  const handleUpload = () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append("template", uploadFile);
    formData.append("name", uploadFile.name.replace(/\.[^/.]+$/, ""));
    formData.append("businessLine", "SWP"); // Default, can be changed later

    uploadMutation.mutate(formData);
  };

  const handleFieldMappingChange = (mappingId: number, field: string, value: any) => {
    updateMappingMutation.mutate({
      mappingId,
      data: { [field]: value },
    });
  };

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
    { value: "annualIncome", label: "Annual Income" },
    { value: "netWorth", label: "Net Worth" },
    { value: "liquidNetWorth", label: "Liquid Net Worth" },
    { value: "taxBracket", label: "Tax Bracket" },
    { value: "version", label: "Version" },
    { value: "status", label: "Status" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentView="template-management" />
      <div className="lg:ml-64">
        <TopBar 
          title="Template Management" 
          subtitle="Manage PDF templates and field mappings for client agreements"
        />
        <main className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
              <p className="text-gray-600">Upload and configure PDF templates for client agreements</p>
            </div>
            
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Upload Template
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload PDF Template</DialogTitle>
                  <DialogDescription>
                    Upload a PDF template that will be analyzed for form fields
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-file">PDF Template File</Label>
                    <Input
                      id="template-file"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload}
                      disabled={!uploadFile || uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>PDF Templates</CardTitle>
              <CardDescription>
                Manage your PDF templates and their field mappings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No templates found. Upload your first PDF template to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Business Line</TableHead>
                      <TableHead>Field Count</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-gray-500" />
                            {template.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.businessLine}</Badge>
                        </TableCell>
                        <TableCell>{template.fieldCount} fields</TableCell>
                        <TableCell>
                          {new Date(template.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setIsMappingDialogOpen(true);
                              }}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Map Fields
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteMutation.mutate(template.id)}
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

          {/* Field Mapping Dialog */}
          <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Field Mappings - {selectedTemplate?.name}</DialogTitle>
                <DialogDescription>
                  Map PDF form fields to data sources from the client agreement workflow
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PDF Field Name</TableHead>
                      <TableHead>Data Source</TableHead>
                      <TableHead>Field Type</TableHead>
                      <TableHead>Default Value</TableHead>
                      <TableHead>Required</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fieldMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-mono text-sm">
                          {mapping.pdfFieldName}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.dataSource}
                            onValueChange={(value) => 
                              handleFieldMappingChange(mapping.id, "dataSource", value)
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select data source" />
                            </SelectTrigger>
                            <SelectContent>
                              {dataSourceOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={mapping.fieldType}
                            onValueChange={(value) => 
                              handleFieldMappingChange(mapping.id, "fieldType", value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-32"
                            value={mapping.defaultValue || ""}
                            onChange={(e) => 
                              handleFieldMappingChange(mapping.id, "defaultValue", e.target.value)
                            }
                            placeholder="Default"
                          />
                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={mapping.isRequired}
                            onChange={(e) => 
                              handleFieldMappingChange(mapping.id, "isRequired", e.target.checked)
                            }
                            className="w-4 h-4"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}