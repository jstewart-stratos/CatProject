import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Sidebar from '@/components/sidebar';
import TopBar from '@/components/top-bar';
import { Plus, FileText, Settings, Eye, Download, Upload, FileUp, MapPin } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

interface DocumentTemplate {
  id: number;
  name: string;
  description?: string;
  templateType: string;
  fields: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DocumentField {
  name: string;
  type: "text" | "date" | "checkbox" | "select";
  dataSource: string;
  defaultValue?: string;
  required?: boolean;
  description?: string;
}

interface FieldMappingRowProps {
  field: any;
  index: number;
  onUpdate: (index: number, mapping: DocumentField) => void;
}

function FieldMappingRow({ field, index, onUpdate }: FieldMappingRowProps) {
  const [mapping, setMapping] = useState<DocumentField>({
    name: field.name || '',
    type: 'text',
    dataSource: '',
    required: false,
  });

  const clientDataSources = [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'middleName', label: 'Middle Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'ssn', label: 'SSN' },
    { value: 'dateOfBirth', label: 'Date of Birth' },
    { value: 'homePhone', label: 'Home Phone' },
    { value: 'mobilePhone', label: 'Mobile Phone' },
    { value: 'businessPhone', label: 'Business Phone' },
    { value: 'legalAddress1', label: 'Legal Address Line 1' },
    { value: 'legalAddress2', label: 'Legal Address Line 2' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State' },
    { value: 'zipCode', label: 'ZIP Code' },
    { value: 'employmentStatus', label: 'Employment Status' },
    { value: 'industry', label: 'Industry' },
    { value: 'occupation', label: 'Occupation' },
    { value: 'employer', label: 'Employer' },
    { value: 'annualIncome', label: 'Annual Income' },
    { value: 'netWorth', label: 'Net Worth' },
    { value: 'citizenship', label: 'Citizenship' },
    // Account fields
    { value: 'accountType', label: 'Account Type' },
    { value: 'programType', label: 'Program Type' },
    { value: 'registrationType', label: 'Registration Type' },
  ];

  useEffect(() => {
    onUpdate(index, mapping);
  }, [mapping, index, onUpdate]);

  return (
    <Card className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">{field.name}</Label>
          <p className="text-xs text-gray-500 mt-1">PDF Field</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`dataSource-${index}`}>Map to Client Data</Label>
          <Select
            value={mapping.dataSource}
            onValueChange={(value) => setMapping({ ...mapping, dataSource: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">-- Do not map --</SelectItem>
              {clientDataSources.map((source) => (
                <SelectItem key={source.value} value={source.value}>
                  {source.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${index}`}
              checked={mapping.required}
              onCheckedChange={(checked) => 
                setMapping({ ...mapping, required: !!checked })
              }
            />
            <Label htmlFor={`required-${index}`} className="text-sm">
              Required
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function DocumentTemplates() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isFieldMappingDialogOpen, setIsFieldMappingDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedFields, setExtractedFields] = useState<any[]>([]);
  const [mappedFields, setMappedFields] = useState<DocumentField[]>([]);
  const [isExtractingFields, setIsExtractingFields] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset account selection when client changes
  useEffect(() => {
    setSelectedAccountId('');
  }, [selectedClientId]);

  // Handler functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setExtractedFields([]);
      setMappedFields([]);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
    }
  };

  const extractFieldsFromPDF = async () => {
    if (!uploadedFile) return;
    
    setIsExtractingFields(true);
    try {
      const formData = new FormData();
      formData.append('pdf', uploadedFile);
      
      const response = await fetch('/api/extract-pdf-fields', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to extract fields from PDF');
      }
      
      const data = await response.json();
      setExtractedFields(data.fields || []);
      
      toast({
        title: "Fields Extracted",
        description: `Found ${data.fields?.length || 0} form fields in the PDF.`,
      });
    } catch (error: any) {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract fields from PDF",
        variant: "destructive",
      });
    } finally {
      setIsExtractingFields(false);
    }
  };

  const updateFieldMapping = (index: number, mapping: DocumentField) => {
    const newMappings = [...mappedFields];
    newMappings[index] = mapping;
    setMappedFields(newMappings);
  };

  const handleCreateTemplate = async (formData: FormData) => {
    if (!uploadedFile) {
      toast({
        title: "Missing File",
        description: "Please upload a PDF document.",
        variant: "destructive",
      });
      return;
    }

    try {
      // First upload the PDF file
      const fileFormData = new FormData();
      fileFormData.append('pdf', uploadedFile);
      fileFormData.append('name', formData.get('name') as string);
      fileFormData.append('description', formData.get('description') as string);
      fileFormData.append('templateType', formData.get('templateType') as string);
      fileFormData.append('fields', JSON.stringify(mappedFields));

      const response = await fetch('/api/upload-pdf-template', {
        method: 'POST',
        body: fileFormData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload template');
      }

      const result = await response.json();
      
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
      setIsCreateDialogOpen(false);
      setUploadedFile(null);
      setExtractedFields([]);
      setMappedFields([]);
      
      toast({
        title: "Template Created",
        description: "PDF template has been uploaded and configured successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    }
  };

  // Query for document templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/document-templates'],
    retry: false,
  });

  // Query for clients (for document generation)
  const { data: clientsResponse } = useQuery({
    queryKey: ['/api/clients'],
    retry: false,
  });
  const clients = (clientsResponse as any)?.clients || [];

  // Query for accounts based on selected client
  const { data: accounts } = useQuery({
    queryKey: ['/api/accounts/by-client', selectedClientId],
    queryFn: async () => {
      const response = await fetch(`/api/accounts/by-client/${selectedClientId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      return response.json();
    },
    enabled: !!selectedClientId && selectedClientId !== "" && !isNaN(Number(selectedClientId)),
    retry: false,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (templateData: any) => apiRequest('/api/document-templates', 'POST', templateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/document-templates'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Template Created",
        description: "Document template has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // Generate document mutation
  const generateDocumentMutation = useMutation({
    mutationFn: async (data: { templateId: number; clientId: number; accountId?: number }) => {
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate document');
      }
      
      return response.json();
    },
    onSuccess: (response: any) => {
      setIsGenerateDialogOpen(false);
      setSelectedClientId('');
      setSelectedAccountId('');
      
      // Create download blob and trigger download
      if (response.content && response.filename) {
        // Create a blob with the HTML content
        const blob = new Blob([response.content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Create a download link and trigger it
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        URL.revokeObjectURL(url);
        
        toast({
          title: "Document Generated",
          description: "Document has been generated and downloaded successfully.",
        });
      } else if (response.content) {
        // Fallback: open document content in new window
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(response.content);
          newWindow.document.close();
        }
        
        toast({
          title: "Document Generated",
          description: "Document has been generated and opened in a new window.",
        });
      } else {
        toast({
          title: "Document Generated",
          description: "Document has been generated successfully.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to generate document",
        variant: "destructive",
      });
    },
  });

  const viewTemplateFields = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const openGenerateDialog = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setSelectedClientId('');
    setSelectedAccountId('');
    setIsGenerateDialogOpen(true);
  };

  const handleGenerateDocument = () => {
    if (!selectedTemplate || !selectedClientId) return;
    
    generateDocumentMutation.mutate({
      templateId: selectedTemplate.id,
      clientId: parseInt(selectedClientId),
      accountId: selectedAccountId && selectedAccountId !== "none" ? parseInt(selectedAccountId) : undefined,
    });
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'client_agreement': return 'bg-blue-100 text-blue-800';
      case 'account_opening': return 'bg-green-100 text-green-800';
      case 'advisory_agreement': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentView="document-templates" />
      <div className="lg:ml-64">
        <TopBar title="Document Templates" subtitle="Manage document templates and field mappings" />
        
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
              <p className="text-gray-600">Create and manage fillable document templates for client agreements</p>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create Document Template</DialogTitle>
                  <DialogDescription>
                    Upload a PDF document and map fields to client data for automatic filling.
                  </DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload PDF</TabsTrigger>
                    <TabsTrigger value="mapping" disabled={!uploadedFile}>Field Mapping</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upload" className="space-y-4">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleCreateTemplate(formData);
                    }}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Template Name</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="e.g., Client Agreement"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            placeholder="Brief description of the template"
                            rows={3}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="templateType">Template Type</Label>
                          <Select name="templateType" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select template type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="client_agreement">Client Agreement</SelectItem>
                              <SelectItem value="account_opening">Account Opening</SelectItem>
                              <SelectItem value="advisory_agreement">Advisory Agreement</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="pdfFile">PDF Document</Label>
                          <div className="flex items-center justify-center w-full">
                            <label htmlFor="pdfFile" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileUp className="w-8 h-8 mb-4 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> your PDF document
                                </p>
                                <p className="text-xs text-gray-500">PDF files only (MAX. 10MB)</p>
                              </div>
                              <Input
                                id="pdfFile"
                                name="pdfFile"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileUpload}
                                required
                              />
                            </label>
                          </div>
                          {uploadedFile && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-lg">
                              <FileText className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-700">{uploadedFile.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setUploadedFile(null)}
                                className="ml-auto h-6 w-6 p-0"
                              >
                                ×
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => uploadedFile && extractFieldsFromPDF()}
                          disabled={!uploadedFile || isExtractingFields}
                        >
                          {isExtractingFields ? 'Extracting...' : 'Extract Fields'}
                        </Button>
                        <Button type="submit" disabled={createTemplateMutation.isPending || !uploadedFile}>
                          {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="mapping" className="space-y-4">
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div className="text-sm text-gray-600 mb-4">
                        Map PDF form fields to client data sources. Fields will be automatically filled when generating documents.
                      </div>
                      {extractedFields.length > 0 ? (
                        extractedFields.map((field, index) => (
                          <FieldMappingRow key={index} field={field} index={index} onUpdate={updateFieldMapping} />
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No fields extracted yet. Click "Extract Fields" to analyze the PDF.</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates && (templates as any).length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(templates as any).map((template: DocumentTemplate) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {template.description || 'No description provided'}
                        </CardDescription>
                      </div>
                      <Badge className={getTemplateTypeColor(template.templateType)}>
                        {template.templateType.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {Array.isArray(template.fields) ? template.fields.length : 0} fields
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewTemplateFields(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGenerateDialog(template)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Yet</h3>
                <p className="text-gray-500 text-center mb-4">
                  Create your first document template to start generating fillable documents.
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Template
                </Button>
              </CardContent>
            </Card>
          )}

          {/* View Template Dialog */}
          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{selectedTemplate?.name}</DialogTitle>
                <DialogDescription>
                  Field mappings for this document template
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                {selectedTemplate?.fields && Array.isArray(selectedTemplate.fields) && selectedTemplate.fields.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTemplate.fields.map((field: DocumentField, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{field.name}</h4>
                          <Badge variant="outline">{field.type}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div><strong>Data Source:</strong> {field.dataSource}</div>
                          {field.description && <div><strong>Description:</strong> {field.description}</div>}
                          {field.defaultValue && <div><strong>Default:</strong> {field.defaultValue}</div>}
                          {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No fields configured for this template
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Generate Document Dialog */}
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Generate Document</DialogTitle>
                <DialogDescription>
                  Generate a document using the "{selectedTemplate?.name}" template with client data.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="client-select">Select Client * ({clients?.length || 0} available)</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients && clients.length > 0 ? (
                        clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.firstName} {client.lastName}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-clients" disabled>
                          No clients available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClientId && (
                  <div>
                    <Label htmlFor="account-select">Select Account (Optional)</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No specific account</SelectItem>
                        {accounts && accounts.length > 0 ? (
                          accounts.map((account: any) => (
                            <SelectItem key={account.id} value={account.id.toString()}>
                              {account.accountType} - {account.programType}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-accounts" disabled>
                            No accounts for this client
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsGenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerateDocument}
                  disabled={!selectedClientId || generateDocumentMutation.isPending}
                >
                  {generateDocumentMutation.isPending ? 'Generating...' : 'Generate Document'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}